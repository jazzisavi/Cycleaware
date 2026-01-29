import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  testID?: string;
}

export function SettingsRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onPress,
  showChevron = true,
  testID,
}: SettingsRowProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed && onPress ? theme.backgroundSecondary : theme.backgroundDefault,
          borderColor: theme.borderLight,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: (iconColor || theme.primary) + "15" }]}>
        <Feather name={icon} size={20} color={iconColor || theme.primary} />
      </View>
      <View style={styles.content}>
        <ThemedText type="body">{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {value ? (
        <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: Spacing.sm }}>
          {value}
        </ThemedText>
      ) : null}
      {showChevron && onPress ? (
        <Feather name="chevron-right" size={20} color={theme.textTertiary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
});
