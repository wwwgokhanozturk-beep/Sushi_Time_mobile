import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';
import { useMenuStore } from '../store/menuStore';
import { useCartStore } from '../store/cartStore';
import { PrimaryButton } from '../components/SharedWidgets';
import { formatPrice } from '../utils/formatPrice';

const { width } = Dimensions.get('window');

export default function ItemDetailScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { itemId } = route.params;
  const items = useMenuStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addToCart);
  const [quantity, setQuantity] = useState(1);

  const item = items.find((i) => i._id === itemId);
  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={Typography.heading2}>Item not found</Text>
      </View>
    );
  }

  const price = formatPrice(item.price);
  const totalPrice = formatPrice(item.price * quantity);

  // Select description and ingredients based on current language
  const lang = i18n.language;
  const description = (lang === 'ru' && item.description_ru) ? item.description_ru
    : (lang === 'tr' && item.description_tr) ? item.description_tr
    : item.description;

  const ingredients = (lang === 'ru' && item.ingredients_ru?.length) ? item.ingredients_ru
    : (lang === 'tr' && item.ingredients_tr?.length) ? item.ingredients_tr
    : item.ingredients;

  const handleAdd = () => {
    for (let i = 0; i < quantity; i++) addToCart(item);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image section */}
        <View style={[styles.imageSection, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={styles.imageContainer}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={{ fontSize: 80 }}>🍣</Text>
              </View>
            )}
            {!item.isAvailable && (
              <View style={styles.soldOutBadge}>
                <Text style={styles.soldOutText}>{t('unavailable')}</Text>
              </View>
            )}
          </View>
          {/* Back button — поверх, в левом верхнем углу */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + Spacing.sm }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ fontSize: 22, color: '#1a1a1a', fontWeight: '700', marginTop: -1 }}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.titleRow}>
            <Text style={[Typography.heading2, { flex: 1 }]}>{item.name}</Text>
            <Text style={[Typography.price, { fontSize: 22 }]}>{price}</Text>
          </View>

          {/* Meta chips */}
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>⏱ {item.preparationTime} {t('min_label')}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>🔥 {item.calories} {t('cal_label')}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: Colors.primary + '20', borderColor: 'transparent' }]}>
              <Text style={[styles.metaText, { color: Colors.primary }]}>
                {t(`cat_${item.category.toLowerCase()}`, { defaultValue: item.category.charAt(0).toUpperCase() + item.category.slice(1) })}
              </Text>
            </View>
          </View>

          {description ? (
            <>
              <Text style={[Typography.heading3, { marginTop: Spacing.md }]}>{t('description')}</Text>
              <Text style={[Typography.body, { marginTop: Spacing.sm }]}>{description}</Text>
            </>
          ) : null}

          {ingredients?.length > 0 && (
            <>
              <Text style={[Typography.heading3, { marginTop: Spacing.md }]}>{t('ingredients')}</Text>
              <View style={styles.chipWrap}>
                {ingredients.map((ing, i) => (
                  <View key={i} style={styles.ingredientChip}>
                    <Text style={Typography.bodySmall}>{ing}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => quantity > 1 && setQuantity(quantity - 1)}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={Typography.heading3}>{quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <PrimaryButton
            label={`${t('add_to_cart')} • ${totalPrice}`}
            onPress={item.isAvailable ? handleAdd : undefined}
            disabled={!item.isAvailable}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Секция с фото: белый фон, отступы по бокам
  imageSection: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    position: 'relative',
  },
  // Контейнер фото — закруглённый со всех сторон
  imageContainer: {
    width: width - Spacing.md * 2,
    height: width - Spacing.md * 2,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.shimmerBase,
    ...Shadows.md,
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.shimmerBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutBadge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  soldOutText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.md + Spacing.sm,
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  details: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl + 4,
    borderTopRightRadius: Radius.xl + 4,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderBottomWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metaRow: { flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.sm },
  metaChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  metaText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  ingredientChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.lg + 10,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.divider,
    gap: Spacing.sm,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 24, fontWeight: '800', color: Colors.primary, marginTop: -2 },
});
