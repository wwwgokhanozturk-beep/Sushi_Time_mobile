import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
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

export default function MenuScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { items, categories, selectedCategory, loading, error, loadMenu, filterByCategory } =
    useMenuStore();
  const addToCart = useCartStore((s) => s.addToCart);
  const totalItems = useCartStore(selectTotalItems);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMenu();
    setRefreshing(false);
  }, []);

  let filtered = query
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(query.toLowerCase()) ||
          i.category.toLowerCase().includes(query.toLowerCase())
      )
    : [...items];

  const renderItem = ({ item }) => (
    <SushiCard
      item={item}
      mode="list"
      onTap={() => navigation.navigate('ItemDetail', { itemId: item._id })}
      onAdd={() => addToCart(item)}
    />
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
      </View>

      {/* Categories */}
      {categories.length > 1 && (
        <FlatList
          horizontal
          data={categories}
          showsHorizontalScrollIndicator={false}
          style={styles.catListWrapper}
          contentContainerStyle={styles.catList}
          keyExtractor={(item) => item}
          renderItem={({ item: cat }) => {
            const isSelected =
              (selectedCategory === null && cat === 'All') || selectedCategory === cat;
            const displayName =
              cat === 'All'
                ? t('all')
                : t(`cat_${cat.toLowerCase()}`, { defaultValue: cat.charAt(0).toUpperCase() + cat.slice(1) });
            return (
              <TouchableOpacity
                style={[styles.catChip, isSelected && styles.catChipSelected]}
                onPress={() => filterByCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catChipText, isSelected && styles.catChipTextSelected]} numberOfLines={1}>
                  {displayName}
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
        ) : filtered.length === 0 && !loading ? (
          <EmptyState title={t('no_items_found')} subtitle={t('try_different')} emoji="🔎" />
        ) : (
          <FlatList
            data={filtered}
            numColumns={1}
            contentContainerStyle={{ paddingTop: Spacing.xs, paddingBottom: totalItems > 0 ? 90 : Spacing.lg }}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
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
