import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';
import { useCartStore, selectTotalPrice, selectTotalItems } from '../store/cartStore';
import { useMenuStore } from '../store/menuStore';
import { PrimaryButton, EmptyState } from '../components/SharedWidgets';
import DeliveryMinBanner from '../components/DeliveryMinBanner';
import CartExtras from '../components/CartExtras';
import CachedImage from '../components/CachedImage';
import { formatPrice } from '../utils/formatPrice';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, SERVICE_FEE } from '../core/constants';

export default function CartScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const addToCart = useCartStore((s) => s.addToCart);
  const totalPrice = useCartStore(selectTotalPrice);
  const totalItems = useCartStore(selectTotalItems);

  // Блок допродажи берёт товары из меню. Обычно оно уже загружено с Home,
  // но в корзину можно попасть и первым экраном — тогда поднимаем сами.
  const menuItems = useMenuStore((s) => s.items);
  const hydrateMenu = useMenuStore((s) => s.hydrate);
  const loadMenu = useMenuStore((s) => s.loadMenu);

  useEffect(() => {
    if (!menuItems.length) hydrateMenu().finally(() => loadMenu());
  }, []);

  const deliveryFee = totalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const grandTotal = totalPrice + deliveryFee + SERVICE_FEE;

  const renderItem = useCallback(
    ({ item }) => {
      const lineTotal = formatPrice(item.menuItem.price * item.quantity);
      return (
        <View style={styles.tile}>
          <View style={styles.tileImage}>
            {item.menuItem.imageUrl ? (
              <CachedImage uri={item.menuItem.imageUrl} style={styles.img} contentFit="cover" />
            ) : (
              <Text style={{ fontSize: 32 }}>🍣</Text>
            )}
          </View>

          <View style={styles.tileInfo}>
            <Text style={styles.tileName} numberOfLines={2}>{item.menuItem.name}</Text>
            <Text style={styles.unitPrice}>{formatPrice(item.menuItem.price)}</Text>
          </View>

          <View style={styles.tileRight}>
            <Text style={styles.lineTotal}>{lineTotal}</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => updateQuantity(item.menuItem._id, item.quantity - 1)}
                hitSlop={4}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => updateQuantity(item.menuItem._id, item.quantity + 1)}
                hitSlop={4}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    },
    [updateQuantity]
  );

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Text style={Typography.heading2}>{t('my_cart')}</Text>
        </View>
        <EmptyState
          title={t('cart_empty')}
          subtitle={t('cart_empty_subtitle')}
          emoji="🛒"
          action={
            <PrimaryButton label={t('browse_menu')} onPress={() => navigation.navigate('Menu')} />
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={Typography.heading2} numberOfLines={1}>{t('my_cart')}</Text>
        <TouchableOpacity onPress={clearCart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.clearBtn}>{t('clear')}</Text>
        </TouchableOpacity>
      </View>

      {/* Items + допродажа под ними */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.menuItem._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={SEPARATOR}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <CartExtras cartItems={items} menuItems={menuItems} onAdd={addToCart} />
        }
      />

      <DeliveryMinBanner />

      {/* Summary */}
      <View style={[styles.summary, { paddingBottom: Spacing.lg }]}>
        <View style={styles.etaRow}>
          <Text style={{ fontSize: 16 }}>🚴</Text>
          <Text style={styles.etaText} numberOfLines={1}>
            {t('estimated_delivery')}: 25-35 {t('min_label')}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={[Typography.body, { flexShrink: 1 }]} numberOfLines={1}>
            {t('subtotal')} ({totalItems} {t('items')})
          </Text>
          <Text style={Typography.body}>{formatPrice(totalPrice)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[Typography.bodySmall, { flexShrink: 1 }]} numberOfLines={1}>{t('delivery_fee')}</Text>
          <Text style={[Typography.bodySmall, deliveryFee === 0 && styles.freeFee]}>
            {deliveryFee === 0 ? t('free') : formatPrice(deliveryFee)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={Typography.bodySmall}>{t('service_fee')}</Text>
          <Text style={Typography.bodySmall}>{formatPrice(SERVICE_FEE)}</Text>
        </View>
        {totalPrice < FREE_DELIVERY_THRESHOLD && (
          <Text style={styles.freeHint} numberOfLines={2}>
            💡 {t('free_delivery_hint', { amount: formatPrice(FREE_DELIVERY_THRESHOLD - totalPrice) })}
          </Text>
        )}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={Typography.heading3}>{t('total')}</Text>
          <Text style={[Typography.price, { fontSize: 20 }]}>{formatPrice(grandTotal)}</Text>
        </View>
        <View style={{ height: Spacing.sm }} />
        <PrimaryButton
          label={t('proceed_to_checkout')}
          onPress={() => navigation.navigate('Checkout')}
          icon={<Text style={{ color: '#fff' }}>→</Text>}
        />
      </View>
    </View>
  );
}

const SEPARATOR = () => <View style={{ height: Spacing.sm }} />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  clearBtn: { color: Colors.error, fontWeight: '700', fontSize: 14 },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },

  // ── Строка корзины ──
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    ...Shadows.md,
  },
  tileImage: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  img: { width: '100%', height: '100%' },
  tileInfo: { flex: 1, marginLeft: Spacing.md, justifyContent: 'center', gap: 2 },
  tileName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 19,
  },
  unitPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tileRight: { alignItems: 'flex-end', gap: Spacing.sm, marginLeft: Spacing.sm },
  lineTotal: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: -2,
  },
  qtyValue: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  // ── Итоги ──
  summary: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl + 12,
    borderTopRightRadius: Radius.xl + 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    ...Shadows.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  freeFee: { color: Colors.success, fontWeight: '800' },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  etaText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  freeHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
});
