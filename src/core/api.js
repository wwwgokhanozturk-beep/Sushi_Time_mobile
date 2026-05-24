import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION URL: замените на реальный адрес вашего сервера перед сборкой!
// Пример: 'https://api.sushitime.com/api'
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTION_API_URL = 'https://YOUR_SERVER_DOMAIN/api';

const getHostIp = () => {
  const hostUri =
    Constants.expoGoConfig?.debuggerHost ||
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost ||
    null;

  if (hostUri) return hostUri.split(':')[0];
  return null;
};

const getBaseUrl = () => {
  // В продакшн-сборке (__DEV__ = false) всегда используем PRODUCTION_API_URL
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  // Разработка: определяем URL по окружению
  const ip = getHostIp();

  // Физическое устройство через Expo Go — IP девсервера
  if (ip) return `http://${ip}:5000/api`;

  // Android Emulator
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000/api';

  // iOS Simulator
  return 'http://localhost:5000/api';
};

const BASE_URL = getBaseUrl();

if (__DEV__) {
  console.log('[SushiTime] API base URL (DEV):', BASE_URL);
} else {
  console.log('[SushiTime] API base URL (PROD):', BASE_URL);
}

export const ApiConstants = {
  baseUrl: BASE_URL,
  socketUrl: BASE_URL.replace(/\/api\/?$/, ''),
  menu: '/menu',
  menuCategories: '/menu/categories',
  menuItem: (id) => `/menu/${id}`,
  orders: '/orders',
  myOrders: '/orders/my',
  orderById: (id) => `/orders/${id}`,
  orderStatus: (id) => `/orders/${id}/status`,
  promotions: '/promotions',
  notificationsRegisterToken: '/notifications/register-token',
  chatMy: '/chat/my',
  chatMyMessages: '/chat/my/messages',
  connectTimeout: 15000,
  receiveTimeout: 30000,
};
