import React from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';
import { useCartStore, selectTotalPrice, selectTotalItems } from '../store/cartStore';
import { PrimaryButton, EmptyState } from '../components/SharedWidgets';
import { formatPrice } from '../utils/formatPrice';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, SERVICE_FEE } from '../core/constants';

export default function CartScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const totalPrice = useCartStore(selectTotalPrice);
  const totalItems = useCartStore(selectTotalItems);

  const deliveryFee = totalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const grandTotal = totalPrice + deliveryFee + SERVICE_FEE;

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
          <Text style={{ color: Colors.error, fontWeight: '600', fontSize: 14 }}>{t('clear')}</Text>
        </TouchableOpacity>
      </View>

      {/* Items */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.menuItem._id}
        contentContainerStyle={{ padding: Spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item }) => {
          const subtotal = formatPrice(item.menuItem.price * item.quantity);
          return (
            <View style={styles.tile}>
              <View style={styles.tileImage}>
                {item.menuItem.imageUrl ? (
                  <Image source={{ uri: item.menuItem.imageUrl }} style={styles.img} />
                ) : (
                  <Text style={{ fontSize: 32 }}>🍣</Text>
                )}
              </View>
              <View style={styles.tileInfo}>
                <Text style={styles.tileName} numberOfLines={1}>
                  {item.menuItem.name}
                </Text>
                <Text style={Typography.bodySmall}>{formatPrice(item.menuItem.price)}</Text>
              </View>
              <View style={styles.tileRight}>
                <Text style={Typography.price}>{subtotal}</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.menuItem._id, item.quantity - 1)}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={[Typography.heading3, { minWidth: 20, textAlign: 'center' }]}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.menuItem._id, item.quantity + 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.etaRow}>
          <Text style={{ fontSize: 16 }}>🚴</Text>
          <Text style={styles.etaText} numberOfLines={1}>{t('estimated_delivery')}: 25-35 {t('min_label')}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={[Typography.body, { flexShrink: 1 }]} numberOfLines={1}>{t('subtotal')} ({totalItems} {t('items')})</Text>
          <Text style={Typography.body}>{formatPrice(totalPrice)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[Typography.bodySmall, { flexShrink: 1 }]} numberOfLines={1}>{t('delivery_fee')}</Text>
          <Text style={[Typography.bodySmall, deliveryFee === 0 && { color: Colors.success }]}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tile: {
    flexDirection: "row",
    padding: Spacing.md,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    ...Shadows.md,
  },
  tileImage: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  img: { width: 72, height: 72, resizeMode: "cover" },
  tileInfo: { flex: 1, marginLeft: Spacing.md, justifyContent: "center" },
  tileName: {
    ...Typography.heading3,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  tileRight: { alignItems: "flex-end", justifyContent: "space-between" },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary,
    marginTop: -2,
  },
  summary: {
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl + 12,
    borderTopRightRadius: Radius.xl + 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    ...Shadows.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  etaText: {
    ...Typography.bodySmall,
    fontWeight: "700",
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  freeHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
});
