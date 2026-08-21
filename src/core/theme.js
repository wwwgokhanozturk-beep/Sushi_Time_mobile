import { Platform } from 'react-native';

// ─── Design Tokens ─────────────────────────────────────────────
// LIGHT THEME — clean white + bold red
export const Colors = {
  primary:       '#E8181B', // Bold red
  primaryDark:   '#B50E10',
  primaryLight:  '#FDECEA',
  secondary:     '#FF6B35', // Warm orange accent
  accent:        '#FF6B35',
  background:    'transparent',
  surface:       'rgba(255,255,255,0.90)', // Cards / panels
  cardBg:        'rgba(255,255,255,0.92)',
  textPrimary:   '#0D0D0D', // Near-black text
  textSecondary: '#6B7280', // Grey
  textLight:     '#9CA3AF', // Faint
  divider:       'rgba(229, 231, 235, 0.9)', // Light separator
  success:       '#10B981',
  warning:       '#F59E0B',
  error:         '#EF4444',
  shimmerBase:      '#F0F0F2',
  shimmerHighlight: '#FAFAFA',
};

// 8pt grid system
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const Radius = {
  sm:   8,
  md:   12,
  lg:   20,
  xl:   28,
  full: 999,
};

export const Shadows = {
  sm: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 8 },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.13, shadowRadius: 14 },
    android: { elevation: 8 },
  }),
  glow: Platform.select({
    ios:     { shadowColor: '#E8181B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
    android: { elevation: 8, shadowColor: '#E8181B' },
  }),
};

export const Typography = {
  heading1: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  button: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
};
