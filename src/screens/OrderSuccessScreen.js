import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';
import { PrimaryButton } from '../components/SharedWidgets';

export default function OrderSuccessScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { orderId } = route.params;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const shortId = orderId.slice(-6).toUpperCase();

  return (
    <View style={styles.container}>
      {/* Animated checkmark */}
      <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={{ fontSize: 60 }}>✅</Text>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text style={styles.title}>{t('order_confirmed')}</Text>
        <Text style={styles.subtitle}>
          {t('order_number', { id: shortId })}
        </Text>
        <Text style={[Typography.bodySmall, { textAlign: 'center', marginTop: Spacing.sm }]}>
          {t('order_success_desc')}
        </Text>

        {/* ETA */}
        <View style={styles.etaBox}>
          <Text style={{ fontSize: 30 }}>🕐</Text>
          <View style={{ marginLeft: 12 }}>
            <Text style={Typography.label}>{t('estimated_delivery')}</Text>
            <Text style={styles.etaTime}>25-35 {t('min_label')}</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <PrimaryButton
            label={t('track_order')}
            onPress={() => navigation.replace('OrderTracking', { orderId })}
            icon={<Text style={{ color: '#fff' }}>📍</Text>}
          />
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Tabs')}
          >
            <Text style={styles.secondaryBtnText}>{t('back_to_home')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  etaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.divider,
    width: '100%',
    ...Shadows.md,
  },
  etaTime: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primary,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  buttons: {
    width: '100%',
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  secondaryBtn: {
    height: 56,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
