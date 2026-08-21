import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../core/theme';

const languages = [
  { code: 'en', flag: '🇬🇧', labelKey: 'english' },
  { code: 'ru', flag: '🇷🇺', labelKey: 'russian' },
  { code: 'tr', flag: '🇹🇷', labelKey: 'turkish' },
];

export default function SettingsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.navIcon}>←</Text>
        </TouchableOpacity>
        <Text style={Typography.heading2} numberOfLines={1}>{t('settings')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.content}>
        <Text style={Typography.heading3}>{t('language')}</Text>
        <View style={{ height: Spacing.md }} />
        {languages.map((lang) => {
          const isSelected = i18n.language === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.tile, isSelected && styles.tileSelected]}
              onPress={() => changeLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 28 }}>{lang.flag}</Text>
              <Text
                style={[
                  Typography.body,
                  { flex: 1, marginLeft: 14 },
                  isSelected && { fontWeight: '700', color: Colors.primary },
                ]}
              >
                {t(lang.labelKey)}
              </Text>
              {isSelected && <Text style={{ fontSize: 22, color: Colors.primary }}>✓</Text>}
            </TouchableOpacity>
          );
        })}
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
    backgroundColor: Colors.background,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  content: { padding: Spacing.md },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: Spacing.sm,
  },
  tileSelected: {
    backgroundColor: Colors.primary + '18',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  navIcon: { fontSize: 20, color: Colors.textPrimary, fontWeight: '600' },
});
