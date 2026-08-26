import React, { useEffect, useRef, memo } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Shadows } from '../core/theme';
import CachedImage from './CachedImage';
import { deferSafeScroll } from '../utils/safeScroll';
import { categoryImage, categoryFrameTransform } from '../utils/categories';

// Круглая витрина категорий (как на сайте): фото + подпись капсом,
// активная обведена красным кольцом.
//
// Категории приходят с бэкенда и админ может добавить/удалить любую в любой
// момент, поэтому картинка НЕ зашита в код: берём `imageUrl` категории, если
// бэкенд его прислал, иначе — фото первого товара этой категории. Новая
// категория появляется в рейле сама, без пересборки приложения.

// Размер снят с sushitimetr.com: кружок занимает 118 px при ширине окна 591,
// то есть ровно ~19.7% ширины. Раньше здесь стояло жёсткое 62 dp — на телефоне
// витрина выходила заметно мельче сайта, и человек, пришедший с сайта, видел
// «другое» приложение. Считаем от ширины экрана, поэтому пропорция одинакова
// на любом телефоне и совпадает с web на iOS и на Android.
const { width: SW } = Dimensions.get('window');
const CIRCLE = Math.round(Math.min(84, Math.max(66, SW * 0.197)));

// Шаг между центрами кружков на сайте — 24.9% ширины, то есть кружок + ~5%.
const ITEM_W = CIRCLE + Spacing.md;

export const RAIL_HEIGHT = CIRCLE + 36;

// Строит [{ key, label, image }] из списка категорий и товаров.
// `image` — { imageUrl, scale, offsetX, offsetY } либо null.
export function buildCategoryEntries(cats, items, categoryImages = {}, labelOf = (c) => c) {
  const firstImage = new Map();
  for (const it of items) {
    const key = (it.category || 'other').toLowerCase();
    if (!firstImage.has(key) && it.imageUrl) firstImage.set(key, it.imageUrl);
  }
  return cats.map((cat) => {
    const key = (cat || '').toLowerCase();
    return {
      key: cat,
      label: labelOf(cat),
      image: categoryImage(cat, categoryImages, firstImage.get(key) || null),
    };
  });
}

function RailItem({ entry, active, onPress }) {
  // Кадрирование задаёт админ в панели (масштаб и смещение в % рамки) — тем же
  // способом, что и на сайте, иначе одна и та же обложка вставала в кружок
  // по-разному в приложении и в вебе.
  const frame = categoryFrameTransform(entry.image, CIRCLE);
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.ring, active && styles.ringActive]}>
        {entry.image?.imageUrl ? (
          <CachedImage
            uri={entry.image.imageUrl}
            style={[styles.img, frame ? { transform: frame } : null]}
            contentFit="cover"
            transition={120}
            // Витрина категорий — тоже список: держим bitmap-ы только
            // на диске, чтобы memory-кеш не рос при пролистывании.
            cachePolicy="disk"
          />
        ) : (
          <View style={[styles.img, styles.imgFallback]}>
            <Text style={{ fontSize: 24 }}>🍣</Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.label, active && styles.labelActive]}
        numberOfLines={1}
      >
        {entry.label}
      </Text>
    </TouchableOpacity>
  );
}

const MemoRailItem = memo(RailItem);

function CategoryRail({ entries, activeKey, onSelect }) {
  const listRef = useRef(null);

  // Активная категория всегда остаётся на виду — при скролле списка вниз
  // рейл подкручивается сам.
  //
  // `entries` пересоздаётся при смене языка (подписи переведены заново), и
  // прокрутка в тот же тик приходится на список, который ещё не пересчитал
  // кадры. Поэтому — следующий кадр и подавление отказа: иначе Invariant из
  // эффекта уносит всё приложение (см. utils/safeScroll).
  useEffect(() => {
    const idx = entries.findIndex((e) => e.key === activeKey);
    if (idx < 0) return undefined;
    return deferSafeScroll(() =>
      listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5, animated: true })
    );
  }, [activeKey, entries]);

  if (entries.length < 2) return null;

  return (
    <View style={styles.bar}>
      <FlatList
        ref={listRef}
        horizontal
        data={entries}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(e) => e.key}
        contentContainerStyle={styles.content}
        onScrollToIndexFailed={() => {}}
        // Ширина элемента фиксирована — значит прокрутка к любой категории
        // срабатывает с первого раза, даже если она далеко за экраном.
        getItemLayout={(_, i) => ({
          length: ITEM_W,
          offset: ITEM_W * i,
          index: i,
        })}
        renderItem={({ item }) => (
          <MemoRailItem
            entry={item}
            active={item.key === activeKey}
            onPress={() => onSelect(item.key)}
          />
        )}
      />
    </View>
  );
}

export default memo(CategoryRail);

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    ...Shadows.sm,
  },
  content: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: 6,
  },
  item: {
    width: ITEM_W,
    alignItems: 'center',
  },
  // Кружок на сайте лежит на мягкой тени — она и делает витрину «объёмной».
  // Без неё белое кольцо на белом фоне сливалось, и ряд читался как плоские
  // картинки. Тень задана через Shadows, поэтому на iOS это мягкий blur,
  // а на Android — эквивалентная elevation, а не «ничего».
  ring: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: Radius.full,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
    ...Shadows.md,
  },
  // Активную выделяем не только красным кольцом, но и красным свечением —
  // как на сайте.
  ringActive: {
    borderColor: Colors.primary,
    ...Shadows.glow,
  },
  img: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.shimmerBase,
  },
  imgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    maxWidth: ITEM_W - 2,
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.primary,
  },
});
