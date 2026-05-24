import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../core/theme';
import { useMenuStore } from '../store/menuStore';
import { useCartStore, selectTotalItems } from '../store/cartStore';
import { SectionHeader, ErrorState } from '../components/SharedWidgets';
import SushiCard from '../components/SushiCard';
import PromoCarousel from '../components/PromoCarousel';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { items, categories, selectedCategory, loading, error, loadMenu, filterByCategory } =
    useMenuStore();
  const addToCart = useCartStore((s) => s.addToCart);
  const totalItems = useCartStore(selectTotalItems);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMenu();
    setRefreshing(false);
  }, []);

  const featured = items.slice(0, 6);

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
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
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

        {/* ─── Categories ─── */}
        {categories.length > 1 && (
          <FlatList
            horizontal
            data={categories}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catList}
            keyExtractor={(item) => item}
            renderItem={({ item: cat }) => {
              const isSelected =
                (selectedCategory === null && cat === 'All') || selectedCategory === cat;
              const displayName =
                cat === 'All'
                  ? t('all')
                  : t(`cat_${cat.toLowerCase()}`, {
                      defaultValue: cat.charAt(0).toUpperCase() + cat.slice(1),
                    });
              return (
                <TouchableOpacity
                  style={[styles.catChip, isSelected && styles.catChipSelected]}
                  onPress={() => filterByCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.catChipText, isSelected && styles.catChipTextSelected]}
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* ─── Popular Picks ─── */}
        <SectionHeader
          title={t('popular_picks')}
          actionLabel={t('see_all')}
          onAction={() => navigation.navigate('Menu')}
        />

        {error ? (
          <ErrorState message={error} onRetry={loadMenu} />
        ) : loading && items.length === 0 ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <View style={styles.listSection}>
            {featured.map((item) => (
              <SushiCard
                key={item._id}
                item={item}
                mode="list"
                onTap={() => navigation.navigate('ItemDetail', { itemId: item._id })}
                onAdd={() => addToCart(item)}
              />
            ))}
          </View>
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
