import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Radius } from '../core/theme';

// Калории и белки на порцию — ресторан вводит их в админке. 0 значит
// «не заполнено», такое значение не показываем вовсе.
export const hasNutrition = (item) => item?.calories > 0 || item?.protein > 0;

// Есть ли что показать в блоке пищевой ценности: к калориям и белкам
// добавляются жиры и углеводы (тоже на порцию, 0 — не указано).
export const hasNutritionFacts = (item) => hasNutrition(item) || item?.fat > 0 || item?.carbs > 0;

// 12.46 → «12,5» в ru/tr, «12.5» в en; 18 → «18»
const grams = (v, lang) => Number(v).toLocaleString(lang, { maximumFractionDigits: 1 });

// В блоке БЖУ десятые доли нужны только малым числам: 4,7 г, но 24 г, а не 23,5.
const amount = (v, lang) => Number(v).toLocaleString(lang, { maximumFractionDigits: v < 10 ? 1 : 0 });

// «470 г · 18 шт.» — вес и число штук в порции. Пустая строка, если ресторан
// не указал ни того, ни другого.
export function servingLabel(item, t, lang) {
  return [
    item?.weight > 0 && `${grams(item.weight, lang)} ${t('gram_label')}`,
    item?.pieces > 0 && t('pieces_count', { pieces: item.pieces }),
  ].filter(Boolean).join(' · ');
}

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

// Цвета белков, жиров и углеводов: точки у подписей и полоска под цифрами.
const MACROS = ['protein', 'fat', 'carbs'];
const MACRO_COLORS = { protein: '#10B981', fat: '#F59E0B', carbs: '#3B82F6' };
// Килокалорий в грамме: белки и углеводы — 4, жиры — 9.
const KCAL_PER_GRAM = { protein: 4, fat: 9, carbs: 4 };

// Пищевая ценность на порцию, как её вводит ресторан: белки, жиры, углеводы,
// калории и полоска — какая доля калорий приходится на белки, жиры и углеводы.
// children — кнопки внизу карточки (в окне блюда это «Подробнее о блюде»).
export function NutritionFacts({ item, style, children }) {
  const { t, i18n } = useTranslation();
  if (!hasNutritionFacts(item)) return null;

  const lang = i18n.language;
  const facts = [
    ...MACROS.map((key) => item[key] > 0 && {
      key,
      color: MACRO_COLORS[key],
      value: amount(item[key], lang),
      unit: t('gram_label'),
      label: t(key),
    }),
    item.calories > 0 && {
      key: 'calories',
      value: Math.round(item.calories).toLocaleString(lang),
      unit: t('cal_label'),
      label: t('calories'),
    },
  ].filter(Boolean);

  // Только когда известны все три — иначе единственный заполненный
  // показатель выглядел бы как «100% калорий».
  const shares = MACROS.every((key) => item[key] > 0)
    ? MACROS.map((key) => ({ key, kcal: item[key] * KCAL_PER_GRAM[key] }))
    : null;

  return (
    <View style={[styles.factsCard, style]}>
      <Text style={styles.basisCaption}>{t('per_serving')}</Text>

      <View style={[styles.factsRow, facts.length < 3 && styles.factsRowLoose]}>
        {facts.map((fact) => (
          <View key={fact.key} style={styles.fact}>
            <Text style={styles.factValue} numberOfLines={1}>
              {fact.value}
              <Text style={styles.factUnit}> {fact.unit}</Text>
            </Text>
            <View style={styles.factLabelRow}>
              {fact.color ? <View style={[styles.factDot, { backgroundColor: fact.color }]} /> : null}
              <Text style={styles.factLabel} numberOfLines={1}>{fact.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {shares && (
        <View style={styles.sharesBar}>
          {shares.map((share) => (
            <View key={share.key} style={{ flex: share.kcal, backgroundColor: MACRO_COLORS[share.key] }} />
          ))}
        </View>
      )}

      {children}
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

  factsCard: {
    backgroundColor: '#F4F4F6',
    borderRadius: Radius.lg,
    padding: 14,
  },
  // Без заглавных: на телефоне с английским языком системы «Porsiyon»
  // превратилось бы в «PORSIYON» — без точки над I.
  basisCaption: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.textSecondary,
    paddingHorizontal: 4,
  },
  // Четыре столбца на всю ширину; на экране 360 «Karbonhidrat» и «1 250 kcal»
  // ещё помещаются, а если нет — подпись обрежется многоточием.
  factsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  // Один-два показателя не разъезжаются по краям, а стоят рядом.
  factsRowLoose: { justifyContent: 'flex-start', gap: 32 },
  fact: { flexShrink: 1, minWidth: 0 },
  factValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.4 },
  factUnit: { fontSize: 13, fontWeight: '700', letterSpacing: 0 },
  factLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  factDot: { width: 7, height: 7, borderRadius: 3.5 },
  factLabel: { flexShrink: 1, fontSize: 12.5, fontWeight: '500', color: Colors.textSecondary },
  sharesBar: {
    flexDirection: 'row',
    gap: 2,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 14,
    marginHorizontal: 4,
  },
});
