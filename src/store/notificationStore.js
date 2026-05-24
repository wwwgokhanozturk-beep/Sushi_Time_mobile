import { create } from 'zustand';
import { registerForPushNotifications } from '../core/notifications';
import httpClient from '../core/httpClient';

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
      await httpClient.post('/notifications/register-token', { pushToken: token });
      set({ registered: true });
    } catch (err) {
      // Token obtained but backend registration failed — will retry next app launch
      console.warn('[Notifications] Failed to register token with backend:', err.message);
    }

    return token;
  },
}));
