import { create } from 'zustand';
import httpClient from '../core/httpClient';
import { ApiConstants } from '../core/api';
import { readCache, writeCache, CacheKeys } from '../core/persistentCache';
import { prefetchImages } from '../components/CachedImage';

// Снимок меню живёт сутки: если сеть недоступна, лучше показать вчерашнее меню,
// чем пустой экран. Свежесть всё равно обеспечивает фоновый запрос при каждом старте.
const MENU_TTL_MS = 24 * 60 * 60 * 1000;

// Сколько первых фото прогреть в диск-кеш сразу после загрузки меню — примерно
// два экрана списка. Остальные подтянутся по мере скролла.
const PREFETCH_COUNT = 12;

// Категории с бэкенда приходят строками, но могут прийти и объектами
// ({ name, imageUrl }) — админка вправе добавить картинку категории позже.
const normalizeCategories = (raw) =>
  (raw || [])
    .map((c) => (typeof c === 'string' ? { name: c } : c))
    .filter((c) => c && c.name);

export const useMenuStore = create((set, get) => ({
  items: [],
  categories: ['All'],
  categoryImages: {},   // { [category]: imageUrl } — приходит с бэкенда, если есть
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
      const needsMeta = get().categories.length <= 1;
      const [itemsRes, catsRes, orderRes] = await Promise.all([
        httpClient.get(ApiConstants.menu, { params }),
        needsMeta ? httpClient.get(ApiConstants.menuCategories) : Promise.resolve(null),
        needsMeta ? httpClient.get('/settings/category-order') : Promise.resolve(null),
      ]);
      const items = itemsRes.data?.data?.items || [];
      const cats = normalizeCategories(catsRes?.data?.data?.categories);
      const order = orderRes?.data?.data?.categoryOrder;

      const catImages = cats.length
        ? Object.fromEntries(cats.filter((c) => c.imageUrl).map((c) => [c.name, c.imageUrl]))
        : null;

      set((s) => ({
        items,
        loading: false,
        error: null,
        selectedCategory: category || null,
        ...(cats.length ? { categories: ['All', ...cats.map((c) => c.name)] } : {}),
        ...(catImages ? { categoryImages: catImages } : {}),
        ...(order ? { categoryOrder: order } : {}),
      }));

      const next = get();
      writeCache(CacheKeys.menu, {
        items: next.items,
        categories: next.categories,
        categoryImages: next.categoryImages,
        categoryOrder: next.categoryOrder,
      });
      prefetchImages(items.slice(0, PREFETCH_COUNT).map((i) => i.imageUrl));
    } catch (e) {
      console.warn('[SushiTime] loadMenu error:', e.message, e.response?.status);
      // Ошибку показываем только если показать нечего: при живом кеше
      // пользователь не должен видеть красный экран из-за пропавшей сети.
      set({
        loading: false,
        error: hasContent ? null : (e.response?.data?.message || 'Failed to load menu'),
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
