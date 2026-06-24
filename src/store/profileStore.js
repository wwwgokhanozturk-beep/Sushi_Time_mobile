import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sushi_time_profile';

const defaultProfile = {
  name: '',
  phone: '',
  address: '',
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
