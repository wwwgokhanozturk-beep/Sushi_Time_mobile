import React from 'react';
import { Image } from 'expo-image';

// Единая обёртка над expo-image. Политика кеширования задаётся здесь:
//
//   'memory-disk' (по умолчанию) — картинка остаётся и на диске (между
//   запусками), и в памяти (LRU-кеш expo-image). Годится для одиночных
//   больших фото: карточка товара, детальный экран, шапка.
//
//   'disk' — только на диске. Декодированный bitmap живёт лишь пока вьюха
//   на экране, дальше освобождается. Обязательно для длинных списков:
//   без этого 50 карточек меню × ~5 МБ каждый bitmap = 250 МБ в памяти
//   при лимите кучи Android 256 МБ → OOM на телефонах с 3–4 ГБ RAM.
//
// Пока фото не загрузилось, видно фон самого View (у карточек это серый
// плейсхолдер), а затем картинка проявляется за `transition` мс — без резкого
// «щелчка» при быстром скролле.

export default function CachedImage({
  uri,
  style,
  contentFit = 'cover',
  transition = 160,
  priority = 'normal',
  recyclingKey,
  cachePolicy = 'memory-disk',
  ...rest
}) {
  return (
    <Image
      source={uri ? { uri } : null}
      style={style}
      contentFit={contentFit}
      transition={transition}
      cachePolicy={cachePolicy}
      priority={priority}
      // Ключ переиспользования ячейки: без него FlatList на секунду показывает
      // фото предыдущего товара в переиспользованной строке.
      recyclingKey={recyclingKey ?? uri}
      {...rest}
    />
  );
}

// Очистить memory-кеш expo-image. Диск не трогаем — то, что уже скачано,
// пусть остаётся. Вызываем при уходе приложения в фон и при загрузке нового
// меню: LRU-кеш успевает накопить лишнее за долгую сессию.
export function clearImageMemoryCache() {
  return Image.clearMemoryCache().catch(() => false);
}

// Прогревает ТОЛЬКО диск-кеш: вызываем для первых экранов списка, чтобы к
// моменту скролла файлы уже лежали локально.
//
// Политика здесь намеренно 'disk', а не 'memory-disk'. Разница критическая:
// когда картинка рисуется в <Image>, Glide знает размер вьюхи (у карточки это
// 116x116) и декодирует уменьшённый bitmap. У `prefetch` вьюхи нет — с
// 'memory-disk' он декодирует и держит в памяти ОРИГИНАЛ. В меню лежат фото
// 1080x1350 (~5 МБ каждое) и одно 6720x4480 — это 114 МБ одним объектом при
// лимите кучи 256 МБ. Двенадцать таких прогревов + баннеры переполняли heap, и
// Android убивал процесс: OutOfMemoryError прилетал случайному потоку (обычно
// ExoPlayer), поэтому со стороны это выглядело как «приложение само
// закрывается при скролле меню».
//
// С 'disk' файл скачивается и кладётся на диск, но не декодируется. Память
// тратится только на то, что реально видно на экране.
export function prefetchImages(uris) {
  const list = (Array.isArray(uris) ? uris : [uris]).filter(Boolean);
  if (!list.length) return Promise.resolve(false);
  return Image.prefetch(list, { cachePolicy: 'disk' }).catch(() => false);
}
