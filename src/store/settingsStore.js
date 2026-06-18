import { create } from 'zustand';
import httpClient from '../core/httpClient';
import { ApiConstants } from '../core/api';

// Глобальные настройки (контактный номер и т.п.)
export const useSettingsStore = create((set, get) => ({
  contactType: null,   // 'whatsapp' | 'phone'
  contactNumber: '',
  loaded: false,

  loadSettings: async () => {
    if (get().loaded) return;
    try {
      const res = await httpClient.get(ApiConstants.settings);
      const s = res.data?.data?.settings || {};
      set({ contactType: s.contactType || null, contactNumber: s.contactNumber || '', loaded: true });
    } catch (e) {
      console.warn('[SushiTime] loadSettings error:', e.message);
      set({ loaded: true });
    }
  },
}));

// Ссылка для контакта: WhatsApp -> wa.me, телефон -> tel:
export function contactUrl(type, number) {
  const digits = (number || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  return type === 'whatsapp' ? `https://wa.me/${digits}` : `tel:${(number || '').replace(/\s+/g, '')}`;
}
