import { create } from 'zustand';
import httpClient from '../core/httpClient';
import { ApiConstants } from '../core/api';
import { readCache, writeCache, CacheKeys } from '../core/persistentCache';
import { prefetchImages } from '../components/CachedImage';

// Акции меняются чаще меню, но и устаревший баннер лучше пустого места:
// показываем сохранённый максимум 6 часов, дальше ждём сеть.
const PROMO_TTL_MS = 6 * 60 * 60 * 1000;

export const usePromotionStore = create((set, get) => ({
  promotions: [],
  // Стартуем в состоянии загрузки: иначе между чтением кеша и первым сетевым
  // ответом успевает мелькнуть заглушечный баннер.
  loading:    true,
  hydrated:   false,
  error:      null,

  hydrate: async () => {
    if (get().hydrated) return;
    const cached = await readCache(CacheKeys.promotions, PROMO_TTL_MS);
    set((s) => {
      if (s.promotions.length || !cached?.length) return { hydrated: true };
      return { hydrated: true, promotions: cached };
    });
  },

  loadPromotions: async () => {
    const hasContent = get().promotions.length > 0;
    set({ loading: !hasContent, error: null });
    try {
      const res = await httpClient.get(ApiConstants.promotions);
      const promotions = res.data?.data?.promotions || [];
      set({ promotions, loading: false, error: null });
      writeCache(CacheKeys.promotions, promotions);
      // Картинки баннеров кладём в диск-кеш сразу; видео кеширует сам плеер.
      prefetchImages(
        promotions.filter((p) => p.mediaType !== 'video').map((p) => p.imageUrl)
      );
    } catch (e) {
      console.warn('[SushiTime] loadPromotions error:', e.message);
      if (hasContent) {
        set({ loading: false, error: null });
        return;
      }
      // Просроченный снимок лучше пустого места на главной — см. тот же приём
      // в menuStore. Баннер не критичен, поэтому ошибку здесь вообще не
      // показываем: карусель просто останется на запасных слайдах.
      const stale = await readCache(CacheKeys.promotions);
      set({
        loading: false,
        error: null,
        ...(stale?.length ? { promotions: stale } : {}),
      });
    }
  },
}));
