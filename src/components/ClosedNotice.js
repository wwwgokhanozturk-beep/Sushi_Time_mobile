import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius, Typography, Shadows } from '../core/theme';
import { useSettingsStore } from '../store/settingsStore';
import { PrimaryButton } from './SharedWidgets';

// Показать один раз за «сессию» (до холодного перезапуска приложения).
let shownThisSession = false;

// Предупреждение «ресторан закрыт» при входе в приложение. Внутри — кнопка «Меню».
export default function ClosedNotice({ navigationRef }) {
  const { t } = useTranslation();
  const businessHoursLoaded = useSettingsStore((s) => s.businessHoursLoaded);
  const openState = useSettingsStore((s) => s.openState);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!businessHoursLoaded || shownThisSession) return;
    if (!openState().open) {
      shownThisSession = true;
      setShow(true);
    }
  }, [businessHoursLoaded, openState]);

  const dismiss = () => setShow(false);

  const goToMenu = () => {
    dismiss();
    navigationRef?.current?.navigate('Tabs', { screen: 'Menu' });
  };

  if (!show) return null;

  const os = openState();
  const isDayOff = os.reason === 'holiday' || os.reason === 'day_off';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.close} onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Text style={{ fontSize: 36 }}>🌙</Text>
          </View>

          <Text style={[Typography.heading2, styles.title]}>{t('closed_title')}</Text>
          <Text style={[Typography.bodySmall, styles.subtitle]}>{t('closed_subtitle')}</Text>

          <View style={styles.hoursBox}>
            {isDayOff ? (
              <Text style={styles.hoursOff}>{t('closed_today_off')}</Text>
            ) : (
              <>
                <Text style={styles.hoursLabel}>{t('closed_today_hours')}</Text>
                <Text style={styles.hoursValue}>{os.today.open} – {os.today.close}</Text>
              </>
            )}
          </View>

          <PrimaryButton label={t('view_menu')} onPress={goToMenu} />
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
  close: { position: 'absolute', top: 12, right: 12, padding: 4 },
  closeText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '700' },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  title: { textAlign: 'center', marginBottom: 6 },
  subtitle: { textAlign: 'center', color: Colors.textSecondary, marginBottom: Spacing.lg },
  hoursBox: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primaryLight || '#FDECEA',
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  hoursLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  hoursValue: { fontSize: 20, fontWeight: '900', color: Colors.primary },
  hoursOff: { fontSize: 16, fontWeight: '800', color: Colors.primary },
});
