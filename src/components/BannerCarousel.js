import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  AppState,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius, Shadows } from '../core/theme';
import { usePromotionStore } from '../store/promotionStore';
import { PromoMedia } from './PromoMedia';
import { slideDurationMs } from '../utils/promo';

const { width: SW } = Dimensions.get('window');
const SLIDE_W = SW;                    // full-width page → clean paging snap
const CARD_H = Math.round(SW * 0.62);  // hero height — same 50/31 frame as the
                                       // website's phone layout
const CARD_W = SW - Spacing.md * 2;    // card sits inside marginHorizontal: Spacing.md
// Default when a promotion has no duration of its own.
const AUTOPLAY_MS = 6000;

// The admin frames each promo with a zoom + offset (in % of the frame), the
// same values the website applies as `translate(x%, y%) scale(s)`. Uploaded
// promos often carry a baked-in border that only this zoom hides, so skipping
// it leaves grey bands around the media. RN transforms take pixels here.
function frameTransform(promo) {
  const scale = Number(promo.imageScale) || 1;
  const x = Number(promo.imageOffsetX) || 0;
  const y = Number(promo.imageOffsetY) || 0;
  if (scale === 1 && !x && !y) return null;
  return {
    transform: [
      { translateX: (x / 100) * CARD_W },
      { translateY: (y / 100) * CARD_H },
      { scale },
    ],
  };
}

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

  // Home is a tab that stays mounted, so the mount fetch alone would keep
  // stale promos until a cold start. Refetch whenever the app returns to the
  // foreground so admin edits reach customers without restarting the app.
  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (prev.match(/inactive|background/) && next === 'active') loadPromotions();
      prev = next;
    });
    return () => sub.remove();
  }, [loadPromotions]);

  const slides = promotions.length ? promotions : FALLBACK;
  const count = slides.length;

  // A refetch can return fewer promos than before; don't point past the end.
  useEffect(() => {
    if (idx >= count) {
      setIdx(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [idx, count]);

  // Auto-advance, looping back to the first slide. A timeout per slide rather
  // than one fixed interval, because each promotion carries its own duration
  // (and a manual swipe now restarts the wait instead of inheriting whatever
  // was left of a shared tick).
  const currentDuration = slideDurationMs(slides[idx], AUTOPLAY_MS);
  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setTimeout(() => {
      const next = (idx + 1) % count;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIdx(next);
    }, currentDuration);
    return () => clearTimeout(id);
  }, [idx, count, currentDuration]);

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
        renderItem={({ item, index }) => {
          const { title, desc } = pickLang(item, lang);
          const badgeColor = item.badge ? BADGE_COLORS[item.badge] : null;
          return (
            <View style={styles.slide}>
              <View style={styles.card}>
                {item.imageUrl ? (
                  <PromoMedia
                    uri={item.imageUrl}
                    mediaType={item.mediaType}
                    paused={index !== idx}
                    style={[StyleSheet.absoluteFill, frameTransform(item)]}
                    muted
                    // "contain", like the website: the admin's zoom is tuned
                    // against the whole media fitted in the frame. "cover"
                    // pre-enlarges it, so a vertical video at zoom 3 came out
                    // ~8x bigger than on the site.
                    contentFit="contain"
                    resizeMode="contain"
                  />
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
