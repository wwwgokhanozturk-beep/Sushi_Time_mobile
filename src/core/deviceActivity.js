import { Platform } from 'react-native';
import Constants from 'expo-constants';
import httpClient from './httpClient';
import i18n from './i18n';
import { getDeviceId } from '../utils/tracking';
import { useProfileStore } from '../store/profileStore';

// «Приложением пользуются» — анонимная отметка для статистики в админке:
// сколько телефонов открывали приложение за 30 дней, iPhone или Android, с
// аккаунтом или без (POST /devices/ping). Номер устройства — тот же случайный
// номер, которым гость следит за своим заказом (utils/tracking); ни имени, ни
// телефона в отметке нет, аккаунт сервер узнаёт по обычному токену запроса.
// Шлётся при запуске и при возврате в приложение, но не чаще раза в шесть
// часов, — и сразу, если человек вошёл в аккаунт или вышел.
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;

let lastSent = { at: 0, signedIn: null };
let sending = false;

export async function pingDeviceActivity() {
  const { loaded, token } = useProfileStore.getState();
  // Профиль ещё не прочитан из памяти — App.js позовёт снова, когда прочтёт.
  if (!loaded || sending) return;
  const signedIn = !!token;
  if (Date.now() - lastSent.at < MIN_INTERVAL_MS && lastSent.signedIn === signedIn) return;

  sending = true;
  let ok = false;
  try {
    await httpClient.post('/devices/ping', {
      deviceId: await getDeviceId(),
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version,
      language: i18n.language,
    });
    lastSent = { at: Date.now(), signedIn };
    ok = true;
  } catch {
    // Нет сети или сервер занят — посчитаемся в следующий раз.
  } finally {
    sending = false;
  }
  // Вошли или вышли, пока отметка была в пути, — сообщаем ещё раз.
  if (ok && !!useProfileStore.getState().token !== signedIn) pingDeviceActivity();
}
