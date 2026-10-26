import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '../core/theme';

// Калории и белки на порцию — ресторан вводит их в админке. 0 значит
// «не заполнено», такое значение не показываем вовсе.
export const hasNutrition = (item) => item?.calories > 0 || item?.protein > 0;

// 12.46 → «12,5» в ru/tr, «12.5» в en; 18 → «18»
const grams = (v, lang) => Number(v).toLocaleString(lang, { maximumFractionDigits: 1 });

const TONES = {
  calories: { bg: '#FFF1E8', fg: '#C2410C' },
  protein:  { bg: '#E7F6EE', fg: '#047857' },
};

// Плашки для строки меню: «🔥 320 ккал  💪 18 г белка». Всегда одна строка
// высотой CHIPS_HEIGHT — строка меню фиксированной высоты рассчитывает на это.
// На узком экране плашки сжимаются с многоточием, а не переносятся.
const CHIPS_HEIGHT = 18;

export function NutritionChips({ item }) {
  const { t, i18n } = useTranslation();
  if (!hasNutrition(item)) return null;
  return (
    <View style={styles.chips}>
      {item.calories > 0 && (
        <View style={[styles.chip, { backgroundColor: TONES.calories.bg }]}>
          <Text style={[styles.chipText, { color: TONES.calories.fg }]} numberOfLines={1}>
            🔥 {item.calories} {t('cal_label')}
          </Text>
        </View>
      )}
      {item.protein > 0 && (
        <View style={[styles.chip, { backgroundColor: TONES.protein.bg }]}>
          <Text style={[styles.chipText, { color: TONES.protein.fg }]} numberOfLines={1}>
            💪 {grams(item.protein, i18n.language)} {t('protein_short')}
          </Text>
        </View>
      )}
    </View>
  );
}

// Крупные плитки в карточке блюда, сразу под названием и ценой.
export function NutritionPanel({ item, style }) {
  const { t, i18n } = useTranslation();
  if (!hasNutrition(item)) return null;
  const tiles = [
    item.calories > 0 && { key: 'calories', icon: '🔥', value: item.calories, unit: t('cal_label'), label: t('calories') },
    item.protein > 0 && { key: 'protein', icon: '💪', value: grams(item.protein, i18n.language), unit: t('gram_label'), label: t('protein') },
  ].filter(Boolean);
  return (
    <View style={style}>
      <Text style={styles.title}>{t('nutrition_title')}</Text>
      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <View key={tile.key} style={[styles.tile, { backgroundColor: TONES[tile.key].bg }]}>
            <Text style={styles.icon}>{tile.icon}</Text>
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.value, { color: TONES[tile.key].fg }]} numberOfLines={1}>
                {tile.value} <Text style={styles.unit}>{tile.unit}</Text>
              </Text>
              <Text style={styles.label} numberOfLines={1}>{tile.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Ужато так, чтобы «🔥 1250 ккал» и «💪 14,5 г белка» помещались рядом
  // даже на экране шириной 360.
  chips: { flexDirection: 'row', gap: 5, height: CHIPS_HEIGHT, overflow: 'hidden' },
  chip: {
    height: CHIPS_HEIGHT,
    flexShrink: 1,
    paddingHorizontal: 6,
    borderRadius: Radius.full,
    justifyContent: 'center',
  },
  chipText: { fontSize: 11, fontWeight: '700', lineHeight: 14 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  tiles: { flexDirection: 'row', gap: Spacing.sm },
  tile: {
    flex: 1,
    // Одна плитка (заполнены только калории) не растягивается на всю ширину.
    maxWidth: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
  },
  icon: { fontSize: 24 },
  value: { fontSize: 20, fontWeight: '900' },
  unit: { fontSize: 13, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 1 },
});
