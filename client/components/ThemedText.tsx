import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "display" | "h1" | "h2" | "h3" | "h4" | "body" | "small" | "caption" | "button" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();
  const { rs } = useResponsive();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.link;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "display":
        return { ...Typography.display, fontSize: rs(32, 11), lineHeight: rs(40, 14) };
      case "h1":
        return { ...Typography.h1, fontSize: rs(24, 11), lineHeight: rs(32, 14) };
      case "h2":
        return { ...Typography.h2, fontSize: rs(20, 11), lineHeight: rs(28, 14) };
      case "h3":
        return { ...Typography.h3, fontSize: rs(18, 11), lineHeight: rs(26, 14) };
      case "h4":
        return { ...Typography.h4, fontSize: rs(16, 11), lineHeight: rs(24, 14) };
      case "body":
        return { ...Typography.body, fontSize: rs(16, 11), lineHeight: rs(24, 14) };
      case "small":
        return { ...Typography.small, fontSize: rs(14, 11), lineHeight: rs(20, 14) };
      case "caption":
        return { ...Typography.caption, fontSize: rs(12, 11), lineHeight: rs(16, 14) };
      case "button":
        return { ...Typography.button, fontSize: rs(16, 11), lineHeight: rs(24, 14) };
      case "link":
        return { ...Typography.link, fontSize: rs(16, 11), lineHeight: rs(24, 14) };
      default:
        return { ...Typography.body, fontSize: rs(16, 11), lineHeight: rs(24, 14) };
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}
