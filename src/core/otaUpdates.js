import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { useCartStore } from '../store/cartStore';

// expo-updates сам скачивает новую JS-сборку в фоне, но применяет её только
// при следующем холодном старте. Для доставки еды это слишком поздно:
// приложение открывают раз в несколько дней и обычно не закрывают, а сворачивают.
//
// Поэтому проверяем и применяем обновление при возврате из фона — момент, когда
// пользователь и так видит перерисовку экрана.
//
// Оговорка: перезапуск стирает наполовину заполненный чекаут (корзину зустанд
// держит в AsyncStorage, она переживёт). Незаконченный заказ дороже скорости
// доставки фикса, поэтому при непустой корзине ждём естественного запуска.

// Проверять на каждое переключение вкладок незачем — раз в 10 минут достаточно.
const CHECK_COOLDOWN_MS = 10 * 60 * 1000;

export function useAutoApplyUpdates() {
  const busyRef = useRef(false);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    // В Expo Go и dev-сборке модуль выключен — там обновления не при чём.
    if (__DEV__ || !Updates.isEnabled) return undefined;

    const apply = async () => {
      if (busyRef.current) return;
      if (Date.now() - lastCheckRef.current < CHECK_COOLDOWN_MS) return;
      if (useCartStore.getState().items.length > 0) return;

      busyRef.current = true;
      lastCheckRef.current = Date.now();
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch (e) {
        // Нет сети или сборка не подходит по runtimeVersion — не наша забота:
        // встроенный механизм применит обновление при следующем запуске.
        console.warn('[SushiTime] OTA update error:', e.message);
      } finally {
        busyRef.current = false;
      }
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') apply();
    });
    return () => sub.remove();
  }, []);
}
