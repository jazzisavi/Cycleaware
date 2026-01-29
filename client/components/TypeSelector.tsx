import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface TypeSelectorProps {
  onSelectType: (type: "cycle" | "calendar") => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TypeSelector({ onSelectType }: TypeSelectorProps) {
  const { theme } = useTheme();
  const cycleScale = useSharedValue(1);
  const calendarScale = useSharedValue(1);

  const cycleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cycleScale.value }],
  }));

  const calendarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: calendarScale.value }],
  }));

  const handleCyclePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectType("cycle");
  };

  const handleCalendarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectType("calendar");
  };

  return (
    <View style={styles.container}>
      <ThemedText type="h2" style={styles.title}>
        Choose Reminder Type
      </ThemedText>
      <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
        How should this reminder repeat?
      </ThemedText>

      <View style={styles.optionsContainer}>
        <AnimatedPressable
          testID="type-cycle"
          onPress={handleCyclePress}
          onPressIn={() => { cycleScale.value = withSpring(0.95); }}
          onPressOut={() => { cycleScale.value = withSpring(1); }}
          style={[
            styles.optionCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.accentCoral,
              ...Shadows.md,
            },
            cycleAnimatedStyle,
          ]}
        >
          <Image
            source={require("../../assets/images/cycle-icon.png")}
            style={styles.optionImage}
            resizeMode="contain"
          />
          <ThemedText type="h3" style={styles.optionTitle}>
            Cycle-Based
          </ThemedText>
          <ThemedText type="small" style={[styles.optionDescription, { color: theme.textSecondary }]}>
            On specific days of a repeating cycle. Examples: days 15–28 of a 28-day cycle.
          </ThemedText>
        </AnimatedPressable>

        <AnimatedPressable
          testID="type-calendar"
          onPress={handleCalendarPress}
          onPressIn={() => { calendarScale.value = withSpring(0.95); }}
          onPressOut={() => { calendarScale.value = withSpring(1); }}
          style={[
            styles.optionCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.accentMint,
              ...Shadows.md,
            },
            calendarAnimatedStyle,
          ]}
        >
          <Image
            source={require("../../assets/images/calendar-icon.png")}
            style={styles.optionImage}
            resizeMode="contain"
          />
          <ThemedText type="h3" style={styles.optionTitle}>
            Calendar-Based
          </ThemedText>
          <ThemedText type="small" style={[styles.optionDescription, { color: theme.textSecondary }]}>
            Set a regular schedule like every Monday, Wednesday, and Friday.
          </ThemedText>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing["2xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing["3xl"],
  },
  optionsContainer: {
    gap: Spacing.lg,
  },
  optionCard: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    alignItems: "center",
  },
  optionImage: {
    width: 80,
    height: 80,
    marginBottom: Spacing.lg,
  },
  optionTitle: {
    marginBottom: Spacing.sm,
  },
  optionDescription: {
    textAlign: "center",
    maxWidth: 260,
  },
});
