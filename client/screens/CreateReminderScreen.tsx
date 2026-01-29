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
import { Spacing, Colors } from "@/constants/theme";
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

  const reminderId = route.params?.reminderId;
  const isEditMode = !!reminderId;

  const [title, setTitle] = useState("");
  const [cycleDayStart, setCycleDayStart] = useState<number | null>(14);
  const [cycleDayEnd, setCycleDayEnd] = useState<number | null>(28);
  const [startsOn, setStartsOn] = useState<"today" | "tomorrow" | "on" | null>("today");
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [ends, setEnds] = useState<"never" | "on" | null>("never");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reminderTimes, setReminderTimes] = useState<Date[]>([new Date(new Date().setHours(9, 0, 0, 0))]);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [tempTime, setTempTime] = useState<Date>(new Date(new Date().setHours(9, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [alarmType, setAlarmType] = useState<"notification" | "alarm">("notification");
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch reminder data when editing
  const { data: reminderData } = useQuery({
    queryKey: ["/api/reminders", reminderId],
    enabled: isEditMode && !isLoaded,
  });

  // Populate form with existing reminder data
  useEffect(() => {
    if (reminderData && isEditMode && !isLoaded) {
      setTitle(reminderData.title || "");
      setNotes(reminderData.notes || "");
      setAlarmType(reminderData.alarmType || "notification");
      setCycleDayStart(reminderData.cycleDayStart || 14);
      setCycleDayEnd(reminderData.cycleDayEnd || 28);
      
      // Parse reminder times
      if (reminderData.reminderTimes && reminderData.reminderTimes.length > 0) {
        const times = reminderData.reminderTimes.map((t: string) => {
          const [hours, minutes] = t.split(":").map(Number);
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          return date;
        });
        setReminderTimes(times);
      }

      // Parse cycle start date
      if (reminderData.cycleStartDate) {
        const cycleStart = new Date(reminderData.cycleStartDate);
        setStartsOn("on");
        setStartDate(cycleStart);
      }

      // Parse cycle end date
      if (reminderData.cycleEndDate) {
        setEnds("on");
        setEndDate(new Date(reminderData.cycleEndDate));
      } else {
        setEnds("never");
      }

      setIsLoaded(true);
    }
  }, [reminderData, isEditMode, isLoaded]);

  // Handle params from RepeatingDays screen
  useEffect(() => {
    if (route.params && !isEditMode) {
      if (route.params.title !== undefined) setTitle(route.params.title);
      if (route.params.notes !== undefined) setNotes(route.params.notes);
      if (route.params.alarmType !== undefined) setAlarmType(route.params.alarmType);
      if (route.params.reminderTimes !== undefined) {
        const times = route.params.reminderTimes.map((t) => {
          const [hours, minutes] = t.split(":").map(Number);
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          return date;
        });
        if (times.length > 0) setReminderTimes(times);
      }
      if (route.params.dayStart !== undefined) setCycleDayStart(route.params.dayStart);
      if (route.params.dayEnd !== undefined) setCycleDayEnd(route.params.dayEnd);
      if (route.params.startsOn !== undefined) setStartsOn(route.params.startsOn);
      if (route.params.startDate !== undefined) setStartDate(new Date(route.params.startDate));
      if (route.params.ends !== undefined) setEnds(route.params.ends);
      if (route.params.endDate !== undefined) setEndDate(new Date(route.params.endDate));
    }
  }, [route.params, isEditMode]);

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

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/reminders/${reminderId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.popToTop();
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
      navigation.popToTop();
    },
    onError: (error) => {
      console.error("Failed to delete reminder:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS !== "ios") {
      setShowTimePicker(false);
    }
    if (selectedTime) {
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

  const canSave = 
    title.trim() && 
    cycleDayStart !== null && 
    cycleDayEnd !== null && 
    startsOn !== null && 
    ends !== null && 
    reminderTimes.length > 0;

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    const reminderTimesArray: string[] = reminderTimes.map((t) => 
      `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`
    );
    
    const primaryTimeString = reminderTimesArray[0] || "09:00";

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

    const reminderDataPayload = {
      title: title.trim(),
      notes: notes.trim() || null,
      reminderType: "cycle",
      reminderTime: primaryTimeString,
      reminderTimes: reminderTimesArray,
      cycleIntervalDays: cycleDayEnd || 28,
      cycleDayStart: cycleDayStart || 14,
      cycleDayEnd: cycleDayEnd || 28,
      cycleStartDate: cycleStartDateValue.toISOString(),
      cycleEndDate: ends === "on" && endDate ? endDate.toISOString() : null,
      alarmType,
      isActive: true,
    };

    if (isEditMode) {
      updateMutation.mutate(reminderDataPayload);
    } else {
      createMutation.mutate(reminderDataPayload);
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteMutation.mutate();
  };

  const handleOpenRepeatingDays = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const reminderTimesStrings = reminderTimes.map((t) => 
      `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`
    );
    navigation.navigate("RepeatingDays", {
      title,
      notes,
      reminderTimes: reminderTimesStrings,
      alarmType,
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
    return "Add days of cycle";
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
    return "Add end date";
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
          disabled={!canSave || createMutation.isPending}
          style={styles.headerButton}
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

        {/* Cycle Settings Group */}
        <View style={[styles.groupContainer, { borderBottomColor: theme.border }]}>
          <View style={styles.groupIconContainer}>
            <Feather name="refresh-cw" size={20} color={theme.textSecondary} />
          </View>
          <View style={styles.groupContent}>
            {/* Repeat on Days */}
            <Pressable 
              style={styles.groupRow}
              onPress={handleOpenRepeatingDays}
            >
              <ThemedText type="body" style={{ color: hasRepeatingDaysSet ? theme.text : theme.textSecondary }}>
                {getRepeatText()}
              </ThemedText>
            </Pressable>

            {/* Add cycle start date */}
            <Pressable 
              style={styles.groupRow}
              onPress={handleOpenRepeatingDays}
            >
              <ThemedText type="body" style={{ color: hasStartDateSet ? theme.text : theme.textSecondary }}>
                {getStartDateText()}
              </ThemedText>
            </Pressable>

            {/* End date */}
            <Pressable 
              style={styles.groupRow}
              onPress={handleOpenRepeatingDays}
            >
              <ThemedText type="body" style={{ color: hasEndDateSet ? theme.text : theme.textSecondary }}>
                {getEndDateText()}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Reminder Times Group */}
        <View style={[styles.groupContainer, { borderBottomColor: theme.border }]}>
          <View style={styles.groupIconContainer}>
            <Feather name="bell" size={20} color={theme.textSecondary} />
          </View>
          <View style={styles.groupContent}>
            {/* Existing reminder times */}
            {reminderTimes.map((reminderTime, index) => (
              <View 
                key={index}
                style={[styles.groupRow, styles.timeRow]}
              >
                <Pressable 
                  style={{ flex: 1 }}
                  onPress={() => handleOpenTimePicker(index)}
                >
                  <ThemedText type="body" style={{ color: theme.text }}>
                    Remind me at {formatTime(reminderTime)}
                  </ThemedText>
                </Pressable>
                <Pressable 
                  onPress={() => handleRemoveTime(index)}
                  style={styles.removeButton}
                >
                  <Feather name="x" size={20} color={theme.textSecondary} />
                </Pressable>
              </View>
            ))}

            {/* Add reminder time */}
            <Pressable 
              style={styles.groupRow}
              onPress={() => handleOpenTimePicker(null)}
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Add reminder time
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Time Picker Modal */}
        <Modal
          visible={showTimePicker}
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
                    Enter time in 24-hour format (e.g., 09:00)
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

        {/* Delete Button - only shown in edit mode */}
        {isEditMode ? (
          <Pressable
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
            testID="button-delete-reminder"
          >
            <ThemedText type="body" style={{ color: Colors.light.error, fontWeight: "500" }}>
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
  groupContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: Spacing.md,
  },
  groupIconContainer: {
    width: 32,
    paddingTop: Spacing.sm,
  },
  groupContent: {
    flex: 1,
  },
  groupRow: {
    paddingVertical: Spacing.sm,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  removeButton: {
    padding: Spacing.xs,
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
  deleteButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
});
