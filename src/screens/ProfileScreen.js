import React, { useEffect, useState } from 'react';
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
import { useProfileStore } from '../store/profileStore';
import { useOrderStore } from '../store/orderStore';
import { PrimaryButton } from '../components/SharedWidgets';
import { formatPrice } from '../utils/formatPrice';

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const profile = useProfileStore();
  const isLoggedIn = useProfileStore((s) => s.isLoggedIn);
  const logout = useProfileStore((s) => s.logout);
  const orders = useOrderStore((s) => s.orders);
  const loadOrders = useOrderStore((s) => s.loadOrders);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    profile.loadProfile();
    loadOrders();
  }, []);

  useEffect(() => {
    if (profile.loaded) {
      setName(profile.name);
      setPhone(profile.phone);
      setAddress(profile.address);
    }
  }, [profile.loaded]);

  const handleSave = async () => {
    await profile.updateProfile({ name: name.trim(), phone: phone.trim(), address: address.trim() });
    setEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(t('logout'), t('logout') + '?', [
      { text: t('cancel') || 'Cancel', style: 'cancel' },
      {
        text: t('logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          setName('');
          setPhone('');
          setAddress('');
        },
      },
    ]);
  };

  const completedOrders = orders.filter((o) => o.status === 'delivered').length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Avatar area */}
      <View style={[styles.avatarSection, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 48 }}>👤</Text>
        </View>
        <Text style={Typography.heading2} numberOfLines={1}>{name || t('guest')}</Text>
        <Text style={Typography.bodySmall} numberOfLines={1}>{phone || t('no_phone')}</Text>
      </View>

      {/* Auth section — sign in prompt or signed-in badge */}
      {!isLoggedIn ? (
        <View style={styles.authSection}>
          <Text style={[Typography.bodySmall, { textAlign: 'center', color: Colors.textSecondary, marginBottom: Spacing.sm }]}>
            {t('sign_in_to_save')}
          </Text>
          <PrimaryButton label={t('sign_in')} onPress={() => navigation.navigate('Login')} />
          <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={() => navigation.navigate('Register')}>
            <Text style={[Typography.bodySmall, { color: Colors.primary, fontWeight: '700' }]}>
              {t('create_account')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.authSection, { paddingVertical: Spacing.sm }]}>
          <Text style={[Typography.bodySmall, { textAlign: 'center', color: Colors.textSecondary }]}>
            ✅ {profile.email}
          </Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{orders.length}</Text>
          <Text style={Typography.bodySmall} numberOfLines={1}>{t('total_orders')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{completedOrders}</Text>
          <Text style={Typography.bodySmall} numberOfLines={1}>{t('completed')}</Text>
        </View>
      </View>

      {/* Personal Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[Typography.heading3, { flexShrink: 1 }]} numberOfLines={1}>{t('personal_info')}</Text>
          <TouchableOpacity
            onPress={() => (editing ? handleSave() : setEditing(true))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 14 }}>
              {editing ? t('save') : t('edit')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={Typography.label} numberOfLines={1}>{t('full_name')}</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('full_name')}
              placeholderTextColor={Colors.textLight}
            />
          ) : (
            <Text style={Typography.body}>{name || '—'}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={Typography.label} numberOfLines={1}>{t('phone_number')}</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('phone_number')}
              placeholderTextColor={Colors.textLight}
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={Typography.body}>{phone || '—'}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={Typography.label} numberOfLines={1}>{t('delivery_address')}</Text>
          {editing ? (
            <TextInput
              style={[styles.input, { height: 60 }]}
              value={address}
              onChangeText={setAddress}
              placeholder={t('delivery_address')}
              placeholderTextColor={Colors.textLight}
              multiline
            />
          ) : (
            <Text style={Typography.body} numberOfLines={3}>{address || '—'}</Text>
          )}
        </View>
      </View>

      {/* Quick links */}
      <View style={styles.section}>
        <Text style={Typography.heading3} numberOfLines={1}>{t('quick_links')}</Text>
        <TouchableOpacity style={styles.linkTile} activeOpacity={0.7} onPress={() => navigation.navigate('Orders')}>
          <Text style={{ fontSize: 20 }}>📋</Text>
          <Text style={[Typography.body, { flex: 1, marginLeft: Spacing.md }]} numberOfLines={1}>{t('my_orders')}</Text>
          <Text style={{ color: Colors.textLight }}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkTile} activeOpacity={0.7} onPress={() => navigation.navigate('Settings')}>
          <Text style={{ fontSize: 20 }}>🌐</Text>
          <Text style={[Typography.body, { flex: 1, marginLeft: Spacing.md }]} numberOfLines={1}>{t('language')}</Text>
          <Text style={{ color: Colors.textLight }}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkTile}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(t('app_title'), `v1.0.0\n${t('about_desc')}`)
          }
        >
          <Text style={{ fontSize: 20 }}>ℹ️</Text>
          <Text style={[Typography.body, { flex: 1, marginLeft: Spacing.md }]} numberOfLines={1}>{t('about')}</Text>
          <Text style={{ color: Colors.textLight }}>→</Text>
        </TouchableOpacity>
        {isLoggedIn && (
          <TouchableOpacity style={[styles.linkTile, { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={handleLogout}>
            <Text style={{ fontSize: 20 }}>🚪</Text>
            <Text style={[Typography.body, { flex: 1, marginLeft: Spacing.md, color: Colors.primary }]} numberOfLines={1}>
              {t('logout')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  avatarSection: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  authSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    ...Shadows.md,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  field: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  input: {
    height: 50,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  linkTile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
});
