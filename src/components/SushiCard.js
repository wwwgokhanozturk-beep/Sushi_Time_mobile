import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Shadows } from '../core/theme';
import { formatPrice } from '../utils/formatPrice';
import { imageFrameTransform } from '../utils/imageFrame';
import { useTranslation } from 'react-i18next';

// ─── Gradient vignette: blends image edges into card bg ──────────────────────
// Stacks semi-transparent Views with exponential opacity — approximates CSS gradient.
function EdgeVignette({ color, direction = 'bottom', spread = 48 }) {
  const BANDS = 8;
  const bandH = spread / BANDS;
  const curve = (t) => Math.pow(1 - t, 2.4) * 0.85;
  return (
    <>
      {Array.from({ length: BANDS }, (_, i) => {
        const posStyle = direction === 'bottom' ? { bottom: i * bandH } : { top: i * bandH };
        return (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              ...posStyle,
              left: 0,
              right: 0,
              height: bandH + 0.5,
              backgroundColor: color,
              opacity: curve(i / (BANDS - 1)),
            }}
          />
        );
      })}
    </>
  );
}

function SideVignette({ color, side = 'left', spread = 24 }) {
  const BANDS = 6;
  const bandW = spread / BANDS;
  const curve = (t) => Math.pow(1 - t, 2) * 0.6;
  return (
    <>
      {Array.from({ length: BANDS }, (_, i) => {
        const posStyle = side === 'left' ? { left: i * bandW } : { right: i * bandW };
        return (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              ...posStyle,
              top: 0,
              bottom: 0,
              width: bandW + 0.5,
              backgroundColor: color,
              opacity: curve(i / (BANDS - 1)),
            }}
          />
        );
      })}
    </>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────
function StarRating({ rating = 0, size = 11 }) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {'★'.repeat(full).split('').map((_, i) => (
        <Text key={`f${i}`} style={{ fontSize: size, color: '#F59E0B' }}>★</Text>
      ))}
      {half && <Text style={{ fontSize: size, color: '#F59E0B' }}>★</Text>}
      {'☆'.repeat(empty).split('').map((_, i) => (
        <Text key={`e${i}`} style={{ fontSize: size, color: '#D1D5DB' }}>☆</Text>
      ))}
      <Text style={{ fontSize: size - 1, color: Colors.textLight, marginLeft: 4 }}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────
