import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { RootNavigator } from './navigation/RootNavigator';
import SplashScreen from './screens/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import AppBackground from './components/AppBackground';
import './core/i18n';
import { useNotificationStore } from './store/notificationStore';
import { useProfileStore } from './store/profileStore';
import { setupNotificationListeners } from './core/notifications';

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

  // Register push token + request location permission on app start
  useEffect(() => {
    useNotificationStore.getState().registerToken();
    useProfileStore.getState().loadProfile();
    // Запрашиваем разрешение на геолокацию при старте приложения
    Location.requestForegroundPermissionsAsync().catch(() => {});
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
          </NavigationContainer>
        </AppBackground>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
