import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TypeSelectorScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  const cycleScale = useSharedValue(1);
  const calendarScale = useSharedValue(1);

  const cycleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cycleScale.value }],
  }));

  const calendarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: calendarScale.value }],
  }));

  const handleSelectType = (type: "cycle" | "calendar") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (type === "cycle") {
      navigation.replace("CreateCycleReminder");
    } else {
      navigation.replace("CreateCalendarReminder");
    }
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing["2xl"],
        },
      ]}
    >
      <View style={styles.content}>
        <ThemedText type="h2" style={styles.title}>
          What kind of reminder?
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Choose how you want this reminder to repeat
        </ThemedText>

        <View style={styles.optionsContainer}>
          <AnimatedPressable
            testID="type-cycle"
            onPress={() => handleSelectType("cycle")}
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
            onPress={() => handleSelectType("calendar")}
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
              Examples: every 2 days, Mondays and Thursdays.
            </ThemedText>
          </AnimatedPressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
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
    lineHeight: 20,
  },
});
