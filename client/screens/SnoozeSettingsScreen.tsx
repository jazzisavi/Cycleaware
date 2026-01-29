import React, { useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const SNOOZE_OPTIONS = [10, 20, 30, 40, 50, 60, 90, 120];

export default function SnoozeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = (duration: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDuration(duration);
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Save logic will be implemented in Phase 2
    setTimeout(() => setIsLoading(false), 1000);
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) {
        return `${hours} hour${hours > 1 ? "s" : ""}`;
      }
      return `${hours}h ${mins}min`;
    }
    return `${minutes} minutes`;
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <ThemedText type="h2" style={styles.title}>
          Default Snooze Duration
        </ThemedText>
        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          Choose how long to snooze notifications when you tap the snooze button.
        </ThemedText>

        <View style={styles.optionsGrid}>
          {SNOOZE_OPTIONS.map((duration) => (
            <Pressable
              key={duration}
              onPress={() => handleSelect(duration)}
              style={[
                styles.option,
                {
                  backgroundColor:
                    selectedDuration === duration
                      ? theme.primary + "15"
                      : theme.backgroundDefault,
                  borderColor:
                    selectedDuration === duration ? theme.primary : theme.borderLight,
                },
              ]}
            >
              <ThemedText
                type="h4"
                style={{
                  color: selectedDuration === duration ? theme.primary : theme.text,
                }}
              >
                {duration >= 60 ? `${duration / 60}h` : duration}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{
                  color: selectedDuration === duration ? theme.primary : theme.textSecondary,
                }}
              >
                {duration >= 60 ? (duration === 60 ? "hour" : "hours") : "min"}
              </ThemedText>
              {selectedDuration === duration ? (
                <View style={[styles.checkmark, { backgroundColor: theme.primary }]}>
                  <Feather name="check" size={12} color={theme.buttonText} />
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="info" size={20} color={theme.info} style={{ marginRight: Spacing.sm }} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
            When you snooze a notification, it will remind you again after{" "}
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              {formatDuration(selectedDuration)}
            </ThemedText>
            .
          </ThemedText>
        </View>

        <Button onPress={handleSave} loading={isLoading} style={styles.saveButton} testID="button-save-snooze">
          Save Settings
        </Button>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  description: {
    marginBottom: Spacing["2xl"],
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  option: {
    width: "23%",
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  checkmark: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing["2xl"],
  },
  saveButton: {
    marginTop: Spacing.lg,
  },
});
