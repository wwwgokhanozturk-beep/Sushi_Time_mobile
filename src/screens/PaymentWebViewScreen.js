import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';

export default function PaymentWebViewScreen({ route, navigation }) {
  const { paymentPageUrl, orderId } = route.params;
  const insets = useSafeAreaInsets();

  // Open iyzico page in the system browser
  useEffect(() => {
    Linking.openURL(paymentPageUrl).catch(() => {
      navigation.goBack();
    });
  }, [paymentPageUrl]);

  // Listen for the deep-link callback: sushitime://payment-result?status=...
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (!url.includes('payment-result')) return;
      if (url.includes('status=success')) {
        navigation.replace('OrderSuccess', { orderId });
      } else {
        navigation.goBack();
      }
    });
    return () => sub.remove();
  }, [orderId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={Typography.heading3}>Ödeme</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.body}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.hint}>Ödeme sayfası tarayıcıda açılıyor…</Text>

        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => Linking.openURL(paymentPageUrl)}
          activeOpacity={0.8}
        >
          <Text style={styles.retryTxt}>Tekrar aç</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  closeBtn: { fontSize: 20, color: Colors.textPrimary, fontWeight: '600' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  hint: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryBtn: {
    height: 52,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  retryTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
