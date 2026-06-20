/**
 * TalentID · Design System — Tokens (TypeScript)
 *
 * Espejo en JS de los tokens definidos en `globals.css`. Úsalos cuando
 * necesites valores fuera de Tailwind (gráficos, canvas, estilos inline,
 * librerías de terceros). Para estilar UI normal, prefiere las utilidades
 * de Tailwind generadas por @theme (bg-primary-600, shadow-card, etc.).
 */

export const colors = {
  primary: {
    50: "#eeedfd",
    100: "#d7d2fa",
    300: "#a99ef2",
    500: "#7c6bec",
    600: "#5b4be6", // base
    700: "#4334c2",
    hover: "#4f40d4",
    active: "#4334c2",
    tint: "#eeedfd",
    tintHover: "#e2defb",
    ghostHover: "#f4f3fe",
    ring: "#eeedfd",
  },
  neutral: {
    0: "#ffffff",
    50: "#f6f7f9",
    100: "#f1f2f5",
    150: "#f4f5f7",
    200: "#ecedf1",
    300: "#e2e4e9",
    400: "#9aa0ab",
    500: "#6b7280",
    700: "#4b5160",
    900: "#1c2030",
    disabled: "#c9c7d4",
  },
  surface: {
    page: "#f6f7f9",
    base: "#ffffff",
    line: "#ecedf1",
    lineStrong: "#e2e4e9",
    divider: "#f1f2f5",
  },
  text: {
    ink: "#1c2030",
    soft: "#4b5160",
    muted: "#6b7280",
    faint: "#9aa0ab",
  },
  accent: {
    violet: { fg: "#6d5de8", bg: "#edebfd" },
    green: { fg: "#2bb673", bg: "#e3f7ed" },
    amber: { fg: "#f5a524", bg: "#fef1dc" },
    blue: { fg: "#3b82f6", bg: "#e4effe" },
  },
  state: {
    success: { fg: "#178a52", strong: "#0f6e40", solid: "#2bb673", bg: "#e3f7ed", border: "#b9eccf" },
    warning: { fg: "#b7791f", strong: "#925a12", solid: "#f5a524", bg: "#fef1dc", border: "#f7ddb0" },
    error: { fg: "#c8312b", strong: "#a6241f", solid: "#e2433b", bg: "#fbe6e5", border: "#f3c0bd" },
    info: { fg: "#2563c9", strong: "#1f52a8", solid: "#3b82f6", bg: "#e4effe", border: "#bbd6fb" },
  },
} as const;

export const gradients = {
  brand: "linear-gradient(135deg, #6e5deb, #5039d8)",
  brandSoft: "linear-gradient(150deg, #6e5deb, #5039d8)",
  promo: "linear-gradient(155deg, #6e5deb, #5039d8)",
  avatar: "linear-gradient(135deg, #a99ef2, #6d5de8)",
  progress: "linear-gradient(90deg, #7c6bec, #5b4be6)",
} as const;

/** Escala de espaciado basada en una unidad de 8px (medio paso de 4px). */
export const spacing = {
  xs: "4px", // gaps de íconos
  sm: "8px", // entre label e input
  md: "12px", // padding compacto
  lg: "16px", // padding de card
  xl: "24px", // gap entre cards
  "2xl": "32px", // padding de sección
  "3xl": "48px", // márgenes de página
} as const;

export const radii = {
  sm: "6px", // badges
  md: "8px", // inputs / botones
  lg: "12px", // cards / menús
  xl: "16px", // paneles
  full: "999px", // pills / avatares
} as const;

export const shadows = {
  xs: "0 1px 2px rgba(16,24,40,.05)",
  card: "0 1px 3px rgba(16,24,40,.05)",
  cardRaised: "0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)",
  md: "0 6px 16px rgba(16,24,40,.10)", // dropdown
  lg: "0 20px 48px rgba(16,24,40,.18)", // modal
  primary: "0 4px 12px rgba(91,75,230,.30)",
  primaryHover: "0 6px 16px rgba(91,75,230,.40)",
  promo: "0 10px 28px rgba(91,75,230,.28)",
  toast: "0 10px 28px rgba(16,24,40,.22)",
} as const;

export const typography = {
  fontFamily: {
    sans: "'Plus Jakarta Sans', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  /** [fontSize, fontWeight, letterSpacing] */
  scale: {
    display: { size: "40px", weight: 800, tracking: "-0.03em", leading: "1.08" },
    h1: { size: "28px", weight: 800, tracking: "-0.02em", leading: "1.15" },
    h2: { size: "22px", weight: 700, tracking: "-0.01em", leading: "1.2" },
    h3: { size: "18px", weight: 600, tracking: "0", leading: "1.3" },
    bodyLg: { size: "16px", weight: 400, tracking: "0", leading: "1.6" },
    body: { size: "14px", weight: 400, tracking: "0", leading: "1.55" },
    small: { size: "13px", weight: 500, tracking: "0", leading: "1.5" },
    caption: { size: "11px", weight: 600, tracking: "0.06em", leading: "1.4" },
  },
} as const;

export const layout = {
  sidebarWidth: "248px",
  topbarHeight: "64px",
  contentMax: "1320px",
} as const;

export const tokens = {
  colors,
  gradients,
  spacing,
  radii,
  shadows,
  typography,
  layout,
} as const;

export default tokens;
