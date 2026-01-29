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
      navigation.goBack();
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

    const timeString = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;

    const reminderData = {
      title: title.trim(),
      notes: notes.trim() || null,
      reminderType,
      reminderTime: timeString,
      cycleIntervalDays: reminderType === "cycle" ? cycleInterval : null,
      weeklyRepeatDays: reminderType === "calendar" ? selectedWeekdays : null,
      specificDates: null,
      isActive: true,
    };

    createMutation.mutate(reminderData);
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
        <View style={[styles.typeIndicator, { backgroundColor: reminderType === "cycle" ? theme.accentCoral + "20" : theme.accentMint + "20" }]}>
          <Feather
            name={reminderType === "cycle" ? "refresh-cw" : "calendar"}
            size={16}
            color={reminderType === "cycle" ? theme.accentCoral : theme.accentMint}
          />
          <ThemedText type="small" style={{ color: reminderType === "cycle" ? theme.accentCoral : theme.accentMint, marginLeft: Spacing.xs }}>
            {reminderType === "cycle" ? "Cycle-Based Reminder" : "Calendar-Based Reminder"}
          </ThemedText>
        </View>

        <SectionHeader title="Details" />
        <TextInput
          label="Reminder Title"
          placeholder="Enter reminder title"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            setErrors({});
          }}
          error={errors.title}
          testID="input-title"
        />
        <TextInput
          label="Notes (Optional)"
          placeholder="Add any additional notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.notesInput}
          testID="input-notes"
        />

        <SectionHeader title="Time" />
        <Pressable
          onPress={() => setShowTimePicker(true)}
          style={[styles.timeButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.borderLight }]}
        >
          <Feather name="clock" size={20} color={theme.primary} />
          <ThemedText type="h3" style={{ marginLeft: Spacing.md }}>
            {formatTime(time)}
          </ThemedText>
          <View style={{ flex: 1 }} />
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

        <SectionHeader title="Repeat" />
        {reminderType === "cycle" ? (
          <View style={styles.cycleSection}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Repeat every
            </ThemedText>
            <View style={styles.cycleControl}>
              <Pressable
                onPress={decrementCycle}
                style={[styles.cycleButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="minus" size={20} color={theme.text} />
              </Pressable>
              <View style={[styles.cycleValue, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]}>
                <ThemedText type="h2">{cycleInterval}</ThemedText>
              </View>
              <Pressable
                onPress={incrementCycle}
                style={[styles.cycleButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="plus" size={20} color={theme.text} />
              </Pressable>
            </View>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              day{cycleInterval > 1 ? "s" : ""}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.weekdaysSection}>
            <ThemedText type="body" style={[styles.weekdaysLabel, { color: theme.textSecondary }]}>
              Select days of the week
            </ThemedText>
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((day, index) => (
                <Pressable
                  key={day}
                  onPress={() => toggleWeekday(index)}
                  style={[
                    styles.weekdayButton,
                    {
                      backgroundColor: selectedWeekdays.includes(index)
                        ? theme.primary
                        : theme.backgroundSecondary,
                      borderColor: selectedWeekdays.includes(index)
                        ? theme.primary
                        : theme.borderLight,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: selectedWeekdays.includes(index)
                        ? theme.buttonText
                        : theme.text,
                      fontWeight: "600",
                    }}
                  >
                    {day}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.saveSection}>
          <Button
            onPress={handleSave}
            loading={createMutation.isPending}
            disabled={!title.trim()}
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
  typeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: Spacing.md,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  timePicker: {
    marginTop: Spacing.sm,
  },
  cycleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  cycleControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cycleButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cycleValue: {
    width: 80,
    height: 60,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdaysSection: {
    paddingVertical: Spacing.lg,
  },
  weekdaysLabel: {
    marginBottom: Spacing.md,
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
  saveSection: {
    marginTop: Spacing["3xl"],
  },
});
