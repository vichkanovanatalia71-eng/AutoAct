// ============ Colors ============

export const colors = {
  primary: {
    50: "#EEF2FF",
    100: "#E0E7FF",
    200: "#C7D2FE",
    300: "#A5B4FC",
    400: "#818CF8",
    500: "#6366F1",
    600: "#4F46E5",
    700: "#4338CA",
    800: "#3730A3",
    900: "#312E81",
  },
  success: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    200: "#BBF7D0",
    300: "#86EFAC",
    400: "#4ADE80",
    500: "#22C55E",
    600: "#16A34A",
    700: "#15803D",
  },
  warning: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
  },
  danger: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
  },
  neutral: {
    0: "#FFFFFF",
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
} as const;

// ============ Spacing ============

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ============ Typography ============

export const typography = {
  fontFamily: {
    web: "'Inter', system-ui, -apple-system, sans-serif",
    ios: "System",
    android: "Roboto",
  },
  fontSize: {
    xs: { size: 12, lineHeight: 16 },
    sm: { size: 14, lineHeight: 20 },
    base: { size: 16, lineHeight: 24 },
    lg: { size: 18, lineHeight: 28 },
    xl: { size: 20, lineHeight: 28 },
    "2xl": { size: 24, lineHeight: 32 },
    "3xl": { size: 30, lineHeight: 36 },
    "4xl": { size: 36, lineHeight: 40 },
  },
  fontWeight: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
  },
} as const;

// ============ Border Radius ============

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

// ============ Shadows ============

export const shadows = {
  sm: {
    web: "0 1px 2px 0 rgba(0,0,0,0.05)",
    native: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 },
  },
  md: {
    web: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
    native: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  },
  lg: {
    web: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
    native: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  },
} as const;

// ============ Tailwind Theme Extension ============

export const tailwindTheme = {
  colors: {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  },
  borderRadius: {
    sm: `${radius.sm}px`,
    md: `${radius.md}px`,
    lg: `${radius.lg}px`,
    xl: `${radius.xl}px`,
  },
};

// ============ Plan Colors ============

export const planColors = {
  free: { bg: colors.neutral[100], text: colors.neutral[700], border: colors.neutral[300] },
  pro: { bg: colors.primary[50], text: colors.primary[700], border: colors.primary[300] },
  business: { bg: colors.warning[50], text: colors.warning[700], border: colors.warning[300] },
} as const;

// ============ Status Colors ============

export const statusColors = {
  active: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
  paused: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
  error: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
  needs_attention: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
  pending: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
  testing: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
} as const;

export const executionStatusColors = {
  success: { bg: colors.success[50], text: colors.success[700], icon: colors.success[500] },
  failed: { bg: colors.danger[50], text: colors.danger[700], icon: colors.danger[500] },
  running: { bg: colors.primary[50], text: colors.primary[700], icon: colors.primary[500] },
  pending: { bg: colors.neutral[100], text: colors.neutral[600], icon: colors.neutral[400] },
} as const;
