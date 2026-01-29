import { View, type ViewProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  elevation?: 0 | 1 | 2 | 3;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  elevation = 0,
  ...otherProps
}: ThemedViewProps) {
  const { theme, isDark } = useTheme();

  const getBackgroundColor = () => {
    if (isDark && darkColor) return darkColor;
    if (!isDark && lightColor) return lightColor;
    
    switch (elevation) {
      case 0:
        return theme.backgroundRoot;
      case 1:
        return theme.backgroundDefault;
      case 2:
        return theme.backgroundSecondary;
      case 3:
        return theme.backgroundTertiary;
      default:
        return theme.backgroundRoot;
    }
  };

  return <View style={[{ backgroundColor: getBackgroundColor() }, style]} {...otherProps} />;
}
