import { create } from 'zustand';
import httpClient from '../core/httpClient';
import { ApiConstants } from '../core/api';
import { readCache, writeCache, CacheKeys } from '../core/persistentCache';
import { prefetchImages } from '../components/CachedImage';

// Снимок меню живёт сутки: если сеть недоступна, лучше показать вчерашнее меню,
// чем пустой экран. Свежесть всё равно обеспечивает фоновый запрос при каждом старте.
const MENU_TTL_MS = 24 * 60 * 60 * 1000;

// Сколько первых фото прогреть в диск-кеш сразу после загрузки меню.
//
// Было 12 — «примерно два экрана». Но фото в меню лежат оригиналами по
// 1–2 МБ каждое, и прогрев занимал ~20 МБ канала ровно в тот момент, когда
// сеть нужна четырём видимым карточкам: первый экран из-за этого проявлялся
// заметно позже. Греем один экран — остальное подтянется по мере скролла,
// когда канал уже свободен.
const PREFETCH_COUNT = 6;

// Категории с бэкенда приходят строками, но могут прийти и объектами
// ({ name, imageUrl }) — админка вправе добавить картинку категории позже.
const normalizeCategories = (raw) =>
  (raw || [])
    .map((c) => (typeof c === 'string' ? { name: c } : c))
    .filter((c) => c && c.name);

export const useMenuStore = create((set, get) => ({
  items: [],
  categories: ['All'],
  // { [category]: { imageUrl, scale, offsetX, offsetY } } — обложка, выбранная
  // админом, вместе с кадрированием. Тот же формат читает сайт.
  categoryImages: {},
  // { [category]: { en, ru, tr } } — подпись категории, заданная админом.
  // Пусто — берём зашитый перевод cat_<slug>.
  categoryNames: {},
  categoryOrder: [],
  selectedCategory: null,
  // Стартуем в состоянии загрузки: между чтением кеша и первым ответом сети
  // экран не должен успеть мигнуть пустым списком.
  loading: true,
  hydrated: false,      // снимок из AsyncStorage уже применён
  error: null,

  // Мгновенно поднимает последнее сохранённое меню, чтобы Home не начинался
  // со спиннера. Вызывается один раз при старте приложения.
  hydrate: async () => {
    if (get().hydrated) return;
    const cached = await readCache(CacheKeys.menu, MENU_TTL_MS);
    set((s) => {
      if (s.items.length) return { hydrated: true }; // сеть успела раньше кеша
      if (!cached?.items?.length) return { hydrated: true };
      return {
        hydrated: true,
        items: cached.items,
        categories: cached.categories || s.categories,
        categoryImages: cached.categoryImages || {},
        categoryNames: cached.categoryNames || {},
        categoryOrder: cached.categoryOrder || [],
      };
    });
  },

  loadMenu: async (category) => {
    // Если что-то уже показано (кеш или прошлая загрузка) — обновляем молча,
    // без спиннера поверх готового списка.
    const hasContent = get().items.length > 0;
    set({ loading: !hasContent, error: null });
    try {
      const params = { limit: 1000, ...(category ? { category } : {}) };

      // Справочники тянем на каждой загрузке, а не только на первой. Раньше
      // условие «categories ещё пустые» означало, что после первого запуска
      // они брались из кеша и больше не обновлялись: админ менял порядок или
      // обложку категории, а приложение показывало вчерашнее, пока пользователь
      // не переустановит его.
      //
      // Каждый справочник глушит свою ошибку сам: пропавшая обложка категории
      // не должна ронять ЗАГРУЗКУ МЕНЮ через общий Promise.all.
      const quiet = (p) => p.catch(() => null);
      const [itemsRes, catsRes, orderRes, imagesRes, namesRes] = await Promise.all([
        httpClient.get(ApiConstants.menu, { params }),
        quiet(httpClient.get(ApiConstants.menuCategories)),
        quiet(httpClient.get(ApiConstants.categoryOrder)),
        quiet(httpClient.get(ApiConstants.categoryImages)),
        quiet(httpClient.get(ApiConstants.categoryNames)),
      ]);
      const items = itemsRes.data?.data?.items || [];
      const cats = normalizeCategories(catsRes?.data?.data?.categories);
      const order = orderRes?.data?.data?.categoryOrder;

      // Обложки и подписи категорий задаёт админ — те же самые справочники
      // читает сайт. Приложение их раньше не запрашивало вовсе: подпись бралась
      // из зашитого перевода (поэтому «HOSOMAKI» вместо «HOSO ROLL»), а картинку
      // витрина брала у первого товара категории. Из-за этого один и тот же
      // раздел назывался и выглядел на сайте и в приложении по-разному.
      const catImages = imagesRes?.data?.data?.categoryImages || null;
      const catNames = namesRes?.data?.data?.categoryNames || null;

      set((s) => ({
        items,
        loading: false,
        error: null,
        selectedCategory: category || null,
        ...(cats.length ? { categories: ['All', ...cats.map((c) => c.name)] } : {}),
        ...(catImages ? { categoryImages: catImages } : {}),
        ...(catNames ? { categoryNames: catNames } : {}),
        ...(order ? { categoryOrder: order } : {}),
      }));

      const next = get();
      writeCache(CacheKeys.menu, {
        items: next.items,
        categories: next.categories,
        categoryImages: next.categoryImages,
        categoryNames: next.categoryNames,
        categoryOrder: next.categoryOrder,
      });
      prefetchImages(items.slice(0, PREFETCH_COUNT).map((i) => i.imageUrl));
    } catch (e) {
      console.warn('[SushiTime] loadMenu error:', e.message, e.response?.status);

      // Ошибку показываем только если показать нечего: при живом кеше
      // пользователь не должен видеть красный экран из-за пропавшей сети.
      if (hasContent) {
        set({ loading: false, error: null });
        return;
      }

      // Последний рубеж — просроченный снимок. `hydrate` берёт кеш не старше
      // суток, и раньше на этом всё заканчивалось: пропала сеть, снимку
      // 25 часов — человек получал пустой экран с ошибкой вместо вчерашнего
      // меню, которое лежит на диске и почти наверняка всё ещё верное.
      // Возраст здесь не проверяем сознательно: показать вчерашнее меню
      // офлайн лучше, чем не показать ничего.
      const stale = await readCache(CacheKeys.menu);
      if (stale?.items?.length) {
        set({
          loading: false,
          error: null,
          items: stale.items,
          categories: stale.categories || ['All'],
          categoryImages: stale.categoryImages || {},
          categoryNames: stale.categoryNames || {},
          categoryOrder: stale.categoryOrder || [],
        });
        return;
      }

      set({
        loading: false,
        error: e.response?.data?.message || 'Failed to load menu',
      });
    }
  },

  filterByCategory: async (category) => {
    const cat = category === 'All' ? null : category;
    set({ loading: true, error: null });
    try {
      const params = { limit: 1000, ...(cat ? { category: cat } : {}) };
      const res = await httpClient.get(ApiConstants.menu, { params });
      set({
        items: res.data?.data?.items || [],
        selectedCategory: cat,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e.response?.data?.message || 'Failed to filter menu',
      });
    }
  },
}));
