import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKENS_KEY = 'sushi_time_tracking_tokens';
const DEVICE_ID_KEY = 'sushi_time_device_id';

/**
 * Токены отслеживания заказов { [orderId]: trackingToken }.
 *
 * Заказ, оформленный без аккаунта, принадлежит устройству — токен из ответа на
 * оформление это единственное доказательство, что заказ наш. Без него сервер
 * не отдаст позицию курьера.
 */
const readAll = async () => {
  try {
    const raw = await AsyncStorage.getItem(TOKENS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export async function getTrackingToken(orderId) {
  if (!orderId) return null;
  const all = await readAll();
  return all[String(orderId)] || null;
}

export async function saveTrackingToken(orderId, token) {
  if (!orderId || !token) return;
  try {
    const all = await readAll();
    all[String(orderId)] = token;
    await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(all));
  } catch {}
}

/**
 * Стабильный идентификатор устройства — им гостевой сокет представляется
 * серверу (тот принимает либо JWT, либо guestId).
 */
export async function getDeviceId() {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const generated = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return `dev-${Math.random().toString(36).slice(2, 10)}`;
  }
}
