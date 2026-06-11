import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";

const SNOOZE_OPTIONS = [10, 20, 30, 40, 50, 60, 90, 120];
const SNOOZE_DURATION_KEY = "@goflo/snooze_duration";
const DEFAULT_SNOOZE_DURATION = 60;

export default function SnoozeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { rs } = useResponsive();
  const navigation = useNavigation();
  const [selectedDuration, setSelectedDuration] = useState(DEFAULT_SNOOZE_DURATION);
  const [isLoading, setIsLoading] = useState(false);

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
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem(SNOOZE_DURATION_KEY, selectedDuration.toString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const formatCardValue = (minutes: number) => {
    if (minutes >= 60) {
      return `${minutes / 60}h`;
    }
    return `${minutes}`;
  };

  const formatCardLabel = (minutes: number) => {
    if (minutes >= 60) {
      return minutes === 60 ? Copy.snoozeSettings.hour : Copy.snoozeSettings.hours;
    }
    return Copy.snoozeSettings.min;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing["4xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: theme.backgroundDefault }]}
            testID="button-back-snooze"
          >
            <Feather name="arrow-left" size={20} color={theme.text} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { fontSize: rs(28) }]}>
            {Copy.snoozeSettings.title}
          </ThemedText>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="info" size={18} color={theme.textSecondary} style={styles.infoIcon} />
          <ThemedText type="small" style={[styles.infoText, { color: theme.textSecondary }]}>
            {Copy.snoozeSettings.infoText}
            <ThemedText type="small" style={{ fontWeight: "700", color: theme.text }}>
              {formatDuration(selectedDuration)}
            </ThemedText>
            .
          </ThemedText>
        </View>

        <View style={styles.optionsGrid}>
          {SNOOZE_OPTIONS.map((duration) => {
            const isSelected = selectedDuration === duration;
            return (
              <Pressable
                key={duration}
                onPress={() => handleSelect(duration)}
                style={[
                  styles.option,
                  {
                    backgroundColor: isSelected
                      ? theme.pillActiveBg
                      : theme.backgroundDefault,
                    borderColor: isSelected
                      ? theme.pillActiveBorder
                      : theme.borderLight,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                testID={`snooze-option-${duration}`}
              >
                <ThemedText
                  type="h4"
                  style={{
                    color: isSelected ? theme.pillActiveBorder : theme.text,
                  }}
                >
                  {formatCardValue(duration)}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{
                    color: isSelected ? theme.pillActiveBorder : theme.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {formatCardLabel(duration)}
                </ThemedText>
                {isSelected ? (
                  <View style={[styles.checkmark, { backgroundColor: theme.pillActiveBorder }]}>
                    <Feather name="check" size={10} color={theme.buttonText} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          onPress={handleSave}
          loading={isLoading}
          style={[styles.saveButton, { backgroundColor: theme.saveButtonActive, borderRadius: BorderRadius.full }]}
          testID="button-save-snooze"
        >
          {Copy.snoozeSettings.saveButton}
        </Button>
      </View>
    </View>
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
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FontFamily.serifBold,
    fontWeight: "700",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  infoIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  option: {
    width: "23%",
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  checkmark: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  saveButton: {
    width: "100%",
  },
});
