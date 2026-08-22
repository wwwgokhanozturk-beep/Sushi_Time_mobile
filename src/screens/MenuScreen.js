import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '../core/theme';
import { useMenuStore } from '../store/menuStore';
import { useCartStore, selectTotalItems } from '../store/cartStore';
import { EmptyState, ErrorState, SkeletonMenuList } from '../components/SharedWidgets';
import SushiCard, { LIST_ROW_HEIGHT } from '../components/SushiCard';
import StickyCartButton from '../components/StickyCartButton';
import { groupByCategory } from '../utils/menuGrouping';
import AppHeader from '../components/AppHeader';
import CategoryRail, { buildCategoryEntries } from '../components/CategoryRail';
import { filterItems } from '../utils/searchItems';
import { safeScroll } from '../utils/safeScroll';

// Фиксированная высота заголовка секции — вместе с фиксированной высотой
// карточки даёт точный getItemLayout, поэтому переход к любой категории
// срабатывает с первого раза, даже если она далеко за пределами экрана.
const SECTION_H = 52;

export default function MenuScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { items, loading, error, loadMenu, hydrate, categoryOrder, categoryImages } = useMenuStore();
  const addToCart = useCartStore((s) => s.addToCart);
  const totalItems = useCartStore(selectTotalItems);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeCat, setActiveCat] = useState(null);

  const sectionListRef = useRef(null);
  const inputRef = useRef(null);
  const isClickScrollingRef = useRef(false);
  const clickScrollTimeoutRef = useRef(null);

  useEffect(() => {
    hydrate().finally(() => loadMenu());
  }, []);

  useEffect(() => () => clearTimeout(clickScrollTimeoutRef.current), []);

  // С Home сюда приходят по нажатию на строку поиска — сразу поднимаем
  // клавиатуру, чтобы не пришлось тапать по полю второй раз.
  const focusToken = route?.params?.focusSearch;
  useEffect(() => {
    if (!focusToken) return;
    const id = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(id);
  }, [focusToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMenu();
    setRefreshing(false);
  }, [loadMenu]);

  const catLabel = useCallback(
    (cat) =>
      t(`cat_${(cat || '').toLowerCase()}`, {
        defaultValue: (cat || '').charAt(0).toUpperCase() + (cat || '').slice(1),
      }),
    [t]
  );

  // Group items by category in the desired priority order → SectionList sections.
  const sections = useMemo(() => {
    // Поиск идёт по всем данным товара: название, описание, состав и категория
    // на всех трёх языках.
    const filtered = filterItems(items, query, catLabel);
    return groupByCategory(filtered, categoryOrder).map(([title, data]) => ({ title, data }));
  }, [items, query, categoryOrder, catLabel]);

  const chipCats = useMemo(() => sections.map((s) => s.title), [sections]);

  const railEntries = useMemo(
    () => buildCategoryEntries(chipCats, items, categoryImages, catLabel),
    [chipCats, items, categoryImages, catLabel]
  );

  const totalCount = useMemo(
    () => sections.reduce((n, s) => n + s.data.length, 0),
    [sections]
  );

  // Плоская раскладка секций в том же порядке, в каком их нумерует SectionList:
  // заголовок, затем строки, затем «футер» секции (нулевой высоты).
  const layout = useMemo(() => {
    const out = [];
    let offset = 0;
    for (const s of sections) {
      out.push({ length: SECTION_H, offset });
      offset += SECTION_H;
      for (let i = 0; i < s.data.length; i++) {
        out.push({ length: LIST_ROW_HEIGHT, offset });
        offset += LIST_ROW_HEIGHT;
      }
      out.push({ length: 0, offset });
    }
    return out;
  }, [sections]);

  const getItemLayout = useCallback(
    (_, index) => {
      const e = layout[index];
      return e ? { ...e, index } : { length: LIST_ROW_HEIGHT, offset: 0, index };
    },
    [layout]
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

  const scrollToCategory = useCallback(
    (cat) => {
      const sectionIndex = sections.findIndex((s) => s.title === cat);
      if (sectionIndex < 0) return;
      setActiveCat(cat);
      isClickScrollingRef.current = true;
      // itemIndex: 0 указывает на сам заголовок секции — рейл здесь не
      // перекрывает список, поэтому дополнительный сдвиг не нужен.
      // scrollToLocation бросает Invariant, если секции пересобрались прямо
      // перед нажатием (например, только что сменили язык) — гасим отказ,
      // иначе в release-сборке это закрывает приложение.
      safeScroll(() =>
        sectionListRef.current?.scrollToLocation({
          sectionIndex,
          itemIndex: 0,
          viewOffset: 0,
          animated: true,
        })
      );
      clearTimeout(clickScrollTimeoutRef.current);
      clickScrollTimeoutRef.current = setTimeout(() => {
        isClickScrollingRef.current = false;
      }, 650);
    },
    [sections]
  );

  const openItem = useCallback(
    (item) => navigation.navigate('ItemDetail', { itemId: item._id, item }),
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <SushiCard
        item={item}
        mode="list"
        onTap={() => openItem(item)}
        onAdd={() => addToCart(item)}
      />
    ),
    [openItem, addToCart]
  );

  const renderSectionHeader = useCallback(
    ({ section }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{catLabel(section.title)}</Text>
      </View>
    ),
    [catLabel]
  );

  return (
    <View style={styles.container}>
      <AppHeader />

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={t('search_menu')}
          placeholderTextColor={Colors.textLight}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7} hitSlop={10}>
            <Text style={{ fontSize: 16, color: Colors.textLight }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Круглая витрина категорий */}
      <CategoryRail entries={railEntries} activeKey={activeCat} onSelect={scrollToCategory} />

      {/* List */}
      <View style={{ flex: 1 }}>
        {error && !items.length ? (
          <ErrorState message={error} onRetry={loadMenu} />
        ) : loading && !items.length ? (
          <SkeletonMenuList count={6} />
        ) : totalCount === 0 ? (
          <EmptyState title={t('no_items_found')} subtitle={t('try_different')} emoji="🔎" />
        ) : (
          <SectionList
            ref={sectionListRef}
            sections={sections}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            getItemLayout={getItemLayout}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScrollToIndexFailed={() => {}}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            contentContainerStyle={{
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

      <StickyCartButton onPress={() => navigation.navigate('Cart')} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  sectionHeader: {
    height: SECTION_H,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
});
