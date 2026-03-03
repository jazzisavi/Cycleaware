import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Copy } from "@/constants/copy";
import { Spacing } from "@/constants/theme";

interface ActionConfirmationToastProps {
  actionType: "taken" | "skipped" | "snoozed" | null;
  snoozeDuration?: string;
  onDismiss: () => void;
}

export function ActionConfirmationToast({
  actionType,
  snoozeDuration,
  onDismiss,
}: ActionConfirmationToastProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (actionType) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });

      opacity.value = withDelay(
        3000,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        })
      );
      translateY.value = withDelay(3000, withTiming(20, { duration: 300 }));
    } else {
      opacity.value = 0;
      translateY.value = 20;
    }
  }, [actionType]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!actionType) return null;

  const getContent = () => {
    switch (actionType) {
      case "taken":
        return { title: Copy.actionConfirmation.taken, subtitle: null };
      case "skipped":
        return { title: Copy.actionConfirmation.skipped, subtitle: null };
      case "snoozed":
        return {
          title: Copy.actionConfirmation.snoozed(snoozeDuration || "60 mins"),
          subtitle: Copy.actionConfirmation.snoozeTip,
        };
      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <ThemedText type="body" style={[styles.title, { color: theme.text, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" }]}>
          {content.title}
        </ThemedText>
        {content.subtitle ? (
          <ThemedText type="caption" style={[styles.subtitle, { color: theme.textSecondary }]}>
            {content.subtitle}
          </ThemedText>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 120,
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  content: {
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
});
