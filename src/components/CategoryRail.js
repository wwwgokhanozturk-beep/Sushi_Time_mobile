import React, { useEffect, useRef, memo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Shadows } from '../core/theme';
import CachedImage from './CachedImage';

// Круглая витрина категорий (как на сайте): фото + подпись капсом,
// активная обведена красным кольцом.
//
// Категории приходят с бэкенда и админ может добавить/удалить любую в любой
// момент, поэтому картинка НЕ зашита в код: берём `imageUrl` категории, если
// бэкенд его прислал, иначе — фото первого товара этой категории. Новая
// категория появляется в рейле сама, без пересборки приложения.

const CIRCLE = 62;
export const RAIL_HEIGHT = CIRCLE + 34;

// Строит [{ key, label, imageUrl }] из списка категорий и товаров.
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
      imageUrl: categoryImages[cat] || categoryImages[key] || firstImage.get(key) || null,
    };
  });
}

function RailItem({ entry, active, onPress }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.ring, active && styles.ringActive]}>
        {entry.imageUrl ? (
          <CachedImage uri={entry.imageUrl} style={styles.img} contentFit="cover" transition={120} />
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
  useEffect(() => {
    const idx = entries.findIndex((e) => e.key === activeKey);
    if (idx >= 0) {
      listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5, animated: true });
    }
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
          length: CIRCLE + Spacing.md,
          offset: (CIRCLE + Spacing.md) * i,
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
    width: CIRCLE + Spacing.md,
    alignItems: 'center',
  },
  ring: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: Radius.full,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
  },
  ringActive: {
    borderColor: Colors.primary,
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
    marginTop: 5,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    maxWidth: CIRCLE + Spacing.md - 2,
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.primary,
  },
});
