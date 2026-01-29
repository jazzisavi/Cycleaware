import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { Reminder } from "@shared/schema";

interface ReminderCardProps {
  reminder: Reminder;
  onPress?: () => void;
  onComplete?: () => void;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ReminderCard({ reminder, onPress, onComplete, testID }: ReminderCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete?.();
  };

  const getTypeIcon = () => {
    return reminder.reminderType === "cycle" ? "refresh-cw" : "calendar";
  };

  const getTypeColor = () => {
    return reminder.reminderType === "cycle" ? theme.accentCoral : theme.accentMint;
  };

  const formatNextOccurrence = () => {
    if (!reminder.nextOccurrence) return "No date set";
    const date = new Date(reminder.nextOccurrence);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = () => {
    if (!reminder.reminderTime) return "";
    const [hours, minutes] = reminder.reminderTime.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.borderLight,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.leftSection}>
        <Pressable
          onPress={handleComplete}
          style={[styles.checkbox, { borderColor: theme.border }]}
          hitSlop={8}
        >
          <View style={[styles.checkboxInner, { borderColor: theme.border }]} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <ThemedText type="h4" numberOfLines={1}>
          {reminder.title}
        </ThemedText>
        <View style={styles.metaRow}>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor() + "20" }]}>
            <Feather name={getTypeIcon()} size={12} color={getTypeColor()} />
            <ThemedText type="caption" style={{ color: getTypeColor(), marginLeft: 4 }}>
              {reminder.reminderType === "cycle" ? "Cycle" : "Calendar"}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formatNextOccurrence()} at {formatTime()}
          </ThemedText>
        </View>
      </View>

      <Feather name="chevron-right" size={20} color={theme.textTertiary} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  leftSection: {
    marginRight: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
});
