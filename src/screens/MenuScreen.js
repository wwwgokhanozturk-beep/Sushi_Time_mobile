import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';
import { useMenuStore } from '../store/menuStore';
import { useCartStore, selectTotalItems } from '../store/cartStore';
import { EmptyState, ErrorState, SkeletonMenuList } from '../components/SharedWidgets';
import SushiCard from '../components/SushiCard';

// Sets → Rolls / Sushi → Snacks → Drinks  (mirrors web_client MenuPage)
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

const SECTION_HEADER_OFFSET = 8;

export default function MenuScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { items, loading, error, loadMenu, categoryOrder } = useMenuStore();
  const addToCart = useCartStore((s) => s.addToCart);
  const totalItems = useCartStore(selectTotalItems);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeCat, setActiveCat] = useState(null);

  const sectionListRef = useRef(null);
  const chipListRef = useRef(null);
  const isClickScrollingRef = useRef(false);
  const clickScrollTimeoutRef = useRef(null);
  const pendingScrollRef = useRef(null);

  useEffect(() => {
    loadMenu();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMenu();
    setRefreshing(false);
  }, []);

  // Group items by category in the desired priority order → SectionList sections.
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filteredItems = q
      ? items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            (i.category || '').toLowerCase().includes(q)
        )
      : items;

    const map = new Map();
    for (const it of filteredItems) {
      const key = (it.category || 'other').toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    // Внутри категории — порядок из админки (sortOrder)
    for (const arr of map.values()) arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const orderIndex = (cat) => {
      const i = categoryOrder.indexOf((cat || '').toLowerCase());
      return i === -1 ? Infinity : i;
    };
    return [...map.entries()]
      .sort(([a], [b]) => {
        const oa = orderIndex(a);
        const ob = orderIndex(b);
        if (oa !== ob) return oa - ob;
        return categoryPriority(a) - categoryPriority(b);
      })
      .map(([cat, data]) => ({ title: cat, data }));
  }, [items, query, categoryOrder]);

  const chipCats = useMemo(() => sections.map((s) => s.title), [sections]);

  const totalCount = useMemo(
    () => sections.reduce((n, s) => n + s.data.length, 0),
    [sections]
  );

  const catLabel = useCallback(
    (cat) =>
      t(`cat_${cat}`, {
        defaultValue: cat.charAt(0).toUpperCase() + cat.slice(1),
      }),
    [t]
  );

  // Default the active chip to the first section, and recover when the current
  // one is filtered out by search.
  useEffect(() => {
    if (!chipCats.length) return;
    if (!activeCat || !chipCats.includes(activeCat)) setActiveCat(chipCats[0]);
  }, [chipCats, activeCat]);

  // Scroll-spy: as sections scroll past, mark the topmost visible one active.
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (isClickScrollingRef.current) return;
    const first = viewableItems.find((v) => v.section);
    const title = first?.section?.title;
    if (title) setActiveCat((prev) => (prev === title ? prev : title));
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 10,
    minimumViewTime: 50,
  }).current;

  // Keep the active chip visible inside the horizontal rail.
  useEffect(() => {
    if (!activeCat) return;
    const idx = chipCats.indexOf(activeCat);
    if (idx >= 0) {
      chipListRef.current?.scrollToIndex({
        index: idx,
        viewPosition: 0.5,
        animated: true,
      });
    }
  }, [activeCat, chipCats]);

  const scrollToCategory = (cat) => {
    const sectionIndex = sections.findIndex((s) => s.title === cat);
    if (sectionIndex < 0) return;
    setActiveCat(cat);
    isClickScrollingRef.current = true;
    pendingScrollRef.current = { sectionIndex, itemIndex: 0 };
    sectionListRef.current?.scrollToLocation({
      sectionIndex,
      itemIndex: 0,
      viewOffset: SECTION_HEADER_OFFSET,
      animated: true,
    });
    clearTimeout(clickScrollTimeoutRef.current);
    clickScrollTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 700);
  };

  // SectionList has no getItemLayout, so a jump to a far, unmeasured section can
  // fail the first time — retry once enough frames are measured.
  const onSectionScrollToIndexFailed = () => {
    const target = pendingScrollRef.current;
    if (!target) return;
    setTimeout(() => {
      sectionListRef.current?.scrollToLocation({
        ...target,
        viewOffset: SECTION_HEADER_OFFSET,
        animated: true,
      });
    }, 120);
  };

  const renderItem = ({ item }) => (
    <SushiCard
      item={item}
      mode="list"
      onTap={() => navigation.navigate('ItemDetail', { itemId: item._id })}
      onAdd={() => addToCart(item)}
    />
  );

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{catLabel(section.title)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.brandTitle}>Sushi Time</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => {
              const next = { en: 'ru', ru: 'tr', tr: 'en' };
              i18n.changeLanguage(next[i18n.language] || 'en');
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>🌐</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('search_menu')}
          placeholderTextColor={Colors.textLight}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
            <Text style={{ fontSize: 16, color: Colors.textLight }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sticky category chip bar */}
      {chipCats.length > 1 && (
        <FlatList
          ref={chipListRef}
          horizontal
          data={chipCats}
          showsHorizontalScrollIndicator={false}
          style={styles.catListWrapper}
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
                  {catLabel(cat)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* List */}
      <View style={{ flex: 1 }}>
        {error ? (
          <ErrorState message={error} onRetry={loadMenu} />
        ) : loading && items.length === 0 ? (
          <SkeletonMenuList count={6} />
        ) : totalCount === 0 && !loading ? (
          <EmptyState title={t('no_items_found')} subtitle={t('try_different')} emoji="🔎" />
        ) : (
          <SectionList
            ref={sectionListRef}
            sections={sections}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScrollToIndexFailed={onSectionScrollToIndexFailed}
            contentContainerStyle={{
              paddingTop: Spacing.xs,
              paddingBottom: totalItems > 0 ? 90 : Spacing.lg,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
          />
        )}
      </View>

      {/* Sticky cart button */}
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  brandTitle: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  headerIcons: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    height: 54,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  catListWrapper: {
    flexGrow: 0,
    flexShrink: 0,
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
  catChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark, ...Shadows.glow },
  catChipText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  catChipTextSelected: { color: '#fff' },
  sectionHeader: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
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
