import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';
import { useCartStore, selectTotalPrice } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { useProfileStore } from '../store/profileStore';
import { PrimaryButton } from '../components/SharedWidgets';
import { formatPrice } from '../utils/formatPrice';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, SERVICE_FEE, TIP_OPTIONS } from '../core/constants';
// import httpClient from '../core/httpClient'; // used only by disabled online-payment branch
import { usePromotionStore } from '../store/promotionStore';

export default function CheckoutScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalPrice = useCartStore(selectTotalPrice);
  const { placeOrder, loading, error: orderError } = useOrderStore();
  const profile = useProfileStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [doorCode, setDoorCode] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedLat, setSelectedLat] = useState(null);
  const [selectedLng, setSelectedLng] = useState(null);

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(null);
  const [tip, setTip] = useState(0);
  // 'cash' | 'card' — both are paid at delivery. Online payment ('card_online') is
  // temporarily disabled; keep the related code below commented out for future re-enable.
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Auto-fill from saved profile
  useEffect(() => {
    if (profile.loaded) {
      if (profile.name && !name) setName(profile.name);
      if (profile.phone && !phone) setPhone(profile.phone);
      if (profile.address && !address) setAddress(profile.address);
      if (profile.notes && !notes) setNotes(profile.notes);
    }
  }, [profile.loaded]);

  const deliveryFee = totalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const discount = promoApplied ? totalPrice * promoApplied : 0;
  const grandTotal = Math.max(0, totalPrice - discount) + deliveryFee + SERVICE_FEE + tip;

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    const promotions = usePromotionStore.getState().promotions;
    const match = promotions.find(
      (p) => p.code && p.code.toUpperCase() === code && p.active !== false
    );
    if (match && match.discount) {
      const percent = match.discount;
      setPromoApplied(percent / 100);
      Alert.alert('', t('promo_applied', { percent }));
    } else {
      setPromoApplied(null);
      Alert.alert('', t('invalid_promo'));
    }
  };

  const handlePickMap = () => {
    navigation.navigate('MapPicker', {
      onSelect: (location) => {
        setSelectedLat(location.latitude);
        setSelectedLng(location.longitude);
        if (location.address) setAddress(location.address);
      },
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert('', t('name_required'));
    if (!phone.trim()) return Alert.alert('', t('phone_required'));
    if (!address.trim()) return Alert.alert('', t('address_required'));

    const payload = {
      customerName: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      buildingName: buildingName.trim(),
      floor: floor.trim(),
      apartment: apartment.trim(),
      doorCode: doorCode.trim(),
      notes: notes.trim(),
      ...(selectedLat != null && { latitude: selectedLat }),
      ...(selectedLng != null && { longitude: selectedLng }),
      items: items.map((ci) => ({
        menuItemId: ci.menuItem._id,
        quantity: ci.quantity,
      })),
      paymentMethod,
      ...(promoCode.trim() && { promoCode: promoCode.trim() }),
      tip,
    };

    const order = await placeOrder(payload);
    if (!order) return;

    // Save entered details to profile for future lookups
    profile.updateProfile({ name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim() });

    // Online payment is disabled for now — re-enable this branch when iyzico is reconnected.
    // if (paymentMethod === 'card_online') {
    //   try {
    //     const res = await httpClient.post('/payments/initialize', { orderId: order._id });
    //     const { paymentPageUrl } = res.data.data;
    //     navigation.replace('PaymentWebView', { paymentPageUrl, orderId: order._id });
    //   } catch (e) {
    //     Alert.alert(t('error'), e.response?.data?.message || 'Ödeme başlatılamadı');
    //   }
    // } else {
    clearCart();
    navigation.replace('OrderSuccess', { orderId: order._id });
    // }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.navIcon}>←</Text>
        </TouchableOpacity>
        <Text style={Typography.heading2} numberOfLines={1}>{t('checkout')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Map section */}
        <Text style={Typography.heading3}>{t('delivery_location')}</Text>
        <TouchableOpacity style={styles.mapPlaceholder} onPress={handlePickMap}>
          <Text style={{ fontSize: 40 }}>🗺️</Text>
          <Text style={Typography.bodySmall}>{t('tap_map_hint')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapBtn} onPress={handlePickMap}>
          <Text style={styles.mapBtnText}>📍 {t('pick_on_map')}</Text>
        </TouchableOpacity>

        {/* Customer details */}
        <Text style={[Typography.heading3, { marginTop: Spacing.lg }]}>{t('your_details')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('full_name')}
          placeholderTextColor={Colors.textLight}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder={t('phone_number')}
          placeholderTextColor={Colors.textLight}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, { height: 60 }]}
          placeholder={t('delivery_address')}
          placeholderTextColor={Colors.textLight}
          value={address}
          onChangeText={setAddress}
          multiline
        />
        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder={t('building_name')}
            placeholderTextColor={Colors.textLight}
            value={buildingName}
            onChangeText={setBuildingName}
          />
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder={t('floor')}
            placeholderTextColor={Colors.textLight}
            value={floor}
            onChangeText={setFloor}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder={t('apartment')}
            placeholderTextColor={Colors.textLight}
            value={apartment}
            onChangeText={setApartment}
          />
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder={t('door_code')}
            placeholderTextColor={Colors.textLight}
            value={doorCode}
            onChangeText={setDoorCode}
          />
        </View>
        <TextInput
          style={[styles.input, { height: 60 }]}
          placeholder={t('order_notes')}
          placeholderTextColor={Colors.textLight}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* Promo code */}
        <Text style={[Typography.heading3, { marginTop: Spacing.lg }]}>{t('promo_code')}</Text>
        <View style={styles.promoRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginTop: 0 }]}
            placeholder="SUSHI10"
            placeholderTextColor={Colors.textLight}
            value={promoCode}
            onChangeText={setPromoCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.promoBtn} onPress={handleApplyPromo}>
            <Text style={styles.promoBtnText}>{t('apply')}</Text>
          </TouchableOpacity>
        </View>

        {/* Tip */}
        <Text style={[Typography.heading3, { marginTop: Spacing.lg }]}>{t('tip')}</Text>
        <Text style={[Typography.bodySmall, { marginTop: 2 }]}>{t('tip_desc')}</Text>
        <View style={styles.tipRow}>
          {TIP_OPTIONS.map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.tipChip, tip === val && styles.tipChipActive]}
              onPress={() => setTip(val)}
            >
              <Text style={[styles.tipChipText, tip === val && { color: '#fff' }]}>
                {val === 0 ? '—' : formatPrice(val)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Order summary */}
        <Text style={[Typography.heading3, { marginTop: Spacing.lg }]}>{t('order_summary')}</Text>
        <View style={styles.summaryBox}>
          {items.map((ci) => (
            <View key={ci.menuItem._id} style={styles.summaryItem}>
              <Text style={[Typography.body, { flex: 1 }]} numberOfLines={1}>
                {ci.quantity}× {ci.menuItem.name}
              </Text>
              <Text style={Typography.bodySmall}>
                {formatPrice(ci.menuItem.price * ci.quantity)}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={Typography.body}>{t('subtotal')}</Text>
            <Text style={Typography.body}>{formatPrice(totalPrice)}</Text>
          </View>
          {promoApplied != null && (
            <View style={styles.summaryItem}>
              <Text style={[Typography.bodySmall, { color: Colors.success }]}>
                {t('discount')} (-{Math.round(promoApplied * 100)}%)
              </Text>
              <Text style={[Typography.bodySmall, { color: Colors.success }]}>
                -{formatPrice(discount)}
              </Text>
            </View>
          )}
          <View style={styles.summaryItem}>
            <Text style={Typography.bodySmall}>{t('delivery_fee')}</Text>
            <Text style={[Typography.bodySmall, deliveryFee === 0 && { color: Colors.success }]}>
              {deliveryFee === 0 ? t('free') : formatPrice(deliveryFee)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={Typography.bodySmall}>{t('service_fee')}</Text>
            <Text style={Typography.bodySmall}>{formatPrice(SERVICE_FEE)}</Text>
          </View>
          {tip > 0 && (
            <View style={styles.summaryItem}>
              <Text style={Typography.bodySmall}>{t('tip')}</Text>
              <Text style={Typography.bodySmall}>{formatPrice(tip)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={Typography.heading3}>{t('total')}</Text>
            <Text style={[Typography.price, { fontSize: 20 }]}>{formatPrice(grandTotal)}</Text>
          </View>
        </View>

        {/* Payment method — customer tells the driver in advance how they will pay at the door. */}
        <Text style={[Typography.heading3, { marginTop: Spacing.lg }]}>{t('payment_method')}</Text>
        <View style={styles.paymentRow}>
          <TouchableOpacity
            style={[styles.paymentChip, paymentMethod === 'cash' && styles.paymentChipActive]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Text style={[styles.paymentChipText, paymentMethod === 'cash' && { color: '#fff' }]}>
              💵 {t('cash')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentChip, paymentMethod === 'card' && styles.paymentChipActive]}
            onPress={() => setPaymentMethod('card')}
          >
            <Text style={[styles.paymentChipText, paymentMethod === 'card' && { color: '#fff' }]}>
              💳 {t('card')}
            </Text>
          </TouchableOpacity>
          {/*
          // Online card payment — disabled, will be reconnected later.
          <TouchableOpacity
            style={[styles.paymentChip, paymentMethod === 'card_online' && styles.paymentChipActive]}
            onPress={() => setPaymentMethod('card_online')}
          >
            <Text style={[styles.paymentChipText, paymentMethod === 'card_online' && { color: '#fff' }]}>
              💳 {t('card_online')}
            </Text>
          </TouchableOpacity>
          */}
        </View>

        <View style={{ marginTop: Spacing.xl }}>
          {orderError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {orderError}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.retryBtnText}>{loading ? '…' : '🔄 Retry'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <PrimaryButton
            label={t('place_order')}
            onPress={handleSubmit}
            loading={loading}
            icon={<Text style={{ color: '#fff' }}>✓</Text>}
          />
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
  content: { padding: Spacing.md },
  mapPlaceholder: {
    height: 180,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  mapBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    backgroundColor: Colors.background,
  },
  mapBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  input: {
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  summaryBox: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.md },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  promoBtn: {
    height: 56,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  promoBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  tipRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  tipChip: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
    ...Shadows.glow,
  },
  tipChipText: { fontWeight: '700', color: Colors.textSecondary },
  navIcon: { fontSize: 20, color: Colors.textPrimary, fontWeight: '600' },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inputHalf: {
    flex: 1,
    marginTop: Spacing.md,
  },
  paymentRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  paymentChip: {
    flex: 1,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
    ...Shadows.glow,
  },
  paymentChipText: { fontWeight: '700', fontSize: 15, color: Colors.textSecondary },
  errorBanner: {
    backgroundColor: Colors.error + '18',
    borderWidth: 1,
    borderColor: Colors.error + '55',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  errorBannerText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  retryBtn: {
    height: 42,
    borderRadius: Radius.lg,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
