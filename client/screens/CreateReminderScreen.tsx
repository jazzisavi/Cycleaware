import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Pressable, Platform, ScrollView, TextInput, Modal, Alert } from "react-native";
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
import { Copy } from "@/constants/copy";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { Reminder } from "@shared/schema";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { scheduleReminderNotification } from "@/services/notifications";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "CreateCycleReminder">;

export default function CreateReminderScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const { requestPermission } = useNotificationPermission();

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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const titleInputRef = useRef<TextInput>(null);

  // Auto-focus title input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch reminder data when editing
  const { data: reminderData } = useQuery<Reminder>({
    queryKey: ["/api/reminders", reminderId],
    enabled: isEditMode && !isLoaded,
  });

  // Populate form with existing reminder data
  useEffect(() => {
    if (reminderData && isEditMode && !isLoaded) {
      setTitle(reminderData.title || "");
      setNotes(reminderData.notes || "");
      setSoundEnabled(reminderData.soundEnabled ?? true);
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

      // Parse cycle start date with smart detection
      if (reminderData.cycleStartDate) {
        const cycleStart = new Date(reminderData.cycleStartDate);
        cycleStart.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        if (cycleStart.getTime() === today.getTime()) {
          setStartsOn("today");
        } else if (cycleStart.getTime() === tomorrow.getTime()) {
          setStartsOn("tomorrow");
        } else {
          setStartsOn("on");
          setStartDate(cycleStart);
        }
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
      if (route.params.soundEnabled !== undefined) setSoundEnabled(route.params.soundEnabled);
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
      console.log("Creating reminder with data:", JSON.stringify(data));
      const response = await apiRequest("POST", "/api/reminders", data);
      console.log("Create reminder response status:", response.status);
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("Reminder created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Request notification permission and schedule notification
      await requestPermission();
      if (data.nextOccurrence) {
        await scheduleReminderNotification(
          data.id,
          data.title,
          data.notes || null,
          new Date(data.nextOccurrence),
          data.soundEnabled
        );
      }
      
      navigation.navigate("Main", { screen: "Reminders" });
    },
    onError: (error: any) => {
      console.error("Failed to create reminder:", error);
      Alert.alert("Save Error", `Failed to save: ${error?.message || String(error)}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/reminders/${reminderId}`, data);
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Request notification permission and schedule notification
      await requestPermission();
      if (data.nextOccurrence) {
        await scheduleReminderNotification(
          data.id,
          data.title,
          data.notes || null,
          new Date(data.nextOccurrence),
          data.soundEnabled
        );
      }
      
      navigation.navigate("Main", { screen: "Reminders" });
    },
    onError: (error: any) => {
      console.error("Failed to update reminder:", error);
      Alert.alert("Update Error", `Failed to update: ${error?.message || String(error)}`);
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

  const canSave = 
    title.trim() && 
    cycleDayStart !== null && 
    cycleDayEnd !== null && 
    startsOn !== null && 
    ends !== null && 
    reminderTimes.length > 0;

  const handleSave = () => {
    Alert.alert("DEBUG 1", "handleSave called");
    console.log("handleSave called, canSave:", canSave);
    console.log("Form state:", { title: title.trim(), cycleDayStart, cycleDayEnd, startsOn, ends, reminderTimesCount: reminderTimes.length });
    
    if (!canSave) {
      Alert.alert("DEBUG 2", "Validation failed - cannot save");
      console.log("Cannot save - validation failed");
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
      soundEnabled,
      isActive: true,
    };

    Alert.alert("DEBUG 3", `About to call mutation. isEditMode: ${isEditMode}`);

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
      soundEnabled,
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
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
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
            {Copy.common.save}
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
            ref={titleInputRef}
            style={[styles.titleInput, { color: theme.text }]}
            placeholder={Copy.createCycleReminder.addTitlePlaceholder}
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
            {/* Cycle start date - moved to top */}
            <Pressable 
              style={styles.groupRow}
              onPress={handleOpenRepeatingDays}
            >
              <ThemedText type="body" style={{ color: hasStartDateSet ? theme.text : theme.textSecondary }}>
                {getStartDateText()}
              </ThemedText>
            </Pressable>

            {/* Repeat on Days */}
            <Pressable 
              style={styles.groupRow}
              onPress={handleOpenRepeatingDays}
            >
              <ThemedText type="body" style={{ color: hasRepeatingDaysSet ? theme.text : theme.textSecondary }}>
                {getRepeatText()}
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
              <Pressable 
                key={index}
                style={[styles.groupRow, styles.timeRow]}
                onPress={() => handleOpenTimePicker(index)}
                testID={`time-row-${index}`}
              >
                <ThemedText type="body" style={{ color: theme.text }}>
                  {Copy.createCycleReminder.remindMeAt(formatTime(reminderTime))}
                </ThemedText>
              </Pressable>
            ))}

            {/* Add reminder time */}
            <Pressable 
              style={styles.groupRow}
              onPress={() => handleOpenTimePicker(null)}
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {Copy.createCycleReminder.addReminderTime}
              </ThemedText>
            </Pressable>
          </View>
        </View>

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
                  {Copy.createCycleReminder.setReminderTimeTitle}
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
                    {Copy.createCycleReminder.timeFormatHint}
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
                    {Copy.common.cancel}
                  </ThemedText>
                </Pressable>
                <Pressable 
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                  onPress={handleSaveTime}
                >
                  <ThemedText type="body" style={{ color: theme.buttonText, fontWeight: "600" }}>
                    {Copy.common.done}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Notes Group */}
        <View style={[styles.groupContainer, { borderBottomColor: theme.border }]}>
          <View style={[styles.groupIconContainer, { paddingTop: 0 }]}>
            <Feather name="align-left" size={20} color={theme.textSecondary} />
          </View>
          <View style={styles.groupContent}>
            <TextInput
              style={[styles.notesInput, { color: theme.text }]}
              placeholder={Copy.createCycleReminder.addNotesPlaceholder}
              placeholderTextColor={theme.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              testID="input-notes"
            />
          </View>
        </View>

        {/* Sound Group */}
        <View style={[styles.groupContainer, { borderBottomColor: theme.border }]}>
          <View style={styles.groupIconContainer}>
            <Feather name="volume-2" size={20} color={theme.textSecondary} />
          </View>
          <View style={styles.groupContent}>
            <Pressable 
              style={styles.soundRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSoundEnabled(!soundEnabled);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: soundEnabled }}
              accessibilityLabel="Make some noise"
              testID="checkbox-sound-enabled"
            >
              <View style={[
                styles.checkbox,
                { borderColor: theme.text },
                soundEnabled && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}>
                {soundEnabled ? (
                  <Feather name="check" size={14} color="#fff" />
                ) : null}
              </View>
              <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                <ThemedText type="body" style={{ color: theme.text }}>
                  {Copy.soundSettings.makeSomeNoise}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {Copy.soundSettings.playsDefaultSound}
                </ThemedText>
              </View>
            </Pressable>
          </View>
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
  soundRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
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
