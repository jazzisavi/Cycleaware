import { Platform } from "react-native";

const warmLinen = "#F5F0E8";
const darkBark = "#2C2118";
const firedTerracotta = "#C03A2B";
const deepEmerald = "#2E7D52";
const saffron = "#C47D0A";
const warmOcean = "#2A6E7A";
const goldenHour = "#F0A020";
const springFern = "#52B07A";
const warmStone = "#EDE7DA";
const ctaCard = "#A4BCBC";

export const Colors = {
  light: {
    text: darkBark,
    textSecondary: "#6B5D4F",
    textTertiary: "#9A8D7F",
    buttonText: "#FFFFFF",

    tabIconDefault: "#9A8D7F",
    tabIconSelected: goldenHour,

    link: goldenHour,
    primary: goldenHour,
    secondary: warmStone,
    accentCoral: firedTerracotta,
    accentMint: deepEmerald,

    backgroundRoot: warmLinen,
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: warmStone,
    backgroundTertiary: warmLinen,
    ctaCard: ctaCard,

    success: springFern,
    warning: saffron,
    error: firedTerracotta,
    info: warmOcean,

    border: "#D9D0C3",
    borderLight: "#E8E1D6",

    overlay: "rgba(44, 33, 24, 0.4)",
  },
  dark: {
    text: "#F5F0E8",
    textSecondary: "#C4B8A8",
    textTertiary: "#9A8D7F",
    buttonText: "#FFFFFF",

    tabIconDefault: "#9A8D7F",
    tabIconSelected: goldenHour,

    link: goldenHour,
    primary: goldenHour,
    secondary: "#4A3D30",
    accentCoral: "#E07B5A",
    accentMint: "#52B07A",

    backgroundRoot: "#1E1812",
    backgroundDefault: "#2C2118",
    backgroundSecondary: "#3D3228",
    backgroundTertiary: "#4E4236",
    ctaCard: "#3A5555",

    success: "#68D391",
    warning: "#F6AD55",
    error: "#FC8181",
    info: "#63B3ED",

    border: "#4E4236",
    borderLight: "#3D3228",

    overlay: "rgba(0, 0, 0, 0.6)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
  inputHeight: 52,
  buttonHeight: 52,
  fabSize: 56,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});
