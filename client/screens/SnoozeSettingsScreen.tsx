import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const SNOOZE_OPTIONS = [10, 20, 30, 40, 50, 60, 90, 120];
const SNOOZE_DURATION_KEY = "@goflo/snooze_duration";
const DEFAULT_SNOOZE_DURATION = 60;

export default function SnoozeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [selectedDuration, setSelectedDuration] = useState(DEFAULT_SNOOZE_DURATION);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const loadSavedDuration = async () => {
      try {
        const saved = await AsyncStorage.getItem(SNOOZE_DURATION_KEY);
        if (saved) {
          const duration = parseInt(saved, 10);
          if (SNOOZE_OPTIONS.includes(duration)) {
            setSelectedDuration(duration);
          }
        }
      } catch (error) {
        console.log("Error loading snooze duration:", error);
      }
    };
    loadSavedDuration();
  }, []);

  const handleSelect = (duration: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDuration(duration);
    setIsSaved(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem(SNOOZE_DURATION_KEY, selectedDuration.toString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSaved(true);
      navigation.goBack();
    } catch (error) {
      console.error("Error saving snooze duration:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
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
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.lg,
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
              testID={`snooze-option-${duration}`}
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
      </ScrollView>
    </ThemedView>
  );
}

export async function getSnoozeDuration(): Promise<number> {
  try {
    const saved = await AsyncStorage.getItem(SNOOZE_DURATION_KEY);
    if (saved) {
      const duration = parseInt(saved, 10);
      if (SNOOZE_OPTIONS.includes(duration)) {
        return duration;
      }
    }
  } catch (error) {
    console.log("Error reading snooze duration:", error);
  }
  return DEFAULT_SNOOZE_DURATION;
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
