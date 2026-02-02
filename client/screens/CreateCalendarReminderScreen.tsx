import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Platform, ScrollView, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import type { Reminder } from "@shared/schema";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "CreateCalendarReminder">;

export default function CreateCalendarReminderScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const { requestPermission } = useNotificationPermission();

  const params = route.params || {};
  const reminderId = params.reminderId;
  const isEditMode = !!reminderId;

  const [title, setTitle] = useState("");
  const [reminderTimes, setReminderTimes] = useState<Date[]>([new Date(new Date().setHours(9, 0, 0, 0))]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [alarmType, setAlarmType] = useState<"notification" | "alarm">("notification");

  const [repeatInterval, setRepeatInterval] = useState(params.repeatInterval || 1);
  const [repeatUnit, setRepeatUnit] = useState<"week" | "day">(params.repeatUnit || "week");
  const [selectedDays, setSelectedDays] = useState<string[]>(params.selectedDays || ["mon", "thu"]);
  const [ends, setEnds] = useState<"never" | "on" | "after">(params.ends || "never");
  const [endDate, setEndDate] = useState<string>(params.endDate || new Date().toISOString());
  const [occurrences, setOccurrences] = useState(params.occurrences || 1);

  useEffect(() => {
    if (params.repeatInterval !== undefined) setRepeatInterval(params.repeatInterval);
    if (params.repeatUnit !== undefined) setRepeatUnit(params.repeatUnit);
    if (params.selectedDays !== undefined) setSelectedDays(params.selectedDays);
    if (params.ends !== undefined) setEnds(params.ends);
    if (params.endDate !== undefined) setEndDate(params.endDate);
    if (params.occurrences !== undefined) setOccurrences(params.occurrences);
  }, [params]);

  const { data: existingReminder } = useQuery<Reminder>({
    queryKey: ["/api/reminders", reminderId],
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingReminder && isEditMode) {
      setTitle(existingReminder.title);
      setNotes(existingReminder.notes || "");
      setAlarmType((existingReminder.alarmType as "notification" | "alarm") || "notification");
      
      if (existingReminder.reminderTimes && existingReminder.reminderTimes.length > 0) {
        const times = existingReminder.reminderTimes.map((t) => {
          const [hours, minutes] = t.split(":").map(Number);
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          return date;
        });
        setReminderTimes(times);
      }
    }
  }, [existingReminder, isEditMode]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/reminders", data);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      requestPermission();
      navigation.navigate("Main", { screen: "Reminders" });
    },
    onError: (error) => {
      console.error("Failed to create reminder:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/reminders/${reminderId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("Main", { screen: "Reminders" });
    },
    onError: (error) => {
      console.error("Failed to update reminder:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/reminders/${reminderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("Main", { screen: "Reminders" });
    },
    onError: (error) => {
      console.error("Failed to delete reminder:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
      if (event.type === "set" && selectedTime) {
        if (editingTimeIndex !== null && editingTimeIndex < reminderTimes.length) {
          const newTimes = [...reminderTimes];
          newTimes[editingTimeIndex] = selectedTime;
          setReminderTimes(newTimes);
        } else {
          setReminderTimes([...reminderTimes, selectedTime]);
        }
        setEditingTimeIndex(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else if (selectedTime) {
      setTempTime(selectedTime);
    }
  };

  const handleOpenTimePicker = (index: number | null) => {
    if (index !== null && index < reminderTimes.length) {
      setTempTime(reminderTimes[index]);
    } else {
      setTempTime(new Date(new Date().setHours(12, 0, 0, 0)));
    }
    setEditingTimeIndex(index);
    setShowTimePicker(true);
  };

  const handleSaveTime = () => {
    if (editingTimeIndex !== null && editingTimeIndex < reminderTimes.length) {
      const newTimes = [...reminderTimes];
      newTimes[editingTimeIndex] = tempTime;
      setReminderTimes(newTimes);
    } else {
      setReminderTimes([...reminderTimes, tempTime]);
    }
    setShowTimePicker(false);
    setEditingTimeIndex(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveTime = (index: number) => {
    setReminderTimes(reminderTimes.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const DAY_NAMES: Record<string, string> = {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  };

  const getRepeatFrequencyDisplay = () => {
    const unit = repeatUnit === "week" ? "week" : "day";
    const plural = repeatInterval > 1 ? "s" : "";
    let display = `Every ${repeatInterval} ${unit}${plural}`;
    
    if (repeatUnit === "week" && selectedDays.length > 0) {
      const dayNames = selectedDays.map(d => DAY_NAMES[d] || d).join(", ");
      display += ` on ${dayNames}`;
    }
    
    return display;
  };

  const getEndDateDisplay = () => {
    if (ends === "never") {
      return "No end date";
    } else if (ends === "on") {
      return `Ends on ${formatDate(endDate)}`;
    } else {
      return `Ends after ${occurrences} occurrence${occurrences > 1 ? "s" : ""}`;
    }
  };

  const calculateStartDate = () => {
    return new Date().toISOString();
  };

  const handleSave = () => {
    if (!title.trim() || reminderTimes.length === 0) {
      return;
    }

    const reminderTimesArray = reminderTimes.map((t) => 
      `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`
    );
    const primaryTimeString = reminderTimesArray[0] || "09:00";

    const reminderData = {
      title: title.trim(),
      notes: notes.trim() || null,
      reminderType: "calendar",
      reminderTime: primaryTimeString,
      reminderTimes: reminderTimesArray,
      alarmType,
      isActive: true,
      weeklyRepeatDays: selectedDays,
      repeatInterval,
      repeatUnit,
      calendarStartDate: calculateStartDate(),
      calendarEndDate: ends === "on" ? endDate : null,
      calendarEndsType: ends,
      maxOccurrences: ends === "after" ? occurrences : null,
    };

    if (isEditMode) {
      updateMutation.mutate(reminderData);
    } else {
      createMutation.mutate(reminderData);
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteMutation.mutate();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {(() => {
          const hasTitle = title.trim().length > 0;
          const hasTimes = reminderTimes.length > 0;
          const hasDays = repeatUnit === "day" || selectedDays.length > 0;
          const hasValidEnds = ends === "never" || 
            (ends === "on" && endDate) || 
            (ends === "after" && occurrences > 0);
          const canSave = hasTitle && hasTimes && hasDays && hasValidEnds && !isSaving;
          
          return (
            <Pressable 
              onPress={handleSave}
              disabled={!canSave}
              style={[styles.headerButton, { opacity: canSave ? 1 : 0.4 }]}
            >
              <ThemedText 
                type="body" 
                style={{ 
                  color: canSave ? theme.text : theme.textTertiary,
                  fontWeight: "500",
                }}
              >
                Save
              </ThemedText>
            </Pressable>
          );
        })()}
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

        {/* Repeats frequency */}
        <Pressable 
          style={[styles.row, { borderBottomColor: theme.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("RepeatFrequency", {
              reminderId,
              repeatInterval,
              repeatUnit,
              selectedDays,
              ends,
              endDate,
              occurrences,
            });
          }}
        >
          <ThemedText type="body" style={{ color: theme.text }}>
            {getRepeatFrequencyDisplay()}
          </ThemedText>
        </Pressable>

        {/* End date */}
        <Pressable 
          style={[styles.row, { borderBottomColor: theme.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("RepeatFrequency", {
              reminderId,
              repeatInterval,
              repeatUnit,
              selectedDays,
              ends,
              endDate,
              occurrences,
            });
          }}
        >
          <ThemedText type="body" style={{ color: theme.text }}>
            {getEndDateDisplay()}
          </ThemedText>
        </Pressable>

        {/* Reminder times */}
        {reminderTimes.map((reminderTime, index) => (
          <View 
            key={index}
            style={[styles.row, styles.timeRow, { borderBottomColor: theme.border }]}
          >
            <Pressable 
              style={{ flex: 1 }}
              onPress={() => handleOpenTimePicker(index)}
              testID={`time-row-${index}`}
            >
              <ThemedText type="body" style={{ color: theme.text }}>
                Remind me at {formatTime(reminderTime)}
              </ThemedText>
            </Pressable>
            <Pressable 
              onPress={() => handleRemoveTime(index)}
              style={[styles.removeButton, { backgroundColor: theme.backgroundSecondary, borderRadius: 12 }]}
              testID={`remove-time-${index}`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        ))}

        {/* Add reminder time */}
        <Pressable 
          style={[styles.row, { borderBottomColor: theme.border }]}
          onPress={() => handleOpenTimePicker(null)}
        >
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Add reminder time
          </ThemedText>
        </Pressable>

        {/* Time Picker - Android uses native picker, iOS/web use modal */}
        {showTimePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={tempTime}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}

        {/* Time Picker Modal for iOS and Web */}
        <Modal
          visible={showTimePicker && Platform.OS !== "android"}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
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
                    value={`${String(tempTime.getHours()).padStart(2, "0")}:${String(tempTime.getMinutes()).padStart(2, "0")}`}
                    onChangeText={(text) => {
                      const [hours, minutes] = text.split(":").map(Number);
                      if (!isNaN(hours) && !isNaN(minutes)) {
                        const newDate = new Date();
                        newDate.setHours(hours, minutes, 0, 0);
                        setTempTime(newDate);
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
                  value={tempTime}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                />
              )}
              
              <View style={styles.modalButtons}>
                <Pressable 
                  style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <ThemedText type="body" style={{ color: theme.text }}>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable 
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                  onPress={handleSaveTime}
                >
                  <ThemedText type="body" style={{ color: theme.buttonText, fontWeight: "600" }}>
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

        {/* Delete button - only show in edit mode */}
        {isEditMode ? (
          <Pressable 
            style={[styles.deleteButton, { borderColor: theme.error }]}
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
            testID="button-delete"
          >
            <ThemedText type="body" style={{ color: theme.error, fontWeight: "500" }}>
              Delete Reminder
            </ThemedText>
          </Pressable>
        ) : null}
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
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  removeButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
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
  deleteButton: {
    marginTop: Spacing["2xl"],
    paddingVertical: Spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
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
