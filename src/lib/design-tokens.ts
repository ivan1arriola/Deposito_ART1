export const designTokens = {
  color: {
    ejercito: {
      gold: "#FFCC00",
      blue: "#003885",
      red: "#CF0F21",
      green: "#1F6728",
      brown: "#4D351D",
      lightBlue: "#1B75AA",
      gray: "#C3C3C6",
      black: "#000000",
      white: "#F4F5F1",
    },
    neutral: {
      0: "#F4F5F1",
      50: "#F7F8F9",
      100: "#EEF1F3",
      200: "#E3E7EB",
      300: "#D5DBE0",
      400: "#C3CBD3",
      500: "#A7B0BA",
      600: "#7A8694",
      700: "#54606D",
      800: "#303B46",
      900: "#17212B",
    },
    states: {
      info: "#1B75AA",
      success: "#1F6728",
      warning: "#A57C00",
      danger: "#CF0F21",
    },
    overlay: {
      dim: "rgba(0, 0, 0, 0.56)",
    },
    surface: {
      card: "#FFFFFF",
      subtle: "#F7F8F9",
      dangerSoft: "#FEF2F2",
      warningSoft: "#FFFBEB",
      successSoft: "#ECFDF5",
    },
  },
  touchTarget: {
    min: 44,
  },
  motion: {
    fast: "150ms",
    normal: "200ms",
  },
  typography: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontFamilyMono: '"Courier New", "Liberation Mono", monospace',
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      heavy: 800,
    },
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    pill: 999,
  },
  shadow: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.06)",
    sm: "0 2px 8px rgba(0, 0, 0, 0.08)",
    md: "0 6px 16px rgba(0, 0, 0, 0.12)",
  },
} as const;

export const appFontStack = designTokens.typography.fontFamily;
