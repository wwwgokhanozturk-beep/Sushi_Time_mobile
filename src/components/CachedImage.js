import React from 'react';
import { Image } from 'expo-image';

// Единая обёртка над expo-image. Все фото в приложении проходят через неё,
// поэтому политика кеширования задаётся в одном месте:
//   memory-disk — картинка остаётся на диске между запусками приложения,
//   поэтому повторный вход в меню/карточку товара уже не грузит сеть.
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
  ...rest
}) {
  return (
    <Image
      source={uri ? { uri } : null}
      style={style}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      priority={priority}
      // Ключ переиспользования ячейки: без него FlatList на секунду показывает
      // фото предыдущего товара в переиспользованной строке.
      recyclingKey={recyclingKey ?? uri}
      {...rest}
    />
  );
}

// Прогревает диск-кеш заранее: вызываем для первых экранов списка,
// чтобы к моменту скролла картинки уже лежали локально.
export function prefetchImages(uris) {
  const list = (Array.isArray(uris) ? uris : [uris]).filter(Boolean);
  if (!list.length) return Promise.resolve(false);
  return Image.prefetch(list, { cachePolicy: 'memory-disk' }).catch(() => false);
}
