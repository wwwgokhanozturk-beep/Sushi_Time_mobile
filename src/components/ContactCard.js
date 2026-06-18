import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '../core/theme';
import { useSettingsStore, contactUrl } from '../store/settingsStore';

/**
 * ContactCard — кликабельный контакт (WhatsApp / телефон) из настроек.
 * variant: 'card' (для главной) | 'compact' (полоса для чата)
 */
export default function ContactCard({ variant = 'card', style }) {
  const { t } = useTranslation();
  const { contactType, contactNumber, loaded, loadSettings } = useSettingsStore();

  useEffect(() => { loadSettings(); }, []);

  if (!loaded || !contactNumber) return null;

  const url = contactUrl(contactType, contactNumber);
  if (!url) return null;

  const isWa = contactType === 'whatsapp';
  const icon = isWa ? '💬' : '📞';
  const label = isWa ? 'WhatsApp' : t('phone_number');
  const accent = isWa ? '#25D366' : Colors.primary;
  const onPress = () => Linking.openURL(url).catch(() => {});

  if (variant === 'compact') {
    return (
      <TouchableOpacity style={[styles.compact, style]} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.compactIcon}>{icon}</Text>
        <Text style={[styles.compactLabel, { color: accent }]}>{label}:</Text>
        <Text style={styles.compactNumber}>{contactNumber}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.card, { borderColor: accent }, style]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.iconWrap, { backgroundColor: accent }]}>
        <Text style={styles.cardIcon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardLabel}>{t('contact_us')}</Text>
        <Text style={[styles.cardValue, { color: accent }]} numberOfLines={1}>{label} · {contactNumber}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1.5,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIcon: { fontSize: 22 },
  cardLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  cardValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  compact: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  compactIcon: { fontSize: 16 },
  compactLabel: { fontSize: 14, fontWeight: '700' },
  compactNumber: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
});
