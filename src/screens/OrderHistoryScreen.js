import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';
import { useOrderStore } from '../store/orderStore';
import { useProfileStore } from '../store/profileStore';
import { StatusBadge, EmptyState, ErrorState, PrimaryButton, SkeletonOrderList } from '../components/SharedWidgets';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../utils/formatPrice';

export default function OrderHistoryScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { orders, loading, error, loadOrders } = useOrderStore();
  const phone = useProfileStore((s) => s.phone);
  const addToCart = useCartStore((s) => s.addToCart);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadOrders(phone);
    }, [phone])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(phone);
    setRefreshing(false);
  }, [phone]);

  if (loading && orders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Text style={Typography.heading2} numberOfLines={1}>{t('my_orders')}</Text>
        </View>
        <SkeletonOrderList count={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Text style={Typography.heading2} numberOfLines={1}>{t('my_orders')}</Text>
        </View>
        <ErrorState message={error} onRetry={() => loadOrders(phone)} />
      </View>
    );
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={Typography.heading2} numberOfLines={1}>{t('my_orders')}</Text>
      </View>

      {orders.length === 0 ? (
        <EmptyState
          title={t('no_orders_yet')}
          subtitle={t('orders_appear_here')}
          emoji="📋"
          action={
            <PrimaryButton label={t('order_now')} onPress={() => navigation.navigate('Menu')} />
          }
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: Spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          renderItem={({ item: order }) => {
            const shortId = order._id.slice(-6).toUpperCase();
            const isActive = !['delivered', 'cancelled'].includes(order.status);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('OrderTracking', { orderId: order._id })}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.orderId} numberOfLines={1}>Order #{shortId}</Text>
                  <StatusBadge status={order.status} />
                </View>
                <Text style={Typography.bodySmall} numberOfLines={2}>
                  {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                </Text>
                <View style={styles.cardBottom}>
                  <Text style={[Typography.bodySmall, { flexShrink: 1 }]} numberOfLines={1}>🕐 {formatDate(order.createdAt)}</Text>
                  <Text style={Typography.price}>{formatPrice(order.totalPrice)}</Text>
                </View>
                {isActive ? (
                  <View style={styles.trackRow}>
                    <Text style={styles.trackText} numberOfLines={1}>
                      📍 {t('track_order')}
                    </Text>
                  </View>
                ) : order.status === 'delivered' ? (
                  <TouchableOpacity
                    style={styles.reorderBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => {
                      order.items.forEach((i) => {
                        addToCart({ _id: i.menuItem || i._id, name: i.name, price: i.price, imageUrl: i.imageUrl, preparationTime: 15, calories: 0, isAvailable: true });
                      });
                      navigation.navigate('Cart');
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>🔄</Text>
                    <Text style={styles.reorderText} numberOfLines={1}>
                      {t('reorder')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  card: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.divider,
    ...Shadows.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  orderId: { ...Typography.heading3, fontSize: 16, flexShrink: 1, fontWeight: '800' },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  trackRow: { marginTop: Spacing.sm },
  trackText: { color: Colors.primary, fontWeight: '800', fontSize: 14 },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  reorderText: { color: Colors.success, fontWeight: '800', fontSize: 14, marginLeft: Spacing.xs },
});
