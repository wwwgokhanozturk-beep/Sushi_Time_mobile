import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius, Shadows } from '../core/theme';
import { usePromotionStore } from '../store/promotionStore';
import { PromoMedia } from './PromoMedia';

const { width: SW } = Dimensions.get('window');
const SLIDE_W = SW;                    // full-width page → clean paging snap
const CARD_H = Math.round(SW * 0.52);  // hero height (~3:1.9 on a phone)
const AUTOPLAY_MS = 6000;

const BADGE_COLORS = {
  HOT: '#EF4444',
  NEW: '#10B981',
  SALE: '#F59E0B',
  LIMITED: '#8B5CF6',
};

// Shown when there are no active promotions yet, so the hero is never empty —
// mirrors the website's BannerCarousel fallback slides.
const FALLBACK = [
  { _id: '__b1', title: 'Свежие суши с доставкой', description: 'Готовим из охлаждённой рыбы и привозим за 30 минут', badge: 'NEW', color: '#E8181B', emoji: '🍣' },
  { _id: '__b2', title: 'Бесплатная доставка', description: 'При заказе от 25 — доставим бесплатно по городу', badge: 'HOT', color: '#FF6B35', emoji: '🚚' },
  { _id: '__b3', title: 'Скидка на сет', description: 'Закажи сет и получи фирменный ролл бесплатно', badge: 'SALE', discountPercent: 20, color: '#8B5CF6', emoji: '🎁' },
];

function pickLang(promo, lang) {
  const title =
    (lang === 'ru' && promo.title_ru) ||
    (lang === 'tr' && promo.title_tr) ||
    promo.title;
  const desc =
    (lang === 'ru' && promo.description_ru) ||
    (lang === 'tr' && promo.description_tr) ||
    promo.description;
  return { title, desc };
}

export default function BannerCarousel() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'en';
  const { promotions, loadPromotions } = usePromotionStore();
  const listRef = useRef(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => { loadPromotions(); }, []);

  const slides = promotions.length ? promotions : FALLBACK;
  const count = slides.length;

  // Auto-advance, looping back to the first slide.
  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setInterval(() => {
      setIdx((prev) => {
        const next = (prev + 1) % count;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count]);

  const onMomentumEnd = useCallback((e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SLIDE_W);
    if (i !== idx) setIdx(i);
  }, [idx]);

  const getItemLayout = (_, i) => ({ length: SLIDE_W, offset: SLIDE_W * i, index: i });

  if (!count) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p._id}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={onMomentumEnd}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => {
          const { title, desc } = pickLang(item, lang);
          const badgeColor = item.badge ? BADGE_COLORS[item.badge] : null;
          return (
            <View style={styles.slide}>
              <View style={styles.card}>
                {item.imageUrl ? (
                  <PromoMedia uri={item.imageUrl} style={StyleSheet.absoluteFill} muted contentFit="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: item.color || Colors.primary }]}>
                    <Text style={{ fontSize: 64 }}>{item.emoji || '🍣'}</Text>
                  </View>
                )}

                {/* Dark veil for legible text over any image/video */}
                <View style={styles.overlay} />

                <View style={styles.content}>
                  {item.badge && (
                    <View style={[styles.badge, { backgroundColor: badgeColor || Colors.primary }]}>
                      <Text style={styles.badgeTxt}>{item.badge}</Text>
                    </View>
                  )}
                  {title ? <Text style={styles.title} numberOfLines={2}>{title}</Text> : null}
                  {desc ? <Text style={styles.desc} numberOfLines={2}>{desc}</Text> : null}
                  {item.discountPercent != null && (
                    <View style={styles.chip}>
                      <Text style={styles.chipTxt}>−{item.discountPercent}%</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {count > 1 && (
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: Spacing.sm,
  },
  slide: {
    width: SLIDE_W,
  },
  card: {
    height: CARD_H,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.primaryLight,
    ...Shadows.sm,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  content: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    top: 0,
    width: '72%',
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  desc: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginTop: 2,
  },
  chipTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: Colors.divider,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },
});
