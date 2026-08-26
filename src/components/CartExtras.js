import React, { memo, useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, Spacing, Shadows } from '../core/theme';
import CachedImage from './CachedImage';
import { formatPrice } from '../utils/formatPrice';
import { pickLocalized } from '../utils/localized';

// Полка «Добавить соусы и дополнения» в корзине.
//
// Раньше она показывала товары ТОЛЬКО тех категорий, что уже лежат в корзине.
// На практике это означало вот что: положил одно эдамаме — и вся полка
// состояла из этого же эдамаме, потому что других закусок в разделе не было.
// Ни соусов, ни напитков, ни имбиря человек не видел, хотя полка называется
// именно «соусы и дополнения».
//
// Теперь показываем всё меню, но в осмысленном порядке:
//   1) то, что уже в корзине — видно, что именно берёшь, и можно докинуть ещё;
//   2) товары из тех же категорий — ближайшая по смыслу допродажа;
//   3) всё остальное.
// Внутри каждой группы — порядок, заданный админом (sortOrder).
//
// Список горизонтальный и виртуализованный, поэтому длина меню его не тормозит.

const CARD = 108;

function buildExtras(cartItems, menuItems) {
  if (!cartItems.length || !menuItems.length) return [];

  const cats = new Set(cartItems.map((i) => (i.menuItem.category || '').toLowerCase()));
  const qtyById = new Map(cartItems.map((i) => [i.menuItem._id, i.quantity]));

  const rank = (m) => {
    if (qtyById.has(m._id)) return 0;
    return cats.has((m.category || '').toLowerCase()) ? 1 : 2;
  };

  return menuItems
    .filter((m) => m.isAvailable !== false)
    .sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
}

function ExtraCard({ item, name, quantity, onAdd }) {
  return (
    <View style={styles.card}>
      <View style={styles.imgWrap}>
        {item.imageUrl ? (
          <CachedImage uri={item.imageUrl} style={styles.img} contentFit="cover" cachePolicy="disk" />
        ) : (
          <View style={[styles.img, styles.imgFallback]}>
            <Text style={{ fontSize: 30 }}>🍣</Text>
          </View>
        )}
        <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.8} hitSlop={6}>
          <Text style={styles.addBtnText}>{quantity > 0 ? quantity : '+'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <Text style={styles.price}>{formatPrice(item.price)}</Text>
    </View>
  );
}

const MemoExtraCard = memo(ExtraCard);

function CartExtras({ cartItems, menuItems, onAdd }) {
  const { t, i18n } = useTranslation();
  const extras = useMemo(() => buildExtras(cartItems, menuItems), [cartItems, menuItems]);
  const qtyById = useMemo(
    () => new Map(cartItems.map((i) => [i.menuItem._id, i.quantity])),
    [cartItems]
  );

  if (!extras.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('add_extras')}</Text>
      <FlatList
        horizontal
        data={extras}
        keyExtractor={(m) => m._id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        getItemLayout={(_, i) => ({
          length: CARD + Spacing.sm,
          offset: (CARD + Spacing.sm) * i,
          index: i,
        })}
        renderItem={({ item }) => (
          <MemoExtraCard
            item={item}
            name={pickLocalized(item, 'name', i18n.language)}
            quantity={qtyById.get(item._id) || 0}
            onAdd={() => onAdd(item)}
          />
        )}
      />
    </View>
  );
}

export default memo(CartExtras);

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  list: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    width: CARD,
  },
  imgWrap: {
    width: CARD,
    height: CARD,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  img: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.shimmerBase,
  },
  imgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    minWidth: 30,
    height: 30,
    paddingHorizontal: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: Colors.surface,
    ...Shadows.glow,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginTop: -1,
  },
  name: {
    marginTop: Spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  price: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '900',
    color: Colors.primary,
  },
});
