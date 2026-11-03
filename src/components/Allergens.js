import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Radius } from '../core/theme';

// Аллергены по списку ЕС / Türk Gıda Kodeksi в порядке регламента — коды в
// поле `allergens` блюда.
export const ALLERGENS = ['gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk', 'nuts',
  'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs'];

// Те же значки, что на сайте, но картинками: для SVG нужен react-native-svg,
// а это новая сборка в сторы. Чёрные линии на прозрачном, цвет — prop tintColor.
const ICONS = {
  gluten: require('../../assets/allergens/gluten.png'),
  crustaceans: require('../../assets/allergens/crustaceans.png'),
  eggs: require('../../assets/allergens/eggs.png'),
  fish: require('../../assets/allergens/fish.png'),
  peanuts: require('../../assets/allergens/peanuts.png'),
  soy: require('../../assets/allergens/soy.png'),
  milk: require('../../assets/allergens/milk.png'),
  nuts: require('../../assets/allergens/nuts.png'),
  celery: require('../../assets/allergens/celery.png'),
  mustard: require('../../assets/allergens/mustard.png'),
  sesame: require('../../assets/allergens/sesame.png'),
  sulphites: require('../../assets/allergens/sulphites.png'),
  lupin: require('../../assets/allergens/lupin.png'),
  molluscs: require('../../assets/allergens/molluscs.png'),
};

// Аллергены блюда в порядке регламента; незнакомые коды пропускаем. Пустой
// список — не заполнено, и блок не показываем.
export const dishAllergens = (item) => ALLERGENS.filter((code) => item?.allergens?.includes(code));

// Карточка аллергенов: ряд значков; по нажатию вместо них — названия и
// примечание про следы и соевый соус к суши.
// showTitle={false} — когда заголовок раздела уже стоит над карточкой.
export function Allergens({ item, style, showTitle = true }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const list = dishAllergens(item);
  if (!list.length) return null;

  return (
    <View style={[styles.card, style]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.head}>
          {showTitle ? <Text style={styles.title}>{t('allergens_title')}</Text> : null}
          <View style={styles.hintRow}>
            <Text style={styles.hint}>{t(open ? 'allergens_hide' : 'allergens_show')}</Text>
            <Text style={[styles.chevron, { transform: [{ rotate: open ? '-90deg' : '90deg' }] }]}>›</Text>
          </View>
        </View>
        {open ? (
          <View style={styles.legend}>
            {list.map((code) => (
              <View key={code} style={styles.legendItem}>
                <View style={[styles.chip, styles.chipSmall]}>
                  <Image source={ICONS[code]} style={styles.iconSmall} tintColor={ACCENT} />
                </View>
                <Text style={styles.legendName}>{t(`allergen_${code}`)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.chips}>
            {list.map((code) => (
              <View key={code} style={styles.chip} accessibilityLabel={t(`allergen_${code}`)}>
                <Image source={ICONS[code]} style={styles.icon} tintColor={ACCENT} />
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
      {open ? <Text style={styles.note}>{t('allergens_note')}</Text> : null}
    </View>
  );
}

const ACCENT = '#C2410C';

const styles = StyleSheet.create({
  // Тёплый оттенок рядом с серой карточкой БЖУ: аллергены — предупреждение.
  card: { backgroundColor: '#FFF4EA', borderRadius: Radius.lg, padding: 14 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  // Без заглавных — как подпись карточки БЖУ.
  title: { flex: 1, fontSize: 13.5, fontWeight: '700', color: Colors.textSecondary },
  hintRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  hint: { fontSize: 13, fontWeight: '700', color: ACCENT },
  chevron: { fontSize: 17, lineHeight: 18, fontWeight: '700', color: ACCENT, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.14,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  chipSmall: { width: 30, height: 30, borderRadius: 15 },
  icon: { width: 20, height: 20 },
  iconSmall: { width: 17, height: 17 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, marginTop: 12 },
  legendItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  legendName: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  note: { marginTop: 12, marginHorizontal: 4, fontSize: 12.5, lineHeight: 18, color: Colors.textSecondary },
});
