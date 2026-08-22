import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './navigation/RootNavigator';
import SplashScreen from './screens/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import AppBackground from './components/AppBackground';
import ClosedNotice from './components/ClosedNotice';
import UpdateNotice from './components/UpdateNotice';
import './core/i18n';
import { useNotificationStore } from './store/notificationStore';
import { useProfileStore } from './store/profileStore';
import { useSettingsStore } from './store/settingsStore';
import { setupNotificationListeners } from './core/notifications';
import { useAutoApplyUpdates } from './core/otaUpdates';
import { setVideoCacheSizeAsync } from 'expo-video';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
    card: 'transparent',
    border: 'transparent',
  },
};

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const navigationRef = useRef(null);

  // Готовое JS-обновление применяется при возврате из фона, а не через запуск.
  useAutoApplyUpdates();

  // Register push token + request location permission on app start
  useEffect(() => {
    // Баннеры кешируют видео на диск. По умолчанию expo-video готов занять 1 ГБ —
    // для пары промо-роликов это перебор. Вызов обязан пройти до создания первого
    // плеера, поэтому он здесь, пока на экране ещё сплеш.
    setVideoCacheSizeAsync(200 * 1024 * 1024).catch(() => {});

    useNotificationStore.getState().registerToken();
    useProfileStore.getState().loadProfile();
    useSettingsStore.getState().loadBusinessHours();
    // Актуальная версия сборки: по ней UpdateNotice решает, предложить
    // обновление или потребовать его.
    useSettingsStore.getState().loadAppVersion();
    // Запрашиваем геолокацию при старте: по ней определяем район и показываем
    // минимум ещё до корзины. Отказ — не проблема.
    useSettingsStore.getState().detectLocation();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    const cleanup = setupNotificationListeners({
      onReceived: (notification) => {
        console.log('[App] Notification received:', notification.request.content.title);
      },
      onResponse: (response) => {
        const data = response.notification.request.content.data;
        // Navigate to order tracking when tapping an order notification
        if (data?.type === 'order_update' && data?.orderId && navigationRef.current) {
          navigationRef.current.navigate('OrderTracking', { orderId: data.orderId });
        }
      },
    });
    return cleanup;
  }, []);

  // Show splash until the animation sequence completes
  if (!splashDone) {
    return (
      <SafeAreaProvider>
        <SplashScreen onFinish={() => setSplashDone(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppBackground>
          <NavigationContainer ref={navigationRef} theme={navTheme}>
            <StatusBar style="light" />
            <RootNavigator />
            <ClosedNotice navigationRef={navigationRef} />
            <UpdateNotice />
          </NavigationContainer>
        </AppBackground>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
