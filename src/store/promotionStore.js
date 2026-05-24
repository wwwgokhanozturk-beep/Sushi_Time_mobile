import { create } from 'zustand';
import httpClient from '../core/httpClient';
import { ApiConstants } from '../core/api';

export const usePromotionStore = create((set) => ({
  promotions: [],
  loading:    false,
  error:      null,

  loadPromotions: async () => {
    set({ loading: true, error: null });
    try {
      const res = await httpClient.get(ApiConstants.promotions);
      set({ promotions: res.data?.data?.promotions || [], loading: false });
    } catch (e) {
      console.warn('[SushiTime] loadPromotions error:', e.message);
      set({ loading: false, error: e.response?.data?.message || 'Failed to load promotions' });
    }
  },
}));
