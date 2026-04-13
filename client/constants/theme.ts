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

export const FontFamily = {
  serifBold: "PlayfairDisplay_700Bold",
  sansRegular: "PlusJakartaSans_400Regular",
  sansMedium: "PlusJakartaSans_500Medium",
  sansSemiBold: "PlusJakartaSans_600SemiBold",
  sansBold: "PlusJakartaSans_700Bold",
};

export const Colors = {
  light: {
    text: darkBark,
    textSecondary: "#6B5744",
    textTertiary: "#6B5744",
    buttonText: "#FFFFFF",

    tabIconDefault: "#6B5744",
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

    iconEmpty: "#6B5744",
    iconFilled: "#E8614F",
    pillActiveBg: "#F9E8E4",
    pillActiveBorder: "#E8614F",
    saveButtonActive: "#E8614F",
    saveButtonDisabled: "#E8C4B8",
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

    iconEmpty: "#9A8D7F",
    iconFilled: "#E8614F",
    pillActiveBg: "#3D2A25",
    pillActiveBorder: "#E8614F",
    saveButtonActive: "#E8614F",
    saveButtonDisabled: "#4E4236",
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
    fontFamily: FontFamily.serifBold,
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
    fontFamily: FontFamily.serifBold,
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700" as const,
    fontFamily: FontFamily.serifBold,
  },
  h3: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700" as const,
    fontFamily: FontFamily.serifBold,
  },
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700" as const,
    fontFamily: FontFamily.serifBold,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    fontFamily: FontFamily.sansRegular,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    fontFamily: FontFamily.sansRegular,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    fontFamily: FontFamily.sansRegular,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
    fontFamily: FontFamily.sansSemiBold,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    fontFamily: FontFamily.sansRegular,
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
    sans: FontFamily.sansRegular,
    serif: FontFamily.serifBold,
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: FontFamily.sansRegular,
    serif: FontFamily.serifBold,
    rounded: FontFamily.sansRegular,
    mono: "monospace",
  },
  web: {
    sans: FontFamily.sansRegular,
    serif: FontFamily.serifBold,
    rounded: FontFamily.sansRegular,
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});
