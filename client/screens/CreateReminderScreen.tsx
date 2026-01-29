import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Platform, ScrollView, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "CreateCycleReminder">;

export default function CreateReminderScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [cycleDayStart, setCycleDayStart] = useState<number | null>(null);
  const [cycleDayEnd, setCycleDayEnd] = useState<number | null>(null);
  const [startsOn, setStartsOn] = useState<"today" | "tomorrow" | "on" | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [ends, setEnds] = useState<"never" | "on" | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [time, setTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [additionalTime, setAdditionalTime] = useState<Date | null>(null);
  const [showAdditionalTimePicker, setShowAdditionalTimePicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [alarmType, setAlarmType] = useState<"notification" | "alarm">("notification");

  useEffect(() => {
    if (route.params) {
      if (route.params.dayStart !== undefined) setCycleDayStart(route.params.dayStart);
      if (route.params.dayEnd !== undefined) setCycleDayEnd(route.params.dayEnd);
      if (route.params.startsOn !== undefined) setStartsOn(route.params.startsOn);
      if (route.params.startDate !== undefined) setStartDate(new Date(route.params.startDate));
      if (route.params.ends !== undefined) setEnds(route.params.ends);
      if (route.params.endDate !== undefined) setEndDate(new Date(route.params.endDate));
    }
  }, [route.params]);

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

  const handleAdditionalTimeChange = (event: any, selectedTime?: Date) => {
    setShowAdditionalTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setAdditionalTime(selectedTime);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSave = () => {
    if (!title.trim()) {
      return;
    }

    const timeString = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;
    
    const reminderTimesArray: string[] = [timeString];
    if (additionalTime) {
      const additionalTimeString = `${additionalTime.getHours().toString().padStart(2, "0")}:${additionalTime.getMinutes().toString().padStart(2, "0")}`;
      reminderTimesArray.push(additionalTimeString);
    }

    let cycleStartDateValue: Date;
    if (startsOn === "today") {
      cycleStartDateValue = new Date();
      cycleStartDateValue.setHours(0, 0, 0, 0);
    } else if (startsOn === "tomorrow") {
      cycleStartDateValue = new Date();
      cycleStartDateValue.setDate(cycleStartDateValue.getDate() + 1);
      cycleStartDateValue.setHours(0, 0, 0, 0);
    } else if (startsOn === "on" && startDate) {
      cycleStartDateValue = new Date(startDate);
      cycleStartDateValue.setHours(0, 0, 0, 0);
    } else {
      cycleStartDateValue = new Date();
      cycleStartDateValue.setHours(0, 0, 0, 0);
    }

    const reminderData = {
      title: title.trim(),
      notes: notes.trim() || null,
      reminderType: "cycle",
      reminderTime: timeString,
      reminderTimes: reminderTimesArray,
      cycleIntervalDays: cycleDayEnd || 28,
      cycleDayStart: cycleDayStart || 14,
      cycleDayEnd: cycleDayEnd || 28,
      cycleStartDate: cycleStartDateValue.toISOString(),
      cycleEndDate: ends === "on" && endDate ? endDate.toISOString() : null,
      alarmType,
      isActive: true,
    };

    createMutation.mutate(reminderData);
  };

  const handleOpenRepeatingDays = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("RepeatingDays", {
      dayStart: cycleDayStart || 14,
      dayEnd: cycleDayEnd || 28,
      startsOn: startsOn || "today",
      startDate: startDate?.toISOString() || new Date().toISOString(),
      ends: ends || "never",
      endDate: endDate?.toISOString() || new Date().toISOString(),
    });
  };

  const hasRepeatingDaysSet = cycleDayStart !== null && cycleDayEnd !== null;
  const hasStartDateSet = startsOn !== null;
  const hasEndDateSet = ends !== null;

  const getRepeatText = () => {
    if (hasRepeatingDaysSet) {
      return `Repeat on Day ${cycleDayStart} to ${cycleDayEnd}`;
    }
    return "Repeat on Day 14 to 28";
  };

  const getStartDateText = () => {
    if (hasStartDateSet) {
      if (startsOn === "today") return "Cycle starts today";
      if (startsOn === "tomorrow") return "Cycle starts tomorrow";
      if (startsOn === "on" && startDate) {
        return `Cycle starts ${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      }
    }
    return "Add cycle start date";
  };

  const getEndDateText = () => {
    if (hasEndDateSet) {
      if (ends === "never") return "No end date";
      if (ends === "on" && endDate) {
        return `Ends on ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      }
    }
    return "No end date";
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable 
          onPress={handleSave}
          disabled={!title.trim() || createMutation.isPending}
          style={styles.headerButton}
        >
          <ThemedText 
            type="body" 
            style={{ 
              color: title.trim() ? theme.text : theme.textTertiary,
              fontWeight: "500",
            }}
          >
            Save
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.titleInput, { color: theme.text }]}
            placeholder="Add reminder title"
            placeholderTextColor={theme.textTertiary}
            value={title}
            onChangeText={setTitle}
            testID="input-title"
          />
        </View>

        {/* Repeat on Days - navigates to RepeatingDays screen */}
        <Pressable 
          style={[styles.row, { borderBottomColor: theme.border }]}
          onPress={handleOpenRepeatingDays}
        >
          <ThemedText type="body" style={{ color: hasRepeatingDaysSet ? theme.text : theme.textSecondary }}>
            {getRepeatText()}
          </ThemedText>
        </Pressable>

        {/* Add cycle start date - navigates to RepeatingDays screen */}
        <Pressable 
          style={[styles.row, { borderBottomColor: theme.border }]}
          onPress={handleOpenRepeatingDays}
        >
          <ThemedText type="body" style={{ color: hasStartDateSet ? theme.text : theme.textSecondary }}>
            {getStartDateText()}
          </ThemedText>
        </Pressable>

        {/* No end date - navigates to RepeatingDays screen */}
        <Pressable 
          style={[styles.row, { borderBottomColor: theme.border }]}
          onPress={handleOpenRepeatingDays}
        >
          <ThemedText type="body" style={{ color: hasEndDateSet ? theme.text : theme.textSecondary }}>
            {getEndDateText()}
          </ThemedText>
        </Pressable>

        {/* Remind me at time */}
        <Pressable 
          style={[styles.row, { borderBottomColor: theme.border }]}
          onPress={() => setShowTimePicker(true)}
        >
          <ThemedText type="body" style={{ color: theme.text }}>
            Remind me at {formatTime(time)}
          </ThemedText>
        </Pressable>

        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleTimeChange}
          />
        )}

        {/* Set another reminder */}
        <Pressable 
          style={[styles.row, { borderBottomColor: theme.border }]}
          onPress={() => setShowAdditionalTimePicker(true)}
        >
          <ThemedText type="body" style={{ color: additionalTime ? theme.text : theme.textSecondary }}>
            {additionalTime ? `Additional reminder at ${formatTime(additionalTime)}` : "Set another reminder"}
          </ThemedText>
        </Pressable>

        {/* Time Picker Modal */}
        <Modal
          visible={showAdditionalTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAdditionalTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="h3" style={{ fontWeight: "600" }}>
                  Set reminder time
                </ThemedText>
              </View>
              
              {Platform.OS === "web" ? (
                <View style={styles.webTimePickerContainer}>
                  <TextInput
                    style={[styles.webTimeInput, { color: theme.text, borderColor: theme.border }]}
                    value={`${String((additionalTime || new Date()).getHours()).padStart(2, "0")}:${String((additionalTime || new Date()).getMinutes()).padStart(2, "0")}`}
                    onChangeText={(text) => {
                      const [hours, minutes] = text.split(":").map(Number);
                      if (!isNaN(hours) && !isNaN(minutes)) {
                        const newDate = new Date();
                        newDate.setHours(hours, minutes, 0, 0);
                        setAdditionalTime(newDate);
                      }
                    }}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                    Enter time in 24-hour format (e.g., 14:30)
                  </ThemedText>
                </View>
              ) : (
                <DateTimePicker
                  value={additionalTime || new Date(new Date().setHours(12, 0, 0, 0))}
                  mode="time"
                  display="spinner"
                  onChange={handleAdditionalTimeChange}
                />
              )}
              
              <View style={styles.modalButtons}>
                <Pressable 
                  style={[styles.modalButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => setShowAdditionalTimePicker(false)}
                >
                  <ThemedText type="body" style={{ color: theme.text }}>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable 
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    if (!additionalTime) {
                      setAdditionalTime(new Date(new Date().setHours(12, 0, 0, 0)));
                    }
                    setShowAdditionalTimePicker(false);
                  }}
                >
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    Done
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add medication notes */}
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <TextInput
            style={[styles.notesInput, { color: theme.text }]}
            placeholder="Add medication notes"
            placeholderTextColor={theme.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            testID="input-notes"
          />
        </View>

        {/* Alarm type */}
        <View style={styles.alarmSection}>
          <ThemedText type="body" style={[styles.alarmTitle, { color: theme.text }]}>
            Alarm type
          </ThemedText>

          <Pressable 
            style={styles.radioRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAlarmType("notification");
            }}
          >
            <View style={[
              styles.radio,
              { borderColor: theme.text },
              alarmType === "notification" && { borderColor: theme.primary },
            ]}>
              {alarmType === "notification" ? (
                <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
              ) : null}
            </View>
            <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.md }}>
              Notification
            </ThemedText>
          </Pressable>

          <Pressable 
            style={styles.radioRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAlarmType("alarm");
            }}
          >
            <View style={[
              styles.radio,
              { borderColor: theme.text },
              alarmType === "alarm" && { borderColor: theme.primary },
            ]}>
              {alarmType === "alarm" ? (
                <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
              ) : null}
            </View>
            <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.md }}>
              Alarm
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  inputContainer: {
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "600",
  },
  notesInput: {
    fontSize: 16,
    minHeight: 24,
  },
  row: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  alarmSection: {
    paddingTop: Spacing.xl,
  },
  alarmTitle: {
    fontWeight: "500",
    marginBottom: Spacing.lg,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 16,
    padding: Spacing.xl,
    width: "85%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  webTimePickerContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  webTimeInput: {
    fontSize: 32,
    fontWeight: "600",
    textAlign: "center",
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    minWidth: 150,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
});
