/**
 * GourMap Design System — Color Palette
 *
 * Aesthetic: Warm cream + deep charcoal + terracotta accent
 * Feel: Modern food app — inviting, warm, clean
 */

export const COLORS = {
  // ── Backgrounds ─────────────────────────────────────────────────────────────
  /** Main screen background — warm off-white */
  background:     '#FDF6EE',
  /** Card / surface background — pure white */
  surface:        '#FFFFFF',
  /** Subtle secondary surface — very light warm gray */
  surfaceAlt:     '#F5EFE6',

  // ── Text ────────────────────────────────────────────────────────────────────
  /** Primary text — deep charcoal (not pure black, softer) */
  textPrimary:    '#2C2C2C',
  /** Secondary text — medium warm gray */
  textSecondary:  '#6B6560',
  /** Muted / placeholder text */
  textMuted:      '#A89F96',

  // ── Accent / Brand ──────────────────────────────────────────────────────────
  /** Primary accent — terracotta orange (food-forward, warm) */
  accent:         '#D4622A',
  /** Accent hover / pressed state */
  accentDark:     '#B04E1F',
  /** Accent light tint — for backgrounds behind accent elements */
  accentLight:    '#FAE8DC',

  // ── Borders ─────────────────────────────────────────────────────────────────
  /** Default border — soft warm gray */
  border:         '#E0D8CF',
  /** Strong border — for cards and inputs */
  borderStrong:   '#C8BFB5',

  // ── Status ──────────────────────────────────────────────────────────────────
  success:        '#3A7D44',
  successLight:   '#E8F5EA',
  error:          '#C0392B',
  errorLight:     '#FFEBEE',
  warning:        '#E67E22',
  warningLight:   '#FEF3E2',

  // ── Special ─────────────────────────────────────────────────────────────────
  /** Star / rating color */
  star:           '#F5A623',
  /** Map marker default */
  mapMarker:      '#D4622A',
  /** Overlay scrim */
  overlay:        'rgba(44, 44, 44, 0.55)',
  /** White text on dark backgrounds */
  textOnDark:     '#FFFFFF',
  /** FAB shadow */
  shadow:         '#2C2C2C',
  /** Card background color */
  cardBackground: '#FFFFFF',
};

/** Consistent border radius values */
export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  pill: 999,
};

/** Consistent spacing */
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
};

/** Typography sizes */
export const FONT = {
  xs:   10,
  sm:   12,
  md:   14,
  lg:   16,
  xl:   18,
  xxl:  22,
  hero: 28,
};

export const DESIGN_COLORS = COLORS;

export const SHADOW_STYLE = {
  shadowColor: COLORS.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 3,
};

export const BORDER_RADIUS = {
  circle: 24,
  small: 8,
  medium: 12,
  large: 16,
};
