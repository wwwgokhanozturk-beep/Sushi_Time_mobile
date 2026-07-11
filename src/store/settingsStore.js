import { create } from 'zustand';
import httpClient from '../core/httpClient';
import { ApiConstants } from '../core/api';
import { computeOpenState } from '../core/businessHours';

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

  // Режим работы ресторана (часы/выходные)
  businessHours: null,
  businessHoursLoaded: false,

  loadBusinessHours: async () => {
    if (get().businessHoursLoaded) return;
    try {
      const res = await httpClient.get(ApiConstants.businessHours);
      set({ businessHours: res.data?.data?.businessHours || null, businessHoursLoaded: true });
    } catch (e) {
      console.warn('[SushiTime] loadBusinessHours error:', e.message);
      set({ businessHoursLoaded: true });
    }
  },

  // Минимальная сумма заказа по районам Алании (задаётся в админке)
  districts: [],           // [{ name, minOrder }]
  districtsLoaded: false,

  loadDistrictMinimums: async () => {
    if (get().districtsLoaded) return;
    try {
      const res = await httpClient.get(ApiConstants.districtMinimums);
      set({ districts: res.data?.data?.districts || [], districtsLoaded: true });
    } catch (e) {
      console.warn('[SushiTime] loadDistrictMinimums error:', e.message);
      set({ districtsLoaded: true });
    }
  },

  // Минимум для района (0 = без минимума)
  districtMinFor: (name) => {
    if (!name) return 0;
    const d = get().districts.find((x) => x.name === name);
    return d ? Number(d.minOrder) || 0 : 0;
  },

  // Открыт ли ресторан сейчас (по часовому поясу заведения). До загрузки — открыт.
  isOpenNow: () => {
    const bh = get().businessHours;
    if (!bh) return true;
    return computeOpenState(bh).open;
  },

  // Полное состояние для UI (часы сегодня, причина закрытия).
  openState: () => computeOpenState(get().businessHours || { enabled: false }),
}));

// Ссылка для контакта: WhatsApp -> wa.me, телефон -> tel:
export function contactUrl(type, number) {
  const digits = (number || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  return type === 'whatsapp' ? `https://wa.me/${digits}` : `tel:${(number || '').replace(/\s+/g, '')}`;
}
