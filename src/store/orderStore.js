import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import httpClient from '../core/httpClient';
import { ApiConstants } from '../core/api';

const ORDER_IDS_KEY = 'sushi_time_order_ids';

const getSavedOrderIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(ORDER_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveOrderId = async (id) => {
  try {
    const ids = await getSavedOrderIds();
    if (!ids.includes(id)) {
      await AsyncStorage.setItem(ORDER_IDS_KEY, JSON.stringify([id, ...ids]));
    }
  } catch {}
};

export const useOrderStore = create((set) => ({
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
  orderPlaced: null,

  placeOrder: async (payload) => {
    set({ loading: true, error: null, orderPlaced: null });
    try {
      const res = await httpClient.post(ApiConstants.orders, payload);
      const order = res.data?.data?.order;
      set({ loading: false, orderPlaced: order });
      if (order?._id) await saveOrderId(order._id);
      return order;
    } catch (e) {
      set({
        loading: false,
        error: e.response?.data?.message || 'Failed to place order',
      });
      return null;
    }
  },

  loadOrders: async (phone) => {
    set({ loading: true, error: null });
    try {
      const savedIds = await getSavedOrderIds();

      const [byIdResults, byPhoneResults] = await Promise.all([
        // Load by locally saved IDs
        savedIds.length > 0
          ? Promise.all(
              savedIds.map((id) =>
                httpClient.get(ApiConstants.orderById(id)).then((r) => r.data?.data?.order).catch(() => null)
              )
            )
          : Promise.resolve([]),
        // Load by phone number
        phone
          ? httpClient.get(ApiConstants.myOrders, { params: { phone } }).then((r) => r.data?.data?.orders || []).catch(() => [])
          : Promise.resolve([]),
      ]);

      // Merge & deduplicate
      const seen = new Set();
      const merged = [...byIdResults, ...byPhoneResults]
        .filter(Boolean)
        .filter((o) => {
          if (seen.has(o._id)) return false;
          seen.add(o._id);
          return true;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Persist all IDs locally so future loads don't need phone
      for (const o of merged) {
        await saveOrderId(o._id);
      }

      set({ orders: merged, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e.response?.data?.message || 'Failed to load orders',
      });
    }
  },

  loadOrderById: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await httpClient.get(ApiConstants.orderById(id));
      set({ currentOrder: res.data?.data?.order, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e.response?.data?.message || 'Failed to load order',
      });
    }
  },

  clearPlaced: () => set({ orderPlaced: null }),
}));
