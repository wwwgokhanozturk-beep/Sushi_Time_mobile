import AsyncStorage from '@react-native-async-storage/async-storage';

// Stale-while-revalidate хранилище для данных, которые нужно показать мгновенно
// при старте приложения (меню, акции). Сохранённый снимок отдаётся сразу,
// сеть подтягивается фоном и молча обновляет экран.

const PREFIX = 'sushi_time_cache:';

export async function readCache(key, maxAgeMs = Infinity) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > maxAgeMs) return null;
    return parsed.data;
  } catch (_) {
    return null; // повреждённый JSON — просто грузим из сети
  }
}

export async function writeCache(key, data) {
  try {
    await AsyncStorage.setItem(
      PREFIX + key,
      JSON.stringify({ savedAt: Date.now(), data })
    );
  } catch (_) { /* нет места на диске — не критично */ }
}

export async function clearCache(key) {
  try { await AsyncStorage.removeItem(PREFIX + key); } catch (_) {}
}

export const CacheKeys = {
  menu: 'menu_v1',
  promotions: 'promotions_v1',
};
