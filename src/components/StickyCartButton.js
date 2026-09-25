import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, Spacing, Shadows } from '../core/theme';
import { useCartStore, selectTotalItems } from '../store/cartStore';

// Плавающая кнопка «в корзину» внизу списка. Была скопирована в Home и Menu
// вместе со стилями — правка отступов в одном экране молча расходилась со вторым.
// Ничего не рисует, пока корзина пуста.
function StickyCartButton({ onPress }) {
  const { t } = useTranslation();
  const totalItems = useCartStore(selectTotalItems);

  if (totalItems === 0) return null;

  return (
    <TouchableOpacity style={styles.wrap} onPress={onPress} activeOpacity={0.9}>
      <Text style={styles.label} numberOfLines={1}>
        {t('view_cart', { count: totalItems })}
      </Text>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default memo(StickyCartButton);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.md,
    right: Spacing.md,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  arrow: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
});
