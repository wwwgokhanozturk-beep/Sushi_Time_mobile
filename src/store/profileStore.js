import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import httpClient from '../core/httpClient';
import { ApiConstants } from '../core/api';

const STORAGE_KEY = 'sushi_time_profile';

const defaultProfile = {
  name: '',
  phone: '',
  address: '',
  district: '',
  buildingName: '',
  floor: '',
  apartment: '',
  doorCode: '',
  notes: '',
  latitude: null,
  longitude: null,
};

const defaultAuth = {
  token: null,
  refreshToken: null,
  userId: null,
  email: '',
  isLoggedIn: false,
};

export const useProfileStore = create((set, get) => ({
  ...defaultProfile,
  ...defaultAuth,
  loaded: false,

  loadProfile: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        set({ ...JSON.parse(raw), loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  updateProfile: async (fields) => {
    const current = get();
    const patch = {
      name: fields.name ?? current.name,
      phone: fields.phone ?? current.phone,
      address: fields.address ?? current.address,
      district: fields.district ?? current.district,
      buildingName: fields.buildingName ?? current.buildingName,
      floor: fields.floor ?? current.floor,
      apartment: fields.apartment ?? current.apartment,
      doorCode: fields.doorCode ?? current.doorCode,
      notes: fields.notes ?? current.notes,
      latitude: fields.latitude ?? current.latitude,
      longitude: fields.longitude ?? current.longitude,
    };
    set(patch);
    await _persist(get);
  },

  setAuth: async (user, token, refreshToken) => {
    const patch = {
      name: user.name || get().name,
      phone: user.phone || get().phone,
      email: user.email || '',
      token,
      refreshToken,
      userId: user._id,
      isLoggedIn: true,
    };
    set(patch);
    await _persist(get);
  },

  setTokens: async (token, refreshToken) => {
    set({ token, refreshToken });
    await _persist(get);
  },

  logout: async () => {
    set({ ...defaultProfile, ...defaultAuth, loaded: true });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  // Полное удаление профиля. Сначала просим сервер удалить аккаунт, затем в
  // любом случае стираем всё, что хранится на устройстве, — пользователь,
  // нажавший «удалить», не должен остаться с заполненным адресом и корзиной.
  //
  // Возвращает { server: 'deleted' | 'unsupported' | 'failed' | 'skipped' },
  // чтобы экран мог честно сказать, что произошло: если бэкенд ещё не умеет
  // удалять аккаунт, обещать пользователю обратное нельзя.
  deleteAccount: async () => {
    const wasLoggedIn = get().isLoggedIn;
    let server = wasLoggedIn ? 'failed' : 'skipped';

    if (wasLoggedIn) {
      try {
        await httpClient.delete(ApiConstants.deleteAccount);
        server = 'deleted';
      } catch (e) {
        const status = e.response?.status;
        // Маршрута ещё нет на сервере — это не ошибка клиента.
        server = status === 404 || status === 405 || status === 501
          ? 'unsupported'
          : 'failed';
        console.warn('[SushiTime] deleteAccount error:', e.message, status);
      }
    }

    set({ ...defaultProfile, ...defaultAuth, loaded: true });
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    // Через стор, а не удалением ключа напрямую: иначе корзина исчезнет
    // с диска, но останется в памяти до перезапуска приложения.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./cartStore').useCartStore.getState().clearCart();
    return { server };
  },

  clearProfile: async () => {
    set({ ...defaultProfile });
    await _persist(get);
  },
}));

async function _persist(get) {
  const s = get();
  const data = {
    name: s.name,
    phone: s.phone,
    address: s.address,
    district: s.district,
    buildingName: s.buildingName,
    floor: s.floor,
    apartment: s.apartment,
    doorCode: s.doorCode,
    notes: s.notes,
    latitude: s.latitude,
    longitude: s.longitude,
    token: s.token,
    refreshToken: s.refreshToken,
    userId: s.userId,
    email: s.email,
    isLoggedIn: s.isLoggedIn,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
