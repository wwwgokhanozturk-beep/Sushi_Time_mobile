import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  PanResponder,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../core/theme';
import { usePromotionStore } from '../store/promotionStore';
import { PromoMedia } from './PromoMedia';

const { width: SW, height: SH } = Dimensions.get('window');
const STORY_DURATION = 5000;
const BUBBLE = 72;

const BADGE_COLORS = {
  HOT: '#EF4444',
  NEW: '#10B981',
  SALE: '#F59E0B',
  LIMITED: '#8B5CF6',
};

function fmtDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Full-screen story viewer ─────────────────────────────────────────────────
function StoryViewer({ visible, promotions, startIndex, lang, onClose, onMarkSeen }) {
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(startIndex);
  const progress = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const progressVal = useRef(0);
  const paused = useRef(false);

  // ── Swipe-to-dismiss pan responder ──────────────────────────────────────────
  const SWIPE_THRESHOLD = 80;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        paused.current = true;
        animRef.current?.stop();
      },
      onPanResponderMove: (_, g) => {
        translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dy) > SWIPE_THRESHOLD) {
          // Animate out then close
          Animated.timing(translateY, {
            toValue: g.dy > 0 ? SH : -SH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start(() => {
            paused.current = false;
            startAnim(progressVal.current);
          });
        }
      },
    })
  ).current;

  // Sync idx when a different bubble is tapped while already open
  useEffect(() => {
    if (visible) setIdx(startIndex);
  }, [startIndex, visible]);

  const stopAnim = () => {
    animRef.current?.stop();
    animRef.current = null;
  };

  const startAnim = (from = 0) => {
    progress.setValue(from);
    const duration = STORY_DURATION * (1 - from);
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished && !paused.current) advanceStory();
    });
  };

  useEffect(() => {
    if (!visible) { stopAnim(); return; }
    translateY.setValue(0);
    progressVal.current = 0;
    paused.current = false;
    startAnim(0);
    const id = progress.addListener(({ value }) => { progressVal.current = value; });
    return () => {
      progress.removeListener(id);
      stopAnim();
    };
  }, [idx, visible]);

  const advanceStory = () => {
    onMarkSeen(idx);
    if (idx < promotions.length - 1) {
      setIdx((p) => p + 1);
    } else {
      onClose();
    }
  };

  const goNext = () => advanceStory();
  const goPrev = () => { if (idx > 0) setIdx((p) => p - 1); };

  const onPressIn = () => {
    paused.current = true;
    stopAnim();
  };
  const onPressOut = () => {
    paused.current = false;
    startAnim(progressVal.current);
  };

  if (!visible || !promotions[idx]) return null;
  const promo = promotions[idx];
  const title = (lang === 'ru' && promo.title_ru) || (lang === 'tr' && promo.title_tr) || promo.title;
  const validTo = fmtDate(promo.validTo);
  const badgeColor = promo.badge ? BADGE_COLORS[promo.badge] : null;

  return (
    <Modal visible={visible} animationType="none" statusBarTranslucent transparent={true}>
      <StatusBar hidden />
      <Animated.View
        style={[sv.root, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >

        {/* ── Background media (image or video) ── */}
        {promo.imageUrl ? (
          <PromoMedia uri={promo.imageUrl} style={StyleSheet.absoluteFill} muted={false} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, sv.placeholder]}>
            <Text style={{ fontSize: 100 }}>🎉</Text>
          </View>
        )}
        <View style={sv.dim} />

        {/* ── Progress bars ── */}
        <View style={[sv.progressRow, { marginTop: insets.top + 6 }]}>
          {promotions.map((_, i) => (
            <View key={i} style={sv.track}>
              <Animated.View
                style={[
                  sv.fill,
                  {
                    width:
                      i < idx
                        ? '100%'
                        : i === idx
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* ── Tap zones (left = prev, right = next) ── */}
        <TouchableOpacity
          style={sv.tapLeft}
          activeOpacity={1}
          onPress={goPrev}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        />
        <TouchableOpacity
          style={sv.tapRight}
          activeOpacity={1}
          onPress={goNext}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        />

        {/* ── Close ── */}
        <TouchableOpacity
          style={[sv.closeBtn, { top: insets.top + 30 }]}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={sv.closeTxt}>✕</Text>
        </TouchableOpacity>

        {/* ── Content ── */}
        <View style={[sv.content, { paddingBottom: insets.bottom + 48 }]}>
          {promo.badge && (
            <View style={[sv.badge, { backgroundColor: badgeColor }]}>
              <Text style={sv.badgeTxt}>{promo.badge}</Text>
            </View>
          )}
          <Text style={sv.title}>{title}</Text>
          <View style={sv.metaRow}>
            {promo.discountPercent != null && (
              <View style={sv.chip}>
                <Text style={sv.chipTxt}>−{promo.discountPercent}%</Text>
              </View>
            )}
            {validTo && <Text style={sv.validTo}>до {validTo}</Text>}
          </View>
        </View>

        {/* ── Story counter ── */}
        <Text style={[sv.counter, { top: insets.top + 34 }]}>
          {idx + 1} / {promotions.length}
        </Text>
      </Animated.View>
    </Modal>
  );
}

// ─── Stories bubbles row ──────────────────────────────────────────────────────
export default function PromoCarousel() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'en';
  const { promotions, loadPromotions, loading } = usePromotionStore();
  const [open, setOpen] = useState(false);
  const [startIdx, setStartIdx] = useState(0);
  const [seen, setSeen] = useState(new Set());

  useEffect(() => { loadPromotions(); }, []);

  // Show skeleton bubbles while loading
  if (loading && promotions.length === 0) {
    return (
      <View style={[styles.wrapper, { paddingVertical: 8 }]}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 12, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ alignItems: 'center', gap: 4 }}>
              <View style={[styles.ring, { backgroundColor: '#2A2A2A', borderColor: '#333' }]} />
              <View style={{ width: 52, height: 10, borderRadius: 5, backgroundColor: '#2A2A2A' }} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (promotions.length === 0) return null;

  const openAt = (i) => { setStartIdx(i); setOpen(true); };
  const markSeen = (i) => setSeen((prev) => new Set([...prev, i]));

  return (
    <View style={styles.wrapper}>
      <FlatList
        data={promotions}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p._id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const isSeen = seen.has(index);
          const label =
            (lang === 'ru' && item.title_ru) ||
            (lang === 'tr' && item.title_tr) ||
            item.title;

          return (
            <TouchableOpacity style={styles.bubble} onPress={() => openAt(index)} activeOpacity={0.85}>
              {/* Gradient ring — outer = brand color, inner white border, image inside */}
              <View style={[styles.ring, isSeen && styles.ringSeen]}>
                <View style={styles.innerWrap}>
                  {item.imageUrl ? (
                    <PromoMedia uri={item.imageUrl} style={styles.bubbleImg} muted contentFit="cover" />
                  ) : (
                    <View style={styles.bubbleFallback}>
                      <Text style={{ fontSize: 30 }}>🎉</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.label, isSeen && styles.labelSeen]} numberOfLines={2}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <StoryViewer
        visible={open}
        promotions={promotions}
        startIndex={startIdx}
        lang={lang}
        onClose={() => setOpen(false)}
        onMarkSeen={markSeen}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sv = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  placeholder: { backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },

  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 4,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },

  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SW * 0.38,
    height: SH,
    zIndex: 5,
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: SW * 0.62,
    height: SH,
    zIndex: 5,
  },

  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  closeTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  counter: {
    position: 'absolute',
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    zIndex: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
  },

  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    marginBottom: 10,
  },
  badgeTxt: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  chipTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
  validTo: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
});

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: Spacing.sm,
  },
  list: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  bubble: {
    width: BUBBLE + 8,
    alignItems: 'center',
  },
  ring: {
    width: BUBBLE + 6,
    height: BUBBLE + 6,
    borderRadius: (BUBBLE + 6) / 2,
    padding: 3,
    backgroundColor: Colors.primary,
  },
  ringSeen: {
    backgroundColor: Colors.divider,
  },
  innerWrap: {
    flex: 1,
    borderRadius: BUBBLE / 2,
    borderWidth: 2,
    borderColor: Colors.background,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  bubbleImg: {
    width: '100%',
    height: '100%',
  },
  bubbleFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.shimmerBase,
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    width: BUBBLE + 8,
    lineHeight: 14,
  },
  labelSeen: {
    color: Colors.textLight,
  },
});
