import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  Platform,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '../core/theme';
import { useMenuStore } from '../store/menuStore';
import { useCartStore, selectTotalItems } from '../store/cartStore';
import { ErrorState, SkeletonMenuList } from '../components/SharedWidgets';
import SushiCard, { LIST_ROW_HEIGHT } from '../components/SushiCard';
import StickyCartButton from '../components/StickyCartButton';
import { groupByCategory } from '../utils/menuGrouping';
import BannerCarousel from '../components/BannerCarousel';
import DeliveryMinBanner from '../components/DeliveryMinBanner';
import AppHeader from '../components/AppHeader';
import CategoryRail, { buildCategoryEntries, RAIL_HEIGHT } from '../components/CategoryRail';

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Высота заголовка секции зафиксирована — вместе с фиксированной высотой
// карточки это даёт точный getItemLayout для всего списка.
const SECTION_H = 52;

// Пока шапка списка не измерена, берём приблизительную высоту: баннер +
// полоса «доставка/время/рейтинг» + поиск + рейл категорий.
const HEADER_H_GUESS = 520;

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { items, loading, error, loadMenu, hydrate, categoryOrder, categoryImages } = useMenuStore();
  const addToCart = useCartStore((s) => s.addToCart);
  const totalItems = useCartStore(selectTotalItems);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCat, setActiveCat] = useState(null);
  const [headerH, setHeaderH] = useState(HEADER_H_GUESS);
  const [topH, setTopH] = useState(0);          // высота шапки приложения над списком
  const [railPinned, setRailPinned] = useState(false);

  const listRef = useRef(null);
  const isClickScrollingRef = useRef(false);
  const clickTimeoutRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Сохранённое меню поднимается мгновенно, сеть догоняет фоном.
    hydrate().finally(() => loadMenu());
  }, []);

  useEffect(() => () => clearTimeout(clickTimeoutRef.current), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMenu();
    setRefreshing(false);
  }, [loadMenu]);

  const grouped = useMemo(
    () => groupByCategory(items, categoryOrder),
    [items, categoryOrder]
  );

  const catTitle = useCallback(
    (cat) => t(`cat_${cat.toLowerCase()}`, { defaultValue: capitalize(cat) }),
    [t]
  );

  const sectionCats = useMemo(() => grouped.map(([cat]) => cat), [grouped]);

  // Категории для круглой витрины: картинку берём из данных, а не из кода,
  // поэтому добавленная в админке категория появляется здесь автоматически.
  const railEntries = useMemo(
    () => buildCategoryEntries(sectionCats, items, categoryImages, catTitle),
    [sectionCats, items, categoryImages, catTitle]
  );

  // Секции разворачиваются в один плоский список: заголовок — такая же строка,
  // как товар. Это позволяет использовать обычный FlatList с getItemLayout —
  // список рисует только видимые строки, а позиции всех остальных знает точно.
  const rows = useMemo(() => {
    const out = [];
    for (const [cat, list] of grouped) {
      out.push({ type: 'h', key: `h:${cat}`, cat });
      for (const item of list) out.push({ type: 'i', key: `i:${item._id}`, item });
    }
    return out;
  }, [grouped]);

  // Абсолютные смещения строк в координатах контента (включая шапку списка) —
  // ровно то, чего ждёт FlatList.getItemLayout.
  const offsets = useMemo(() => {
    const out = new Array(rows.length);
    let y = headerH;
    for (let i = 0; i < rows.length; i++) {
      const length = rows[i].type === 'h' ? SECTION_H : LIST_ROW_HEIGHT;
      out[i] = { length, offset: y };
      y += length;
    }
    return out;
  }, [rows, headerH]);

  const getItemLayout = useCallback(
    (_, index) => {
      const e = offsets[index];
      return e ? { ...e, index } : { length: LIST_ROW_HEIGHT, offset: 0, index };
    },
    [offsets]
  );

  // Индекс строки-заголовка каждой категории — для перехода по клику.
  const headerIndexByCat = useMemo(() => {
    const map = new Map();
    rows.forEach((r, i) => { if (r.type === 'h') map.set(r.cat, i); });
    return map;
  }, [rows]);

  useEffect(() => {
    if (!sectionCats.length) return;
    if (!activeCat || !sectionCats.includes(activeCat)) setActiveCat(sectionCats[0]);
  }, [sectionCats, activeCat]);

  // Рейл прилипает к верху, как только уезжает из шапки списка.
  const pinThreshold = Math.max(headerH - RAIL_HEIGHT, 0);
  const pinnedOpacity = scrollY.interpolate({
    inputRange: [pinThreshold - 1, pinThreshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Scroll-spy: активной считаем последнюю категорию, чей заголовок ушёл под рейл.
  const onScrollSpy = useCallback(
    (e) => {
      const y = e.nativeEvent.contentOffset.y;

      const pinned = y >= pinThreshold;
      setRailPinned((prev) => (prev === pinned ? prev : pinned));

      if (isClickScrollingRef.current) return;
      const threshold = y + RAIL_HEIGHT + 8;
      let current = null;
      for (const [cat, idx] of headerIndexByCat) {
        if (offsets[idx] && offsets[idx].offset <= threshold) current = cat;
        else break;
      }
      if (!current) current = sectionCats[0];
      if (current && current !== activeCat) setActiveCat(current);
    },
    [pinThreshold, headerIndexByCat, offsets, sectionCats, activeCat]
  );

  // Обработчик пересоздавать нельзя: каждая пересборка Animated.event
  // переподписывает нативный слушатель скролла и даёт заметный рывок.
  const spyRef = useRef(onScrollSpy);
  spyRef.current = onScrollSpy;
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (e) => spyRef.current(e),
      }),
    [scrollY]
  );

  const scrollToCategory = useCallback(
    (cat) => {
      const index = headerIndexByCat.get(cat);
      if (index == null) return;
      setActiveCat(cat);
      isClickScrollingRef.current = true;
      // viewOffset поднимает заголовок ровно под прилипший рейл.
      listRef.current?.scrollToIndex({ index, animated: true, viewOffset: RAIL_HEIGHT });
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        isClickScrollingRef.current = false;
      }, 650);
    },
    [headerIndexByCat]
  );

  const openItem = useCallback(
    (item) => navigation.navigate('ItemDetail', { itemId: item._id, item }),
    [navigation]
  );

  const renderRow = useCallback(
    ({ item: row }) => {
      if (row.type === 'h') {
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{catTitle(row.cat)}</Text>
          </View>
        );
      }
      return (
        <SushiCard
          item={row.item}
          mode="list"
          onTap={() => openItem(row.item)}
          onAdd={() => addToCart(row.item)}
        />
      );
    },
    [catTitle, openItem, addToCart]
  );

  const listEmpty = useMemo(() => {
    if (error) return <ErrorState message={error} onRetry={loadMenu} />;
    if (loading) return <SkeletonMenuList count={5} />;
    return null;
  }, [error, loading, loadMenu]);

  const listHeader = useMemo(
    () => (
      <View onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h > 0) setHeaderH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
      }}>
        <BannerCarousel />

        {/* ─── Delivery info strip ─── */}
        <View style={styles.infoStrip}>
          <View style={[styles.infoChip, styles.infoChipWide]}>
            <Text style={{ fontSize: 16 }}>🚚</Text>
            <Text style={styles.infoChipText} numberOfLines={2}>{t('free_delivery')}</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={{ fontSize: 16 }}>⏱</Text>
            <Text style={styles.infoChipText} numberOfLines={2}>25-35 {t('min_label')}</Text>
          </View>
          <View style={[styles.infoChip, styles.infoChipNarrow]}>
            <Text style={{ fontSize: 16 }}>⭐</Text>
            <Text style={styles.infoChipText}>4.9</Text>
          </View>
        </View>

        {/* ─── Search: открывает меню с уже поднятой клавиатурой ─── */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Menu', { focusSearch: Date.now() })}
        >
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <Text style={styles.searchText} numberOfLines={1}>{t('search_hint')}</Text>
        </TouchableOpacity>

        <CategoryRail
          entries={railEntries}
          activeKey={activeCat}
          onSelect={scrollToCategory}
        />
      </View>
    ),
    [t, navigation, railEntries, activeCat, scrollToCategory]
  );

  return (
    <View style={styles.container}>
      <View
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          setTopH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
        }}
      >
        <AppHeader />
        {/* Delivery minimum for the detected district — shown before the cart */}
        <DeliveryMinBanner />
      </View>

      <Animated.FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        getItemLayout={getItemLayout}
        ListHeaderComponent={listHeader}
        // Баннер, поиск и категории остаются на экране, пока грузится меню:
        // скелет занимает только место списка, а не всю страницу.
        ListEmptyComponent={listEmpty}
        ListFooterComponent={<View style={{ height: totalItems > 0 ? 84 : Spacing.xl }} />}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Окна подобраны под фиксированную высоту строки: рисуем примерно
        // два экрана вокруг видимой области — этого хватает, чтобы при обычном
        // скролле не появлялись пустые места, и не хватает, чтобы просесть.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        // На iOS этот флаг иногда «съедает» строки при быстром скролле,
        // поэтому включаем его только там, где он реально помогает.
        removeClippedSubviews={Platform.OS === 'android'}
        onScrollToIndexFailed={() => {}}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      />

      {/* Рейл, прилипший к верху: появляется, когда исходный уехал за экран. */}
      <Animated.View
        pointerEvents={railPinned ? 'auto' : 'none'}
        style={[styles.pinnedRail, { top: topH, opacity: pinnedOpacity }]}
      >
        <CategoryRail
          entries={railEntries}
          activeKey={activeCat}
          onSelect={scrollToCategory}
        />
      </Animated.View>

      <StickyCartButton onPress={() => navigation.navigate('Cart')} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Info strip ──
  infoStrip: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  // Три равные доли не подходят: «Ücretsiz teslimat» и «Бесплатная доставка»
  // длиннее рейтинга в разы. Доли распределены по длине текста (как на сайте),
  // а сам текст может встать в две строки — на русском одной строки не хватает
  // даже широкой доле, а обрезать «Бесплатная доста…» нельзя.
  infoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    gap: 8,
  },
  infoChipWide: {
    flex: 1.35,
  },
  infoChipNarrow: {
    flex: 0.7,
  },
  infoChipText: {
    fontSize: 12.5,
    lineHeight: 15,
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

  // ── Pinned category rail ──
  pinnedRail: {
    position: 'absolute',
    left: 0,
    right: 0,
  },

  // ── Product list ──
  sectionHeader: {
    height: 52,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },

});
