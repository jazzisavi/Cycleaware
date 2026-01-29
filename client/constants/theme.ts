import { Platform } from "react-native";

// GoFlo Design System
// Soft/Pastel with Editorial Precision

// Primary brand colors
const primaryBlue = "#6B9BD1";
const secondaryBlue = "#B4CFE0";
const accentCoral = "#F4A261";
const accentMint = "#A8DADC";

// Semantic colors
const success = "#48BB78";
const warning = "#ED8936";
const error = "#F56565";
const info = "#4299E1";

export const Colors = {
  light: {
    // Core
    text: "#2D3748",
    textSecondary: "#718096",
    textTertiary: "#A0AEC0",
    buttonText: "#FFFFFF",
    
    // Tab bar
    tabIconDefault: "#718096",
    tabIconSelected: primaryBlue,
    
    // Links & accents
    link: primaryBlue,
    primary: primaryBlue,
    secondary: secondaryBlue,
    accentCoral: accentCoral,
    accentMint: accentMint,
    
    // Backgrounds (elevation system)
    backgroundRoot: "#FAFBFC",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F7F8FA",
    backgroundTertiary: "#EDF0F4",
    
    // Semantic
    success: success,
    warning: warning,
    error: error,
    info: info,
    
    // Borders
    border: "#E2E8F0",
    borderLight: "#EDF2F7",
    
    // Overlay
    overlay: "rgba(45, 55, 72, 0.4)",
  },
  dark: {
    // Core
    text: "#F7FAFC",
    textSecondary: "#A0AEC0",
    textTertiary: "#718096",
    buttonText: "#FFFFFF",
    
    // Tab bar
    tabIconDefault: "#718096",
    tabIconSelected: "#90CDF4",
    
    // Links & accents
    link: "#90CDF4",
    primary: "#90CDF4",
    secondary: "#4A5568",
    accentCoral: "#FBD38D",
    accentMint: "#81E6D9",
    
    // Backgrounds (elevation system)
    backgroundRoot: "#1A202C",
    backgroundDefault: "#2D3748",
    backgroundSecondary: "#4A5568",
    backgroundTertiary: "#718096",
    
    // Semantic
    success: "#68D391",
    warning: "#F6AD55",
    error: "#FC8181",
    info: "#63B3ED",
    
    // Borders
    border: "#4A5568",
    borderLight: "#2D3748",
    
    // Overlay
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
