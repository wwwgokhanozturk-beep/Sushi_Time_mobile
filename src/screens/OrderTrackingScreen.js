import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import MapboxMap from '../components/MapboxMap';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';
import { useOrderStore } from '../store/orderStore';
import { StatusBadge, ErrorState } from '../components/SharedWidgets';
import { formatPrice } from '../utils/formatPrice';
import { RESTAURANT_LAT, RESTAURANT_LNG } from '../core/constants';

export default function OrderTrackingScreen({ route, navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;
  const { currentOrder, loading, error, loadOrderById } = useOrderStore();
  const pollRef = useRef(null);

  useEffect(() => {
    loadOrderById(orderId);
    pollRef.current = setInterval(() => loadOrderById(orderId), 15000);
    return () => clearInterval(pollRef.current);
  }, [orderId]);

  if (loading && !currentOrder) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState message={error} onRetry={() => loadOrderById(orderId)} />
      </View>
    );
  }

  const order = currentOrder;
  if (!order) return null;

  const shortId = order._id.slice(-6).toUpperCase();
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

  const steps = [
    { key: 'pending', label: t('order_placed'), emoji: '📋' },
    { key: 'confirmed', label: t('confirmed'), emoji: '✅' },
    { key: 'preparing', label: t('preparing'), emoji: '🍳' },
    { key: 'en_route', label: t('on_the_way'), emoji: '🛵' },
    { key: 'delivered', label: t('delivered'), emoji: '🏠' },
  ];
  const currentIdx = steps.findIndex((s) => s.key === order.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.navIcon}>←</Text>
        </TouchableOpacity>
        <Text style={Typography.heading2} numberOfLines={1}>{t('track_order')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Orders')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 20 }}>📋</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapboxMap
        lat={RESTAURANT_LAT}
        lng={RESTAURANT_LNG}
        zoom={14}
        interactive={false}
        style={styles.mapPlaceholder}
        markers={[
          { lat: RESTAURANT_LAT, lng: RESTAURANT_LNG, type: 'restaurant', color: '#E8181B', title: 'Sushi Time' },
          ...(order?.latitude && order?.longitude
            ? [{ lat: order.latitude, lng: order.longitude, type: 'delivery', color: '#10B981', title: 'Доставка' }]
            : order?.address
            ? [{ lat: RESTAURANT_LAT - 0.005, lng: RESTAURANT_LNG + 0.005, type: 'delivery', color: '#10B981', title: 'Доставка' }]
            : []),
        ]}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Order ID + Status */}
        <View style={styles.row}>
          <Text style={Typography.heading3}>Order #{shortId}</Text>
          <StatusBadge status={order.status} />
        </View>
        <Text style={Typography.bodySmall}>{formatDate(order.createdAt)}</Text>

        {/* Stepper */}
        {order.status !== 'cancelled' ? (
          <View style={{ marginTop: Spacing.lg }}>
            {steps.map((step, i) => {
              const isDone = i <= currentIdx;
              const isActive = i === currentIdx;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View
                      style={[
                        styles.stepCircle,
                        { backgroundColor: isDone ? Colors.primary : Colors.divider },
                      ]}
                    >
                      <Text style={{ fontSize: 16 }}>{step.emoji}</Text>
                    </View>
                    {i < steps.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          { backgroundColor: i < currentIdx ? Colors.primary : Colors.divider },
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      Typography.body,
                      {
                        color: isActive
                          ? Colors.primary
                          : isDone
                          ? Colors.textPrimary
                          : Colors.textLight,
                        fontWeight: isActive ? '700' : '400',
                        marginTop: 6,
                      },
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.cancelledBox}>
            <Text style={styles.cancelledText}>{t('order_cancelled')}</Text>
          </View>
        )}

        {/* Address */}
        <Text style={[Typography.heading3, { marginTop: Spacing.lg }]}>{t('delivering_to')}</Text>
        <View style={styles.addressBox}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>📍</Text>
          <Text style={[Typography.body, { flex: 1 }]}>{order.address}</Text>
        </View>

        {/* Items */}
        <Text style={[Typography.heading3, { marginTop: Spacing.lg }]}>{t('items')}</Text>
        {order.items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={Typography.body}>
              {item.quantity}× {item.name}
            </Text>
            <Text style={Typography.bodySmall}>{formatPrice(item.subtotal)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.itemRow}>
          <Text style={Typography.heading3}>{t('total')}</Text>
          <Text style={[Typography.price, { fontSize: 20 }]}>{formatPrice(order.totalPrice)}</Text>
        </View>
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  mapPlaceholder: {
    height: 220,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  content: { padding: Spacing.xl },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepLeft: { alignItems: 'center', marginRight: Spacing.md },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepLine: { width: 2, height: 36 },
  cancelledBox: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  cancelledText: { color: Colors.error, fontWeight: '800', textAlign: 'center', fontSize: 16 },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.md },
  navIcon: { fontSize: 20, color: Colors.textPrimary, fontWeight: '600' },
});
