import React, { useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Animated,
  Easing,
  PanResponder,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import CachedImage from './CachedImage';
import { NutritionFacts, hasNutritionFacts, servingLabel } from './Nutrition';
import { Allergens } from './Allergens';
import { useCartStore } from '../store/cartStore';
import { Colors, Spacing, Radius, Shadows } from '../core/theme';
import { formatPrice } from '../utils/formatPrice';
import { imageFrameTransform } from '../utils/imageFrame';
import { pickLocalized } from '../utils/localized';

// Окно «о блюде» одно на всё приложение (App.js). Открывают его кнопки «i» в
// строках меню через openDishInfo — им не нужно знать ни про модалку, ни про
// навигацию, а сами строки (memo) не перерисовываются.
const useDishInfo = create(() => ({ item: null }));
export const openDishInfo = (item) => useDishInfo.setState({ item });

const SCREEN_H = Dimensions.get('window').height;
const THUMB = 64;

export default function DishInfoSheet({ navigationRef }) {
  const { t } = useTranslation();
  const item = useDishInfo((s) => s.item);
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!item) return;
    translateY.setValue(SCREEN_H);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [item, translateY, fade]);

  // Окно сначала уезжает вниз и только потом убирается; after — что сделать
  // следом (открыть страницу блюда).
  const close = useCallback((after) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SCREEN_H, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      useDishInfo.setState({ item: null });
      after?.();
    });
  }, [translateY, fade]);

  // Смахнуть вниз за верхнюю часть окна (полоску и заголовок) — закрыть.
  const closeRef = useRef(close);
  closeRef.current = close;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 1.1) closeRef.current();
        else Animated.spring(translateY, { toValue: 0, bounciness: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () =>
        Animated.spring(translateY, { toValue: 0, bounciness: 0, useNativeDriver: true }).start(),
    })
  ).current;

  const openDetails = () => {
    const shown = item;
    close(() => navigationRef?.current?.navigate('ItemDetail', { itemId: shown._id, item: shown }));
  };

  const addToCart = () => {
    useCartStore.getState().addToCart(item);
    close();
  };

  return (
    <Modal
      visible={!!item}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => close()}
    >
      {/* Свой провайдер: отступы считаются для окна модалки, а не для экрана под ней */}
      <SafeAreaProvider>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => close()}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
          />
        </Animated.View>
        {item && (
          <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
            <SheetContent
              item={item}
              dragHandlers={pan.panHandlers}
              onClose={() => close()}
              onMore={openDetails}
              onAdd={addToCart}
            />
          </Animated.View>
        )}
      </SafeAreaProvider>
    </Modal>
  );
}

function SheetContent({ item, dragHandlers, onClose, onMore, onAdd }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const lang = i18n.language;

  const name = pickLocalized(item, 'name', lang);
  // Состав ресторан пишет в описании; если его нет — список ингредиентов.
  const blurb = pickLocalized(item, 'description', lang)
    || (pickLocalized(item, 'ingredients', lang) || []).join(', ');
  const serving = servingLabel(item, t, lang);
  const photo = item.thumbUrl || item.imageUrl;
  const facts = hasNutritionFacts(item);
  const hasDiscount = item.comparePrice && item.comparePrice > item.price;

  const moreButton = (
    <TouchableOpacity
      style={[styles.moreBtn, !facts && styles.moreBtnAlone]}
      onPress={onMore}
      activeOpacity={0.7}
    >
      <Text style={styles.moreText} numberOfLines={1}>{t('more_about_dish')}</Text>
      <Text style={styles.moreChevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View {...dragHandlers}>
        <View style={styles.handle} />
        <View style={styles.header}>
          {photo ? (
            <View style={styles.thumb}>
              <CachedImage
                uri={photo}
                style={[styles.thumbImage, { transform: imageFrameTransform(item, THUMB, THUMB) }]}
                contentFit="cover"
                cachePolicy="disk"
              />
            </View>
          ) : null}
          <View style={styles.headerText}>
            <Text style={styles.name}>{name}</Text>
            {serving ? <Text style={styles.serving}>{serving}</Text> : null}
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {blurb ? <Text style={styles.blurb}>{blurb}</Text> : null}

        {/* Аллергены — сразу за составом: значки, по нажатию — их названия */}
        <Allergens item={item} style={blurb ? styles.allergens : null} />

        {facts ? (
          <>
            <Text style={styles.sectionTitle}>{t('about_dish')}</Text>
            <NutritionFacts item={item}>{moreButton}</NutritionFacts>
          </>
        ) : (
          moreButton
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        {item.isAvailable ? (
          <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.85}>
            <Text style={styles.addLabel} numberOfLines={1}>{t('add_to_cart')}</Text>
            <View style={styles.addPriceRow}>
              {hasDiscount ? <Text style={styles.addOldPrice}>{formatPrice(item.comparePrice)}</Text> : null}
              <Text style={styles.addPrice}>{formatPrice(item.price)}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addBtn, styles.addBtnOff]}>
            <Text style={styles.addLabelOff}>{t('unavailable')}</Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...Shadows.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DADADF',
    marginTop: 8,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.shimmerBase,
  },
  thumbImage: { width: THUMB, height: THUMB },
  headerText: { flex: 1 },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 27,
  },
  serving: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary, marginTop: 3 },
  closeBtn: {
    alignSelf: 'flex-start',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  // Окно по высоте содержимого; длинный состав прокручивается внутри.
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: Spacing.sm },
  blurb: { fontSize: 15, lineHeight: 21, color: Colors.textSecondary },
  allergens: { marginTop: 14 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 22,
    marginBottom: 10,
  },
  moreBtn: {
    height: 48,
    marginTop: 16,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
  },
  // Без пищевой ценности кнопка стоит сама по себе, а не в серой карточке.
  moreBtnAlone: { backgroundColor: '#F4F4F6', marginTop: 18 },
  moreText: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  moreChevron: { fontSize: 22, fontWeight: '600', color: Colors.textLight, marginTop: -2 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  addBtn: {
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    ...Shadows.glow,
  },
  addLabel: { flexShrink: 1, fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  addPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginLeft: Spacing.md },
  addOldPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'line-through',
  },
  addPrice: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  addBtnOff: {
    justifyContent: 'center',
    backgroundColor: Colors.shimmerBase,
    shadowOpacity: 0,
    elevation: 0,
  },
  addLabelOff: { fontSize: 16, fontWeight: '700', color: Colors.textLight },
});
