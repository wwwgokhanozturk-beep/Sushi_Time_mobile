import React, { useState } from 'react';
import { Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius, Typography, Shadows } from '../core/theme';
import { useSettingsStore } from '../store/settingsStore';
import { PrimaryButton } from './SharedWidgets';
import { compareVersions } from '../utils/compareVersions';

// Приглашение обновиться. Два режима:
//   • required — установленная сборка старше `minSupported`: окно не закрыть,
//     потому что дальше приложение всё равно работать не сможет;
//   • optional — вышла новая сборка: показываем один раз за запуск и даём
//     кнопку «позже», иначе баннер превращается в раздражитель.
//
// Обе границы задаёт админка (PUT /settings/app-version), а не код: чтобы
// поднять минимум, пересобирать приложение не нужно.

const currentVersion = Constants.expoConfig?.version || '0.0.0';

// Ссылку задаёт админка, но для Android она выводится из applicationId —
// так кнопка работает даже в свежей базе, где поле ещё не заполняли.
function resolveStoreUrl(appVersion) {
  const configured = appVersion?.storeUrl?.[Platform.OS];
  if (configured) return configured;
  if (Platform.OS === 'android') {
    const pkg = Constants.expoConfig?.android?.package;
    return pkg ? `https://play.google.com/store/apps/details?id=${pkg}` : null;
  }
  return null;
}

export default function UpdateNotice() {
  const { t } = useTranslation();
  const appVersion = useSettingsStore((s) => s.appVersion);
  const [dismissed, setDismissed] = useState(false);

  const storeUrl = resolveStoreUrl(appVersion);

  // Без ссылки на магазин обновиться некуда, поэтому блокировать экран нельзя:
  // это заперло бы пользователя в приложении без единого выхода.
  const required =
    !!storeUrl && compareVersions(currentVersion, appVersion?.minSupported) < 0;
  const optional =
    !required && compareVersions(currentVersion, appVersion?.latest) < 0;

  // Компонент живёт в корне App, поэтому «позже» само собой держится до
  // холодного перезапуска — отдельный флаг сессии не нужен.
  if (!appVersion) return null;
  if (!required && !optional) return null;
  if (optional && dismissed) return null;

  const openStore = () => {
    if (storeUrl) Linking.openURL(storeUrl).catch(() => {});
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      // Аппаратная кнопка «назад» на Android не должна закрывать обязательное окно.
      onRequestClose={required ? () => {} : () => setDismissed(true)}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={{ fontSize: 36 }}>🚀</Text>
          </View>

          <Text style={[Typography.heading2, styles.title]}>
            {t(required ? 'update_required_title' : 'update_title')}
          </Text>
          <Text style={[Typography.bodySmall, styles.subtitle]}>
            {appVersion.notes || t(required ? 'update_required_body' : 'update_body')}
          </Text>

          <View style={styles.versionBox}>
            <Text style={styles.versionLabel}>{t('update_your_version')}</Text>
            <Text style={styles.versionValue}>
              {currentVersion} → {appVersion.latest}
            </Text>
          </View>

          <PrimaryButton label={t('update_now')} onPress={storeUrl ? openStore : undefined} />

          {!required && (
            <TouchableOpacity style={styles.later} onPress={() => setDismissed(true)}>
              <Text style={styles.laterText}>{t('update_later')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.md,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  title: { textAlign: 'center', marginBottom: 6 },
  subtitle: { textAlign: 'center', color: Colors.textSecondary, marginBottom: Spacing.lg },
  versionBox: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primaryLight || '#FDECEA',
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  versionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  versionValue: { fontSize: 20, fontWeight: '900', color: Colors.primary },
  later: { marginTop: Spacing.md, padding: Spacing.sm },
  laterText: { ...Typography.bodySmall, color: Colors.textSecondary, fontWeight: '700' },
});
