import React, { useState } from "react";
import { StyleSheet, View, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { TextInput } from "@/components/TextInput";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "CreateReminder">;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CreateReminderScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();

  const reminderType = route.params?.type || "cycle";
  const isCycle = reminderType === "cycle";

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [cycleInterval, setCycleInterval] = useState(1);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [errors, setErrors] = useState<{ title?: string }>({});

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/reminders", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.popToTop();
    },
    onError: (error) => {
      console.error("Failed to create reminder:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const toggleWeekday = (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const incrementCycle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCycleInterval((prev) => Math.min(prev + 1, 365));
  };

  const decrementCycle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCycleInterval((prev) => Math.max(prev - 1, 1));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrors({ title: "Please enter a reminder title" });
      return;
    }

    if (!isCycle && selectedWeekdays.length === 0) {
      return;
    }

    const timeString = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;

    const reminderData = {
      title: title.trim(),
      notes: notes.trim() || null,
      reminderType,
      reminderTime: timeString,
      cycleIntervalDays: isCycle ? cycleInterval : null,
      weeklyRepeatDays: !isCycle ? selectedWeekdays : null,
      specificDates: null,
      isActive: true,
    };

    createMutation.mutate(reminderData);
  };

  const typeColor = isCycle ? theme.accentCoral : theme.accentMint;
  const typeLabel = isCycle ? "Cycle-Based" : "Calendar-Based";
  const typeIcon = isCycle ? "refresh-cw" : "calendar";

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Type Badge */}
        <View style={[styles.typeBadge, { backgroundColor: typeColor + "15" }]}>
          <Feather name={typeIcon} size={16} color={typeColor} />
          <ThemedText type="small" style={[styles.typeBadgeText, { color: typeColor }]}>
            {typeLabel}
          </ThemedText>
        </View>

        {/* Title Input */}
        <SectionHeader title="What do you need to remember?" />
        <TextInput
          placeholder="e.g., Take vitamins, Water plants..."
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            setErrors({});
          }}
          error={errors.title}
          testID="input-title"
        />

        {/* Notes Input */}
        <TextInput
          label="Notes (optional)"
          placeholder="Add any helpful details..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.notesInput}
          testID="input-notes"
        />

        {/* Time Selection */}
        <SectionHeader title="When should we remind you?" />
        <Pressable
          onPress={() => setShowTimePicker(true)}
          style={[styles.timeButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.borderLight }]}
        >
          <View style={[styles.timeIconContainer, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="clock" size={20} color={theme.primary} />
          </View>
          <View style={styles.timeContent}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Reminder time
            </ThemedText>
            <ThemedText type="h3">
              {formatTime(time)}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textTertiary} />
        </Pressable>

        {(showTimePicker || Platform.OS === "ios") && (
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleTimeChange}
            style={styles.timePicker}
          />
        )}

        {/* Repeat Configuration */}
        <SectionHeader title={isCycle ? "How often?" : "Which days?"} />
        
        {isCycle ? (
          <View style={styles.cycleSection}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Repeat every
            </ThemedText>
            <View style={styles.cycleControl}>
              <Pressable
                onPress={decrementCycle}
                style={[styles.cycleButton, { backgroundColor: theme.backgroundSecondary }]}
                disabled={cycleInterval <= 1}
              >
                <Feather name="minus" size={20} color={cycleInterval <= 1 ? theme.textTertiary : theme.text} />
              </Pressable>
              <View style={[styles.cycleValue, { backgroundColor: theme.backgroundDefault, borderColor: theme.primary }]}>
                <ThemedText type="h1">{cycleInterval}</ThemedText>
              </View>
              <Pressable
                onPress={incrementCycle}
                style={[styles.cycleButton, { backgroundColor: theme.backgroundSecondary }]}
                disabled={cycleInterval >= 365}
              >
                <Feather name="plus" size={20} color={cycleInterval >= 365 ? theme.textTertiary : theme.text} />
              </Pressable>
            </View>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              day{cycleInterval > 1 ? "s" : ""}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.weekdaysSection}>
            <ThemedText type="body" style={[styles.weekdaysLabel, { color: theme.textSecondary }]}>
              Select the days for this reminder
            </ThemedText>
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((day, index) => {
                const isSelected = selectedWeekdays.includes(index);
                return (
                  <Pressable
                    key={day}
                    onPress={() => toggleWeekday(index)}
                    style={[
                      styles.weekdayButton,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                        borderColor: isSelected ? theme.primary : theme.borderLight,
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        color: isSelected ? theme.buttonText : theme.text,
                        fontWeight: "600",
                      }}
                    >
                      {day}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            {selectedWeekdays.length === 0 && (
              <ThemedText type="caption" style={[styles.weekdaysHint, { color: theme.textTertiary }]}>
                Tap to select at least one day
              </ThemedText>
            )}
          </View>
        )}

        {/* Save Button */}
        <View style={styles.saveSection}>
          <Button
            onPress={handleSave}
            loading={createMutation.isPending}
            disabled={!title.trim() || (!isCycle && selectedWeekdays.length === 0)}
            testID="button-save-reminder"
          >
            Create Reminder
          </Button>
        </View>
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
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  typeBadgeText: {
    fontWeight: "600",
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: Spacing.md,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  timeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  timeContent: {
    flex: 1,
  },
  timePicker: {
    marginTop: Spacing.sm,
  },
  cycleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  cycleControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cycleButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cycleValue: {
    width: 80,
    height: 64,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdaysSection: {
    paddingVertical: Spacing.lg,
  },
  weekdaysLabel: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekdayButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdaysHint: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
  saveSection: {
    marginTop: Spacing["3xl"],
  },
});
