import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';

// ── Primary Button ─────────────────────────────────────────────
export function PrimaryButton({ label, onPress, loading, icon, disabled }) {
  const isDisabled = disabled || loading || !onPress;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={isDisabled ? undefined : onPress}
      style={[styles.primaryBtn, isDisabled && styles.primaryBtnDisabled]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <View style={styles.primaryBtnInner}>
          {icon}
          <Text style={styles.primaryBtnText} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Empty State ────────────────────────────────────────────────
export function EmptyState({ title, subtitle, emoji = '📭', action }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Text style={{ fontSize: 44 }}>{emoji}</Text>
      </View>
      <Text style={[Typography.heading3, { textAlign: 'center' }]} numberOfLines={2}>{title}</Text>
      {subtitle ? (
        <Text style={[Typography.bodySmall, { textAlign: 'center', marginTop: Spacing.sm }]} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: Spacing.lg, width: '100%' }}>{action}</View> : null}
    </View>
  );
}

// ── Error State ────────────────────────────────────────────────
export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: Colors.error + '15' }]}>
        <Text style={{ fontSize: 44 }}>📡</Text>
      </View>
      <Text style={[Typography.heading3, { textAlign: 'center' }]}>Oops!</Text>
      <Text style={[Typography.bodySmall, { textAlign: 'center', marginTop: Spacing.sm }]} numberOfLines={3}>
        {message}
      </Text>
      {onRetry && (
        <View style={{ marginTop: Spacing.lg }}>
          <PrimaryButton label="Try Again" onPress={onRetry} />
        </View>
      )}
    </View>
  );
}

// ── Section Header ─────────────────────────────────────────────
export function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={[Typography.heading3, { flexShrink: 1 }]} numberOfLines={1}>{title}</Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Status Badge ───────────────────────────────────────────────
export function StatusBadge({ status }) {
  const colorMap = {
    pending: Colors.warning,
    confirmed: '#3B82F6',
    preparing: '#3B82F6',
    en_route: '#6366F1',
    delivered: Colors.success,
    cancelled: Colors.error,
  };
  const labelMap = {
    pending: 'Order Placed',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    en_route: 'On the Way',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  const color = colorMap[status] || Colors.textLight;
  return (
    <View style={[styles.badge2, { backgroundColor: color + '15' }]}>
      <Text style={[styles.badgeLabel, { color }]} numberOfLines={1}>{labelMap[status] || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionAction: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  badge2: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});

// ── Shimmer helper ─────────────────────────────────────────────
function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

function SkeletonBox({ width, height, borderRadius = Radius.md, style }) {
  const anim = useShimmer();
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });
  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: Colors.shimmerBase },
        { opacity },
        style,
      ]}
    />
  );
}

// ── Skeleton: menu list (for MenuScreen while loading) ─────────
export function SkeletonMenuList({ count = 6 }) {
  return (
    <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.xs }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.surface,
            borderRadius: Radius.lg,
            marginBottom: Spacing.md,
            borderWidth: 1,
            borderColor: Colors.divider,
            padding: 10,
            overflow: 'hidden',
          }}
        >
          <SkeletonBox width={96} height={96} borderRadius={16} />
          <View style={{ flex: 1, marginLeft: Spacing.md, gap: 8 }}>
            <SkeletonBox width="70%" height={14} />
            <SkeletonBox width="50%" height={11} />
            <SkeletonBox width="40%" height={11} />
            <SkeletonBox width="30%" height={17} />
          </View>
          <View style={{ marginLeft: Spacing.sm }}>
            <SkeletonBox width={40} height={40} borderRadius={Radius.full} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Skeleton: order list (for OrderHistoryScreen while loading) ─
export function SkeletonOrderList({ count = 4 }) {
  return (
    <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            padding: Spacing.lg,
            backgroundColor: Colors.surface,
            borderRadius: Radius.xl,
            borderWidth: 1,
            borderColor: Colors.divider,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonBox width={100} height={15} />
            <SkeletonBox width={80} height={22} borderRadius={Radius.full} />
          </View>
          <SkeletonBox width="80%" height={12} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <SkeletonBox width={120} height={12} />
            <SkeletonBox width={60} height={18} />
          </View>
        </View>
      ))}
    </View>
  );
}
