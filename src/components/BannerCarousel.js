import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIsFocused } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadows } from '../core/theme';
import { usePromotionStore } from '../store/promotionStore';
import { PromoMedia } from './PromoMedia';
import MediaSkeleton from './MediaSkeleton';
import { pickLocalized } from '../utils/localized';
import { safeScroll } from '../utils/safeScroll';

const { width: SW } = Dimensions.get('window');
const SLIDE_W = SW;                    // full-width page → clean paging snap

// Пропорция карточки снята с sushitimetr.com: при ширине окна 591 баннер
// занимает 535×310, то есть 1.726:1.
//
// Раньше высота считалась от ширины ЭКРАНА (SW * 0.52) и не учитывала боковые
// поля — карточка выходила площе сайта, и баннер на телефоне читался мельче.
// Считаем от ширины самой карточки: тогда пропорция одна и та же на web, iOS
// и Android при любой ширине экрана, а не «примерно похожая».
const H_MARGIN = Spacing.md;
const CARD_W = SW - H_MARGIN * 2;
const CARD_ASPECT = 535 / 310;
const CARD_H = Math.round(CARD_W / CARD_ASPECT);

// Сколько держится один слайд. Значение приходит с сервера (админ задаёт его
// в панели), это — запасное на случай, если настройка ещё не сохранена.
const DEFAULT_AUTOPLAY_MS = 6000;

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

// Длительность показа слайда. Админ задаёт её в секундах у каждой акции;
// значение вне разумных границ (или пустое) игнорируем — иначе опечатка вроде
// «0» или «3600» превращает карусель в мигалку или вешает её навсегда.
const MIN_SLIDE_SEC = 2;
const MAX_SLIDE_SEC = 60;

function slideDurationMs(slide) {
  const sec = Number(slide?.durationSec);
  if (!Number.isFinite(sec) || sec < MIN_SLIDE_SEC || sec > MAX_SLIDE_SEC) {
    return DEFAULT_AUTOPLAY_MS;
  }
  return Math.round(sec * 1000);
}

function pickLang(promo, lang) {
  return {
    title: pickLocalized(promo, 'title', lang),
    desc: pickLocalized(promo, 'description', lang),
  };
}

function BannerCarousel() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'en';
  const { promotions, loading, loadPromotions, hydrate } = usePromotionStore();
  const listRef = useRef(null);
  const [idx, setIdx] = useState(0);
  // Home живёт во вкладке и остаётся смонтированным, когда пользователь ушёл
  // в «Меню». Работающий за кадром видеодекодер — дефицитный ресурс Android:
  // пока он занят, тяжёлый список меню отрисовывается на грани, и система
  // вправе убить процесс. Вне фокуса плеер ставим на паузу.
  const isFocused = useIsFocused();

  useEffect(() => {
    // Сначала поднимаем сохранённые акции (мгновенно), потом освежаем из сети.
    hydrate().finally(loadPromotions);
  }, []);

  const slides = promotions.length ? promotions : FALLBACK;
  const count = slides.length;

  // Пока ничего не пришло и кеш пуст — держим скелет ровно того же размера,
  // что и баннер, чтобы контент под ним не прыгал при появлении карусели.
  const showSkeleton = loading && !promotions.length;

  // Auto-advance, looping back to the first slide.
  //
  // Сколько висит именно этот слайд. Раньше интервал был один на всю карусель:
  // пятисекундный ролик и пятнадцатисекундный получали одинаковые 6 секунд —
  // первый успевал зациклиться, второй обрывался на середине. Теперь длительность
  // задаёт админ у каждой акции (`durationSec`), а константа остаётся запасной.
  const slideMs = slideDurationMs(slides[idx]);

  // Таймер — одноразовый setTimeout, который перевзводится при смене слайда:
  // интервал не умеет менять шаг под каждую акцию.
  //
  // `isFocused` в зависимостях — не косметика. Home живёт во вкладке и остаётся
  // смонтированным, когда пользователь ушёл в «Меню» или «Профиль». Раньше
  // таймер продолжал крутить слайды в фоне: `idx` смещался каждые 6 секунд,
  // вместе с ним ехало окно живых слайдов, и плееры пересоздавались бесконечно.
  // Каждый ExoPlayer — это буферы в Java-куче и декодер в графической памяти,
  // поэтому приложение постоянно пилило 110↔255 МБ при лимите кучи 256 МБ.
  // Достаточно было проскроллить меню, чтобы добрать недостающее — и процесс
  // падал с OutOfMemoryError в случайном потоке.
  useEffect(() => {
    if (count <= 1 || !isFocused) return undefined;
    const id = setTimeout(() => {
      const next = (idx + 1) % count;
      setIdx(next);
      safeScroll(() => listRef.current?.scrollToIndex({ index: next, animated: true }));
    }, slideMs);
    return () => clearTimeout(id);
  }, [count, isFocused, idx, slideMs]);

  const onMomentumEnd = useCallback((e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SLIDE_W);
    if (i !== idx) setIdx(i);
  }, [idx]);

  const getItemLayout = (_, i) => ({ length: SLIDE_W, offset: SLIDE_W * i, index: i });

  if (showSkeleton) {
    return (
      <View style={styles.wrap}>
        <MediaSkeleton style={styles.card} radius={Radius.xl} />
      </View>
    );
  }

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
        // На Android FlatList по умолчанию включает removeClippedSubviews.
        // Внутри слайдов живёт expo-video: отцепление живого VideoView от
        // родителя роняет процесс без JS-ошибки. Явно выключаем.
        removeClippedSubviews={false}
        renderItem={({ item, index }) => {
          const { title, desc } = pickLang(item, lang);
          const badgeColor = item.badge ? BADGE_COLORS[item.badge] : null;
          // Видеодекодер выделяется на КАЖДЫЙ смонтированный плеер, а `paused`
          // его не освобождает: остановленный ExoPlayer продолжает держать
          // буферы. Поэтому живым делаем ровно один слайд — тот, что на экране,
          // и только пока вкладка в фокусе. Соседи показывают скелет.
          //
          // Раньше здесь было окно ±1 (три плеера разом). Втроём они держали
          // кучу у самого потолка, и любое лишнее выделение памяти — скролл
          // меню, смена языка — роняло процесс.
          const live = isFocused && index === idx;
          return (
            <View style={styles.slide}>
              <View style={styles.card}>
                {item.imageUrl && live ? (
                  <PromoMedia
                    uri={item.imageUrl}
                    posterUrl={item.posterUrl}
                    mediaType={item.mediaType}
                    paused={false}
                    style={StyleSheet.absoluteFill}
                    muted
                    contentFit="cover"
                  />
                ) : item.imageUrl ? (
                  <MediaSkeleton style={StyleSheet.absoluteFill} radius={0} showLogo={false} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: item.color || Colors.primary }]}>
                    <Text style={{ fontSize: 64 }}>{item.emoji || '🍣'}</Text>
                  </View>
                )}

                {/* Затемнение — только когда поверх медиа есть текст.
                    Без этого условия имиджевые баннеры без подписи выглядели
                    приглушёнными, будто у экрана убавили яркость. */}
                {(title || desc) && <View style={styles.overlay} />}

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

// Шапка Home перерисовывается при смене активной категории; баннер от этого
// не зависит и пересобираться не должен.
export default memo(BannerCarousel);

const styles = StyleSheet.create({
  wrap: {
    paddingTop: Spacing.sm,
  },
  slide: {
    width: SLIDE_W,
  },
  card: {
    height: CARD_H,
    marginHorizontal: H_MARGIN,
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