export default function SushiCard({ item, onTap, onAdd, mode = 'grid' }) {
  const { i18n } = useTranslation();
  const price = formatPrice(item.price);

  const lang = i18n.language;
  const description =
    (lang === 'ru' && item.description_ru) ? item.description_ru
    : (lang === 'tr' && item.description_tr) ? item.description_tr
    : item.description;

  const pseudoRating = item.rating || (3.5 + ((item.price * 7 + item.calories) % 15) / 10);

  // ── LIST mode ──────────────────────────────────────────────────────────────
  if (mode === 'list') {
    const hasDiscount = item.comparePrice && item.comparePrice > item.price;

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onTap} style={styles.listCard}>

        {/* LEFT — текст */}
        <View style={styles.listContent}>
          <Text style={styles.listName} numberOfLines={2}>{item.name}</Text>

          {/* Цена + зачёркнутая */}
          <View style={styles.listPriceRow}>
            <Text style={styles.listPrice}>{price}</Text>
            {hasDiscount && (
              <Text style={styles.listComparePrice}>{formatPrice(item.comparePrice)}</Text>
            )}
          </View>

          {description ? (
            <Text style={styles.listDesc} numberOfLines={3}>{description}</Text>
          ) : null}
        </View>

        {/* RIGHT — фото + кнопка */}
        <View style={styles.listImgWrap}>
          {/* Клиппинг-контейнер: зум/смещение не вылезают за рамку */}
          <View style={styles.listImgClip}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={[styles.listImage, { transform: imageFrameTransform(item, 116, 116) }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.listImage, styles.listPlaceholder]}>
                <Text style={{ fontSize: 40 }}>🍣</Text>
              </View>
            )}
            {!item.isAvailable && (
              <View style={styles.soldOutOverlay}>
                <Text style={styles.soldOutText}>Sold{'\n'}Out</Text>
              </View>
            )}
          </View>
          {/* + кнопка поверх фото (снизу-справа) */}
          <TouchableOpacity
            style={[styles.listAddBtn, !item.isAvailable && styles.addBtnDisabled]}
            onPress={item.isAvailable ? onAdd : undefined}
            activeOpacity={0.8}
          >
            <Text style={[styles.addBtnText, !item.isAvailable && styles.addBtnTextOff]}>+</Text>
          </TouchableOpacity>
        </View>

      </TouchableOpacity>
    );
  }

  // ── GRID mode ──────────────────────────────────────────────────────────────
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onTap} style={styles.card}>
      <View style={styles.imgContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={{ fontSize: 48 }}>🍣</Text>
          </View>
        )}
        {/* Vignette: edges dissolve into card bg */}
        <EdgeVignette color={Colors.cardBg} direction="bottom" spread={56} />
        <EdgeVignette color={Colors.cardBg} direction="top"    spread={26} />
        <SideVignette color={Colors.cardBg} side="left"        spread={26} />
        <SideVignette color={Colors.cardBg} side="right"       spread={26} />

        {/* Warm ambient glow — food warmth */}
        <View pointerEvents="none" style={styles.warmGlow} />

        {/* Time chip */}
        <View style={styles.timePill}>
          <Text style={styles.timePillText}>⏱ {item.preparationTime} min</Text>
        </View>

        {/* Add button — pinned bottom-right of image */}
        <TouchableOpacity
          style={[styles.addBtn, styles.gridAddBtn, !item.isAvailable && styles.addBtnDisabled]}
          onPress={item.isAvailable ? onAdd : undefined}
          activeOpacity={0.8}
        >
          <Text style={[styles.addBtnText, !item.isAvailable && styles.addBtnTextOff]}>+</Text>
        </TouchableOpacity>

        {!item.isAvailable && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>Sold Out</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <StarRating rating={pseudoRating} />
        {description ? (
          <Text style={styles.description} numberOfLines={2}>{description}</Text>
        ) : null}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{price}</Text>
          {item.calories > 0 && (
            <View style={styles.calPill}>
              <Text style={styles.calories}>🔥 {item.calories} cal</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Shared ────────────────────────────────────────────────────────────────
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  addBtnDisabled: {
    backgroundColor: Colors.shimmerBase,
    borderWidth: 1,
    borderColor: Colors.divider,
    shadowOpacity: 0,
    elevation: 0,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: -1,
  },
  addBtnTextOff: {
    color: Colors.textLight,
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // ── Grid card ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.divider,
    ...Shadows.md,
  },
  imgContainer: {
    height: 160,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.shimmerBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Subtle warm glow at bottom-center
  warmGlow: {
    position: 'absolute',
    bottom: -14,
    alignSelf: 'center',
    width: '55%',
    height: 52,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    opacity: 0.06,
  },
  timePill: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.4,
  },
  gridAddBtn: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
  },
  info: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  calPill: {
    backgroundColor: Colors.shimmerBase,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  calories: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },

  // ── List card ─────────────────────────────────────────────────────────────
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    // Translucent so the app background design shows through the menu rows.
    backgroundColor: 'rgba(255,255,255,0.32)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  listContent: {
    flex: 1,
    gap: 5,
    paddingRight: Spacing.xs,
  },
  listName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  listPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  listPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  listComparePrice: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  listDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  // Контейнер картинки
  listImgWrap: {
    width: 116,
    height: 116,
    borderRadius: 16,
    overflow: 'visible', // чтобы кнопка + выходила за пределы
    flexShrink: 0,
  },
  // Клипует фото внутри рамки (зум/смещение из админки не вылезают)
  listImgClip: {
    width: 116,
    height: 116,
    borderRadius: 16,
    overflow: 'hidden',
  },
  listImage: {
    width: 116,
    height: 116,
    borderRadius: 16,
    backgroundColor: Colors.shimmerBase,
  },
  listPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Кнопка + поверх фото
  listAddBtn: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: Colors.surface,
    ...Shadows.glow,
  },
});
