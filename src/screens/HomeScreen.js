import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';
import { useMenuStore } from '../store/menuStore';
import { useCartStore, selectTotalItems } from '../store/cartStore';
import { ErrorState } from '../components/SharedWidgets';
import SushiCard from '../components/SushiCard';
import PromoCarousel from '../components/PromoCarousel';

// Sushi-first ordering: Sets → Rolls → Nigiri/Sashimi → snacks → … → drinks last.
const categoryPriority = (cat) => {
  const c = (cat || '').toLowerCase();
  if (c === 'sets') return 0;
  if (['rolls', 'maki', 'uramaki', 'hosomaki'].includes(c)) return 1;
  if (['nigiri', 'sashimi', 'gunkan', 'onigiri'].includes(c)) return 2;
  if (c === 'tempura') return 3;
  if (['appetizers', 'salads'].includes(c)) return 4;
  if (c === 'soups') return 5;
  if (['wok', 'noodles'].includes(c)) return 6;
  if (['pizza', 'fast_food'].includes(c)) return 7;
  if (c === 'desserts') return 8;
  if (c === 'drinks') return 9;
  return 10;
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { items, loading, error, loadMenu } = useMenuStore();
  const addToCart = useCartStore((s) => s.addToCart);
  const totalItems = useCartStore(selectTotalItems);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCat, setActiveCat] = useState(null);

  const scrollRef = useRef(null);
  const chipListRef = useRef(null);
  const sectionYRef = useRef({});
  const barHeightRef = useRef(56);
  const isClickScrollingRef = useRef(false);
  const clickTimeoutRef = useRef(null);

  useEffect(() => {
    loadMenu();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMenu();
    setRefreshing(false);
  }, []);

  // Group items by category, ordered sushi-first. Works for both "All"
  // (every category shown) and a single selected category (one group).
  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = it.category || 'other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return [...map.entries()].sort(([a], [b]) => categoryPriority(a) - categoryPriority(b));
  }, [items]);

  const catTitle = (cat) =>
    t(`cat_${cat.toLowerCase()}`, { defaultValue: capitalize(cat) });

  // Chips track the real sections on screen (sushi-first), so scroll-spy can
  // map a scroll position to a chip. No "All" — tapping scrolls to a section.
  const sectionCats = useMemo(() => grouped.map(([cat]) => cat), [grouped]);

  // Default the active chip to the first section, recover if it disappears.
  useEffect(() => {
    if (!sectionCats.length) return;
    if (!activeCat || !sectionCats.includes(activeCat)) setActiveCat(sectionCats[0]);
  }, [sectionCats, activeCat]);

  // Scroll-spy: mark the topmost section that has crossed under the chip bar.
  const onScroll = (e) => {
    if (isClickScrollingRef.current) return;
    const y = e.nativeEvent.contentOffset.y;
    const threshold = y + barHeightRef.current + 8;
    let current = sectionCats[0];
    for (const cat of sectionCats) {
      const sy = sectionYRef.current[cat];
      if (sy == null) continue;
      if (sy - threshold <= 0) current = cat;
      else break;
    }
    if (current && current !== activeCat) setActiveCat(current);
  };

  // Keep the active chip centered in the horizontal rail.
  useEffect(() => {
    if (!activeCat) return;
    const idx = sectionCats.indexOf(activeCat);
    if (idx >= 0) {
      chipListRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5, animated: true });
    }
  }, [activeCat, sectionCats]);

  const scrollToCategory = (cat) => {
    const sy = sectionYRef.current[cat];
    if (sy == null) return;
    setActiveCat(cat);
    isClickScrollingRef.current = true;
    scrollRef.current?.scrollTo({
      y: Math.max(sy - barHeightRef.current - 8, 0),
      animated: true,
    });
    clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 700);
  };

  return (
    <View style={styles.container}>
      {/* ─── Fixed Header ─── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>🌐</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[3]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* ─── Promo Carousel ─── */}
        <PromoCarousel />

        {/* ─── Delivery info strip ─── */}
        <View style={styles.infoStrip}>
          <View style={styles.infoChip}>
            <Text style={{ fontSize: 16 }}>🚴</Text>
            <Text style={styles.infoChipText} numberOfLines={1}>{t('free_delivery')}</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={{ fontSize: 16 }}>⏱</Text>
            <Text style={styles.infoChipText} numberOfLines={1}>25-35 {t('min_label')}</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={{ fontSize: 16 }}>⭐</Text>
            <Text style={styles.infoChipText}>4.8</Text>
          </View>
        </View>

        {/* ─── Search bar ─── */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Menu')}
        >
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <Text style={styles.searchText} numberOfLines={1}>{t('search_hint')}</Text>
        </TouchableOpacity>

        {/* ─── Categories (pinned to top; tracks scroll position) ─── */}
        <View
          style={sectionCats.length > 1 ? styles.stickyCatBar : null}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0) barHeightRef.current = h;
          }}
        >
          {sectionCats.length > 1 && (
          <FlatList
            ref={chipListRef}
            horizontal
            data={sectionCats}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catList}
            keyExtractor={(item) => item}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item: cat }) => {
              const isSelected = activeCat === cat;
              return (
                <TouchableOpacity
                  style={[styles.catChip, isSelected && styles.catChipSelected]}
                  onPress={() => scrollToCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.catChipText, isSelected && styles.catChipTextSelected]}
                    numberOfLines={1}
                  >
                    {catTitle(cat)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
          )}
        </View>

        {/* ─── Full menu, grouped by category (sushi first) ─── */}
        {error ? (
          <ErrorState message={error} onRetry={loadMenu} />
        ) : loading && items.length === 0 ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          grouped.map(([cat, list]) => (
            <View
              key={cat}
              style={styles.listSection}
              onLayout={(e) => {
                sectionYRef.current[cat] = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.sectionTitle}>{catTitle(cat)}</Text>
              {list.map((item) => (
                <SushiCard
                  key={item._id}
                  item={item}
                  mode="list"
                  onTap={() => navigation.navigate('ItemDetail', { itemId: item._id })}
                  onAdd={() => addToCart(item)}
                />
              ))}
            </View>
          ))
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* ─── Sticky Cart ─── */}
      {totalItems > 0 && (
        <TouchableOpacity
          style={styles.stickyCart}
          onPress={() => navigation.navigate('Cart')}
          activeOpacity={0.9}
        >
          <Text style={styles.stickyCartText} numberOfLines={1}>
            {t('view_cart', { count: totalItems })}
          </Text>
          <Text style={styles.stickyCartArrow}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  cartBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  cartBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },




  // ── Info strip ──
  infoStrip: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  infoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    gap: 8,
  },
  infoChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    flexShrink: 1,
  },

  // ── Search ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    height: 54,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  searchText: {
    marginLeft: Spacing.sm,
    fontSize: 15,
    color: Colors.textSecondary,
    flexShrink: 1,
    fontWeight: '500',
  },

  // ── Categories ──
  // Frosted bar so menu rows don't show through when it pins to the top.
  stickyCatBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    ...Shadows.sm,
  },
  catList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  catChip: {
    height: 40,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  catChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
    ...Shadows.glow,
  },
  catChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  catChipTextSelected: {
    color: '#FFFFFF',
  },

  // ── Product list ──
  listSection: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },

  // ── Sticky cart ──
  stickyCart: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.md,
    right: Spacing.md,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  stickyCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  stickyCartArrow: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
});
