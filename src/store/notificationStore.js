import { create } from 'zustand';
import { registerForPushNotifications } from '../core/notifications';
import httpClient from '../core/httpClient';
import i18n from '../core/i18n';

// Язык приложения уходит на сервер вместе с токеном: по нему рассылка из
// админки выбирает, какой из трёх текстов получит этот телефон.
const PUSH_LANGUAGES = ['tr', 'ru', 'en'];
const appLanguage = () => {
  const code = (i18n.language || '').slice(0, 2);
  return PUSH_LANGUAGES.includes(code) ? code : undefined;
};

const postToken = (pushToken) =>
  httpClient.post('/notifications/register-token', { pushToken, language: appLanguage() });

export const useNotificationStore = create((set, get) => ({
  pushToken: null,
  registered: false,

  /**
   * Request permission, get push token, and send it to the backend.
   */
  registerToken: async () => {
    if (get().registered) return get().pushToken;

    const token = await registerForPushNotifications();
    if (!token) {
      set({ pushToken: null });
      return null;
    }

    set({ pushToken: token });

    try {
      const sentLanguage = appLanguage();
      await postToken(token);
      set({ registered: true });
      // Язык успел загрузиться (или смениться), пока шёл запрос, — досылаем.
      if (appLanguage() !== sentLanguage) postToken(token).catch(() => {});
    } catch (err) {
      // Token obtained but backend registration failed — will retry next app launch
      console.warn('[Notifications] Failed to register token with backend:', err.message);
    }

    return token;
  },
}));

// Сменили язык — сообщаем серверу, иначе следующая рассылка придёт на старом.
// Срабатывает и в конце инициализации i18n, когда язык прочитан из памяти:
// регистрация на старте могла успеть уйти раньше и без языка.
i18n.on('languageChanged', () => {
  const { pushToken, registered } = useNotificationStore.getState();
  if (!pushToken || !registered) return;
  postToken(pushToken).catch((err) => {
    console.warn('[Notifications] Failed to update push language:', err.message);
  });
});
