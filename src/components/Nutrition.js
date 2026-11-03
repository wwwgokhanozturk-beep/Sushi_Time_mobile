import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Radius } from '../core/theme';

// Калории, белки, жиры и углеводы на порцию — ресторан вводит их в админке.
// 0 значит «не заполнено», такое значение не показываем вовсе; блоку пищевой
// ценности нужно хотя бы одно заполненное.
export const hasNutritionFacts = (item) =>
  item?.calories > 0 || item?.protein > 0 || item?.fat > 0 || item?.carbs > 0;

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

// Цвет каждого показателя: точка у подписи и полоска под его столбцом.
const MACROS = ['protein', 'fat', 'carbs'];
const COLORS = { protein: '#10B981', fat: '#F59E0B', carbs: '#3B82F6', calories: '#EF4444' };

// Пищевая ценность на порцию из админки: белки, жиры, углеводы и калории, у
// каждого показателя свой цвет. Значения в меню — расчёт по составу и фото
// каждого блюда (2026-11-03), поэтому подпись называет их примерными.
// children — кнопки внизу карточки (в окне блюда это «Подробнее о блюде»).
export function NutritionFacts({ item, style, children }) {
  const { t, i18n } = useTranslation();
  if (!hasNutritionFacts(item)) return null;

  const lang = i18n.language;
  const facts = [
    ...MACROS.map((key) => item[key] > 0 && {
      key,
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

  return (
    <View style={[styles.factsCard, style]}>
      <Text style={styles.basisCaption}>{t('approx_per_serving')}</Text>

      <View style={styles.factsRow}>
        {facts.map((fact) => (
          <View key={fact.key} style={styles.fact}>
            <Text style={styles.factValue} numberOfLines={1}>
              {fact.value}
              <Text style={styles.factUnit}> {fact.unit}</Text>
            </Text>
            <View style={styles.factLabelRow}>
              <View style={[styles.factDot, { backgroundColor: COLORS[fact.key] }]} />
              <Text style={styles.factLabel} numberOfLines={1}>{fact.label}</Text>
            </View>
            <View style={[styles.factStripe, { backgroundColor: COLORS[fact.key] }]} />
          </View>
        ))}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
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
  // До четырёх столбцов на всю ширину: каждый шириной в свой текст плюс равная
  // доля остатка, так что полоски под ними заполняют ширину. На экране 360
  // «Karbonhidrat» и «1 250 kcal» ещё помещаются, а если нет — подпись
  // обрежется многоточием.
  factsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  fact: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  factValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.4 },
  factUnit: { fontSize: 13, fontWeight: '700', letterSpacing: 0 },
  factLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  factDot: { width: 7, height: 7, borderRadius: 3.5 },
  factLabel: { flexShrink: 1, fontSize: 12.5, fontWeight: '500', color: Colors.textSecondary },
  factStripe: { height: 6, borderRadius: 3, marginTop: 14 },
});
