import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addToCart: (menuItem) => {
        set((state) => {
          const idx = state.items.findIndex((i) => i.menuItem._id === menuItem._id);
          if (idx >= 0) {
            const updated = [...state.items];
            updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
            return { items: updated };
          }
          return { items: [...state.items, { menuItem, quantity: 1 }] };
        });
      },

      removeFromCart: (itemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.menuItem._id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(itemId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.menuItem._id === itemId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'sushi_time_cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper selectors
export const selectTotalPrice = (state) =>
  state.items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);

export const selectTotalItems = (state) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0);
