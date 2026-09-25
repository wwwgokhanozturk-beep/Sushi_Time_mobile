import React, { useCallback, memo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Shadows } from '../core/theme';

// Логотип с вырезанным фоном: исходный logo.jpg — это JPEG с запечённой
// «шахматкой прозрачности», в шапке она выглядела бы серыми клетками.
const LOGO = require('../../assets/logo-mark.png');
const LOGO_H = 34;
const LOGO_W = Math.round(LOGO_H * (600 / 294)); // пропорции logo-mark.png

const LANGS = [
  { code: 'en', flag: '🇬🇧' },
  { code: 'ru', flag: '🇷🇺' },
  { code: 'tr', flag: '🇹🇷' },
];

function LangButton({ lang, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.langBtn, active && styles.langBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={lang.code}
    >
      <Text style={styles.flag}>{lang.flag}</Text>
    </TouchableOpacity>
  );
}

const MemoLangButton = memo(LangButton);

// Общая шапка: логотип слева, переключатель языка справа.
// Переключение мгновенное — i18next сам сохраняет выбор в AsyncStorage.
function AppHeader() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const current = (i18n.language || 'en').slice(0, 2);

  const change = useCallback(
    (code) => {
      if (code !== current) i18n.changeLanguage(code);
    },
    [current, i18n]
  );

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
      <Image source={LOGO} style={styles.logo} contentFit="contain" cachePolicy="memory-disk" />

      <View style={styles.langs}>
        {LANGS.map((lang) => (
          <MemoLangButton
            key={lang.code}
            lang={lang}
            active={current === lang.code}
            onPress={() => change(lang.code)}
          />
        ))}
      </View>
    </View>
  );
}

export default memo(AppHeader);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  logo: {
    width: LOGO_W,
    height: LOGO_H,
  },
  langs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  langBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.divider,
    ...Shadows.sm,
  },
  langBtnActive: {
    borderColor: Colors.primary,
  },
  flag: {
    // Флаговые эмодзи на Android рисуются мельче, чем на iOS — выравниваем.
    fontSize: Platform.OS === 'android' ? 20 : 22,
    lineHeight: Platform.OS === 'android' ? 24 : 26,
  },
});
