import { create } from 'zustand';
import httpClient from '../core/httpClient';
import { ApiConstants } from '../core/api';

export const useMenuStore = create((set, get) => ({
  items: [],
  categories: ['All'],
  categoryOrder: [],
  selectedCategory: null,
  loading: false,
  error: null,

  loadMenu: async (category) => {
    set({ loading: true, error: null });
    try {
      const params = { limit: 1000, ...(category ? { category } : {}) };
      const needsMeta = get().categories.length <= 1;
      const [itemsRes, catsRes, orderRes] = await Promise.all([
        httpClient.get(ApiConstants.menu, { params }),
        needsMeta ? httpClient.get(ApiConstants.menuCategories) : Promise.resolve(null),
        needsMeta ? httpClient.get('/settings/category-order') : Promise.resolve(null),
      ]);
      const items = itemsRes.data?.data?.items || [];
      const cats = catsRes?.data?.data?.categories;
      const order = orderRes?.data?.data?.categoryOrder;
      set({
        items,
        loading: false,
        selectedCategory: category || null,
        ...(cats ? { categories: ['All', ...cats] } : {}),
        ...(order ? { categoryOrder: order } : {}),
      });
    } catch (e) {
      console.warn('[SushiTime] loadMenu error:', e.message, e.response?.status);
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
