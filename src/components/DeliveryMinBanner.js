import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Spacing, Radius } from '../core/theme';
import { useSettingsStore } from '../store/settingsStore';
import { useCartStore, selectTotalPrice } from '../store/cartStore';

/**
 * DeliveryMinBanner — shows the minimum order for the customer's detected
 * district (from their location) before they reach the cart. Renders nothing
 * until a district with a minimum is known (location denied → no banner).
 */
export default function DeliveryMinBanner() {
  const { t } = useTranslation();
  const district = useSettingsStore((s) => s.deliveryDistrict);
  const districts = useSettingsStore((s) => s.districts);
  const subtotal = useCartStore(selectTotalPrice);

  if (!district) return null;
  const min = districts.find((d) => d.name === district)?.minOrder || 0;
  if (!min) return null;

  const met = subtotal >= min;
  const short = Math.max(0, Math.ceil(min - subtotal));

  return (
    <View style={[styles.wrap, met ? styles.ok : styles.warn]}>
      <Text style={[styles.text, { color: met ? '#027A48' : '#B45309' }]}>
        📍 {t('delivery_min_banner', { district, min })}
        {subtotal > 0
          ? (met ? `  ${t('min_reached')}` : `  · ${t('district_min_short', { short })}`)
          : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  warn: { backgroundColor: '#FFF4E5', borderColor: '#FCD9A8' },
  ok: { backgroundColor: '#ECFDF3', borderColor: '#A6F4C5' },
  text: { fontSize: 13.5, fontWeight: '700' },
});
