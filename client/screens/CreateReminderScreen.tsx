import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Pressable, Platform, ScrollView, TextInput as RNTextInput, Modal, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { syncAllNotifications, cancelPendingNotificationsForReminder } from "@/services/notifications";
import { LocalDatabase } from "@/services/LocalDatabase";
import { useLocalReminder } from "@/hooks/useLocalReminders";
import { syncCycleConfigsToServer } from "@/services/pushSync";
import { AlarmService } from "@/services/AlarmService";

type FrequencyType = "cycle" | "interval" | "weekdays" | null;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "CreateReminder">;

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const SOUND_LABELS: Record<string, string> = {
  morning_glory: "Morning Glory",
  alarm_clock: "Alarm Clock",
  birdsong: "Birdsong",
  marimba: "Marimba",
  xylophone: "Xylophone",
  piano: "Piano",
  harp: "Harp",
  gentle_chime: "Gentle Chime",
};

const SNOOZE_KEY = "@goflo/snooze_duration";

export default function CreateReminderScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { requestPermission } = useNotificationPermission();

  const reminderId = route.params?.reminderId;
  const isEditMode = !!reminderId;

  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<FrequencyType>(null);

  const [cycleLength, setCycleLength] = useState(28);
  const [cycleDayStart, setCycleDayStart] = useState(14);
  const [cycleDayEnd, setCycleDayEnd] = useState(28);
  const [cycleStartDate, setCycleStartDate] = useState<Date | null>(null);

  const [intervalDays, setIntervalDays] = useState(1);

  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [reminderTimes, setReminderTimes] = useState<Date[]>([]);
  const [notes, setNotes] = useState("");
  const [soundName, setSoundName] = useState("Gentle Chime");
  const [snoozeDuration, setSnoozeDuration] = useState("1 hour");
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [tempTime, setTempTime] = useState<Date>(new Date(new Date().setHours(9, 0, 0, 0)));
  const [showDatePicker, setShowDatePicker] = useState<"cycleStart" | "start" | "end" | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [showNotesInput, setShowNotesInput] = useState(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { reminder: reminderData } = useLocalReminder(isEditMode ? reminderId : undefined);

  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        try {
          const sound = await AlarmService.getSelectedSound();
          setSoundName(SOUND_LABELS[sound] || "Gentle Chime");
          const snooze = await AsyncStorage.getItem(SNOOZE_KEY);
          if (snooze) {
            const mins = parseInt(snooze, 10);
            if (mins >= 60) {
              setSnoozeDuration(`${mins / 60} hour${mins > 60 ? "s" : ""}`);
            } else {
              setSnoozeDuration(`${mins} min`);
            }
          }
        } catch (_e) {}
      };
      loadSettings();
    }, [])
  );

  useEffect(() => {
    if (reminderData && isEditMode && !isLoaded) {
      setTitle(reminderData.title || "");
      setNotes(reminderData.notes || "");

      if (reminderData.reminderTimes && reminderData.reminderTimes.length > 0) {
        const times = reminderData.reminderTimes.map((t: string) => {
          const [hours, minutes] = t.split(":").map(Number);
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          return date;
        });
        setReminderTimes(times);
      }

      if (reminderData.reminderType === "cycle") {
        setFrequency("cycle");
        setCycleLength(reminderData.cycleIntervalDays || 28);
        setCycleDayStart(reminderData.cycleDayStart || 14);
        setCycleDayEnd(reminderData.cycleDayEnd || 28);
        if (reminderData.cycleStartDate) {
          setCycleStartDate(new Date(reminderData.cycleStartDate));
        }
        if (reminderData.cycleEndDate) {
          setEndDate(new Date(reminderData.cycleEndDate));
        }
      } else if (reminderData.reminderType === "calendar") {
        if (reminderData.repeatUnit === "day") {
          setFrequency("interval");
          setIntervalDays(reminderData.repeatInterval || 1);
        } else {
          setFrequency("weekdays");
          setSelectedWeekdays(reminderData.weeklyRepeatDays || []);
        }
        if (reminderData.calendarStartDate) {
          setStartDate(new Date(reminderData.calendarStartDate));
        }
        if (reminderData.calendarEndDate) {
          setEndDate(new Date(reminderData.calendarEndDate));
        }
      }

      setIsLoaded(true);
    }
  }, [reminderData, isEditMode, isLoaded]);

  const handleFrequencyChange = (f: FrequencyType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (f === frequency) return;
    setFrequency(f);
    setCycleLength(28);
    setCycleDayStart(14);
    setCycleDayEnd(28);
    setCycleStartDate(null);
    setIntervalDays(1);
    setSelectedWeekdays([]);
    setStartDate(null);
    setEndDate(null);
  };

  const toggleWeekday = (day: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleOpenTimePicker = (index: number | null) => {
    if (index !== null && index < reminderTimes.length) {
      setTempTime(reminderTimes[index]);
    } else {
      setTempTime(new Date(new Date().setHours(9, 0, 0, 0)));
    }
    setEditingTimeIndex(index);
    setShowTimePicker(true);
  };

  const handleTimeChange = (_event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
      if (_event.type === "set" && selectedTime) {
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

  const handleOpenDatePicker = (type: "cycleStart" | "start" | "end") => {
    if (type === "cycleStart") {
      setTempDate(cycleStartDate || new Date());
    } else if (type === "start") {
      setTempDate(startDate || new Date());
    } else {
      setTempDate(endDate || new Date());
    }
    setShowDatePicker(type);
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(null);
      if (_event.type === "set" && selectedDate) {
        applyDate(selectedDate);
      }
    } else if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const applyDate = (date: Date) => {
    if (showDatePicker === "cycleStart") {
      setCycleStartDate(date);
    } else if (showDatePicker === "start") {
      setStartDate(date);
    } else if (showDatePicker === "end") {
      setEndDate(date);
    }
  };

  const handleSaveDate = () => {
    applyDate(tempDate);
    setShowDatePicker(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const canSave = title.trim() && frequency !== null;

  const handleSave = async () => {
    if (!canSave || isSaving) return;
    setIsSaving(true);

    try {
      const reminderTimesArray: string[] = reminderTimes.map((t) =>
        `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`
      );
      const primaryTime = reminderTimesArray[0] || "09:00";

      let payload: any = {
        title: title.trim(),
        notes: notes.trim() || null,
        reminderTime: primaryTime,
        reminderTimes: reminderTimesArray.length > 0 ? reminderTimesArray : ["09:00"],
        soundEnabled: false,
        isActive: true,
      };

      if (frequency === "cycle") {
        const cycleStart = cycleStartDate || new Date();
        cycleStart.setHours(0, 0, 0, 0);
        payload = {
          ...payload,
          reminderType: "cycle" as const,
          cycleIntervalDays: cycleLength,
          cycleDayStart,
          cycleDayEnd,
          cycleStartDate: cycleStart.toISOString(),
          cycleEndDate: endDate ? endDate.toISOString() : null,
        };
      } else if (frequency === "interval") {
        const start = startDate || new Date();
        start.setHours(0, 0, 0, 0);
        payload = {
          ...payload,
          reminderType: "calendar" as const,
          repeatUnit: "day",
          repeatInterval: intervalDays,
          calendarStartDate: start.toISOString(),
          calendarEndDate: endDate ? endDate.toISOString() : null,
          calendarEndsType: endDate ? "on" : "never",
        };
      } else if (frequency === "weekdays") {
        const start = startDate || new Date();
        start.setHours(0, 0, 0, 0);
        payload = {
          ...payload,
          reminderType: "calendar" as const,
          repeatUnit: "week",
          repeatInterval: 1,
          weeklyRepeatDays: selectedWeekdays.length > 0 ? selectedWeekdays : ["mon"],
          calendarStartDate: start.toISOString(),
          calendarEndDate: endDate ? endDate.toISOString() : null,
          calendarEndsType: endDate ? "on" : "never",
        };
      }

      let savedReminder;
      if (isEditMode) {
        savedReminder = LocalDatabase.updateReminder(reminderId!, payload);
      } else {
        savedReminder = LocalDatabase.createReminder(payload);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await requestPermission();
      if (savedReminder) {
        await syncAllNotifications();
      }
      if (frequency === "cycle") {
        syncCycleConfigsToServer();
      }

      navigation.navigate("Main", { screen: "Reminders" });
    } catch (error: any) {
      console.error("Failed to save reminder:", error);
      const msg = `Failed to save: ${error?.message || String(error)}`;
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Save Error", msg);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await cancelPendingNotificationsForReminder(reminderId!);
      LocalDatabase.deleteReminder(reminderId!);
      syncCycleConfigsToServer();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("Main", { screen: "Reminders" });
    } catch (error) {
      console.error("Failed to delete reminder:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const iconColor = useCallback((hasData: boolean) => {
    return hasData ? "#E8614F" : "#6B5744";
  }, []);

  const renderStepper = (value: number, onDecrement: () => void, onIncrement: () => void, unitLabel: string, onChangeValue: (v: number) => void, min: number = 1, max: number = 999) => (
    <View style={styles.stepperContainer}>
      <View style={[styles.stepperValueBox, { borderColor: theme.border }]}>
        <RNTextInput
          style={[styles.stepperValueInput, { color: theme.text, fontFamily: FontFamily.serifBold }]}
          keyboardType="number-pad"
          value={String(value)}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            if (!isNaN(num)) {
              onChangeValue(Math.max(min, Math.min(max, num)));
            } else if (text === "") {
              onChangeValue(min);
            }
          }}
          selectTextOnFocus
        />
        <ThemedText type="caption" style={[styles.stepperUnit, { color: "#6B5744" }]}>{unitLabel}</ThemedText>
      </View>
      <Pressable
        style={[styles.stepperButton, { borderColor: theme.border }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDecrement(); }}
      >
        <Feather name="minus" size={18} color={theme.text} />
      </Pressable>
      <Pressable
        style={[styles.stepperButton, { borderColor: theme.border }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onIncrement(); }}
      >
        <Feather name="plus" size={18} color={theme.text} />
      </Pressable>
    </View>
  );

  const renderDetailRow = (
    iconName: keyof typeof Feather.glyphMap,
    label: string,
    subtitle: string,
    hasData: boolean,
    onPress: () => void,
    showChevron: boolean = true,
    extra?: React.ReactNode,
  ) => (
    <Pressable style={styles.detailRow} onPress={onPress} testID={`row-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <View style={[styles.detailIconContainer, { backgroundColor: hasData ? "#FDEEE9" : "#F0EBE3" }]}>
        <Feather name={iconName} size={18} color={iconColor(hasData)} />
      </View>
      <View style={styles.detailContent}>
        <ThemedText type="body" style={[styles.detailLabel, { fontFamily: FontFamily.sansSemiBold }]}>{label}</ThemedText>
        <ThemedText type="small" style={{ color: "#6B5744" }}>{subtitle}</ThemedText>
      </View>
      {extra}
      {showChevron ? <Feather name="chevron-right" size={20} color="#6B5744" /> : null}
    </Pressable>
  );

  const renderFrequencyPill = (type: FrequencyType, label: string) => {
    const isActive = frequency === type;
    return (
      <Pressable
        style={[
          styles.pill,
          { borderColor: isActive ? "#E8614F" : theme.border },
          isActive && { backgroundColor: "#F9E8E4" },
        ]}
        onPress={() => handleFrequencyChange(type)}
        testID={`pill-${type}`}
      >
        {isActive ? <Feather name="check" size={14} color="#E8614F" style={{ marginRight: 4 }} /> : null}
        <ThemedText type="small" style={[styles.pillText, isActive && { color: "#E8614F" }]}>{label}</ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton} testID="button-close">
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h1" style={styles.headerTitle}>
          {isEditMode ? Copy.createReminder.editHeaderTitle : Copy.createReminder.headerTitle}
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.nameCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <RNTextInput
            style={[styles.nameInput, { color: theme.text, fontFamily: FontFamily.sansRegular }]}
            placeholder={Copy.createReminder.namePlaceholder}
            placeholderTextColor="#6B5744"
            value={title}
            onChangeText={setTitle}
            testID="input-title"
          />
        </View>

        <View style={styles.frequencySection}>
          <View style={styles.frequencyHeader}>
            <ThemedText type="h2" style={styles.sectionTitle}>{Copy.createReminder.frequencyTitle}</ThemedText>
            <ThemedText type="caption" style={[styles.chooseOneLabel, { color: "#6B5744" }]}>{Copy.createReminder.chooseOne}</ThemedText>
          </View>
          <View style={styles.pillRow}>
            {renderFrequencyPill("cycle", Copy.createReminder.cyclePill)}
            {renderFrequencyPill("interval", Copy.createReminder.intervalPill)}
            {renderFrequencyPill("weekdays", Copy.createReminder.weekdaysPill)}
          </View>
        </View>

        {frequency === "cycle" ? (
          <>
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="h4" style={styles.cardTitle}>{Copy.createReminder.cycleLength}</ThemedText>
              <ThemedText type="small" style={[styles.cardDescription, { color: "#6B5744" }]}>
                {Copy.createReminder.cycleLengthDescription}
              </ThemedText>
              {renderStepper(
                cycleLength,
                () => setCycleLength(Math.max(1, cycleLength - 1)),
                () => setCycleLength(cycleLength + 1),
                Copy.createReminder.daysLabel,
                setCycleLength,
              )}

              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

              <ThemedText type="h4" style={styles.cardTitle}>{Copy.createReminder.dayRange}</ThemedText>
              <ThemedText type="small" style={[styles.cardDescription, { color: "#6B5744" }]}>
                {Copy.createReminder.dayRangeDescription}
              </ThemedText>
              <View style={styles.dayRangeRow}>
                <View style={styles.dayRangeItem}>
                  <ThemedText type="caption" style={[styles.dayRangeLabel, { color: "#6B5744" }]}>{Copy.createReminder.fromDay}</ThemedText>
                  <View style={[styles.dayRangeInput, { borderColor: theme.border }]}>
                    <RNTextInput
                      style={[styles.dayRangeInputText, { color: theme.text, fontFamily: FontFamily.serifBold }]}
                      keyboardType="number-pad"
                      value={String(cycleDayStart)}
                      onChangeText={(text) => {
                        const num = parseInt(text, 10);
                        if (!isNaN(num)) setCycleDayStart(Math.max(1, Math.min(cycleLength, num)));
                        else if (text === "") setCycleDayStart(1);
                      }}
                      selectTextOnFocus
                    />
                  </View>
                  <View style={styles.dayRangeSteppers}>
                    <Pressable onPress={() => setCycleDayStart(Math.max(1, cycleDayStart - 1))}>
                      <Feather name="minus" size={16} color={theme.text} />
                    </Pressable>
                    <Pressable onPress={() => setCycleDayStart(Math.min(cycleLength, cycleDayStart + 1))}>
                      <Feather name="plus" size={16} color={theme.text} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.dayRangeItem}>
                  <ThemedText type="caption" style={[styles.dayRangeLabel, { color: "#6B5744" }]}>{Copy.createReminder.toDay}</ThemedText>
                  <View style={[styles.dayRangeInput, { borderColor: theme.border }]}>
                    <RNTextInput
                      style={[styles.dayRangeInputText, { color: theme.text, fontFamily: FontFamily.serifBold }]}
                      keyboardType="number-pad"
                      value={String(cycleDayEnd)}
                      onChangeText={(text) => {
                        const num = parseInt(text, 10);
                        if (!isNaN(num)) setCycleDayEnd(Math.max(cycleDayStart, Math.min(cycleLength, num)));
                        else if (text === "") setCycleDayEnd(cycleDayStart);
                      }}
                      selectTextOnFocus
                    />
                  </View>
                  <View style={styles.dayRangeSteppers}>
                    <Pressable onPress={() => setCycleDayEnd(Math.max(cycleDayStart, cycleDayEnd - 1))}>
                      <Feather name="minus" size={16} color={theme.text} />
                    </Pressable>
                    <Pressable onPress={() => setCycleDayEnd(Math.min(cycleLength, cycleDayEnd + 1))}>
                      <Feather name="plus" size={16} color={theme.text} />
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

              <Pressable style={styles.dateRow} onPress={() => handleOpenDatePicker("cycleStart")}>
                <Feather name="calendar" size={20} color={iconColor(!!cycleStartDate)} />
                <View style={styles.dateRowText}>
                  <ThemedText type="body" style={{ fontFamily: FontFamily.sansSemiBold }}>{Copy.createReminder.cycleStart}</ThemedText>
                  <ThemedText type="small" style={{ color: "#6B5744" }}>
                    {cycleStartDate ? formatDate(cycleStartDate) : Copy.createReminder.selectDate}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={20} color="#6B5744" />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

              {renderTimeRows()}
              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
              {renderDetailRow("edit-3", Copy.createReminder.doseNotes, notes || Copy.createReminder.doseNotesPlaceholder, !!notes, () => setShowNotesInput(true))}
              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
              {renderDetailRow("volume-2", Copy.createReminder.notificationSound, soundName, true, () => navigation.navigate("AlarmSounds"))}
              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
              {renderDetailRow("clock", Copy.createReminder.snoozeDuration, snoozeDuration, true, () => navigation.navigate("SnoozeSettings"))}
              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
              {renderDetailRow("calendar", Copy.createReminder.endDate, endDate ? formatDate(endDate) : Copy.common.never, !!endDate, () => handleOpenDatePicker("end"))}
            </View>
          </>
        ) : null}

        {frequency === "interval" ? (
          <>
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="body" style={{ fontFamily: FontFamily.sansSemiBold, marginBottom: Spacing.md }}>{Copy.createReminder.repeatsEvery}</ThemedText>
              {renderStepper(
                intervalDays,
                () => setIntervalDays(Math.max(1, intervalDays - 1)),
                () => setIntervalDays(intervalDays + 1),
                Copy.createReminder.daysUnit,
                setIntervalDays,
              )}

              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

              {renderDetailRow("calendar", Copy.createReminder.start, startDate ? formatDate(startDate) : Copy.createReminder.selectDate, !!startDate, () => handleOpenDatePicker("start"))}
              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
              {renderTimeRows()}
              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
              {renderDetailRow("edit-3", Copy.createReminder.doseNotes, notes || Copy.createReminder.doseNotesPlaceholder, !!notes, () => setShowNotesInput(true))}
              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
              {renderDetailRow("volume-2", Copy.createReminder.notificationSound, soundName, true, () => navigation.navigate("AlarmSounds"))}
              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
              {renderDetailRow("clock", Copy.createReminder.snoozeDuration, snoozeDuration, true, () => navigation.navigate("SnoozeSettings"))}
              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
              {renderDetailRow("calendar", Copy.createReminder.endDate, endDate ? formatDate(endDate) : Copy.common.never, !!endDate, () => handleOpenDatePicker("end"))}
            </View>
          </>
        ) : null}

        {frequency === "weekdays" ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="body" style={{ fontFamily: FontFamily.sansSemiBold, marginBottom: Spacing.md }}>{Copy.createReminder.repeatOn}</ThemedText>
            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, index) => {
                const key = WEEKDAY_KEYS[index];
                const isSelected = selectedWeekdays.includes(key);
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.weekdayCircle,
                      isSelected && { backgroundColor: "#F9E8E4" },
                      !isSelected && { backgroundColor: theme.backgroundDefault, borderWidth: 1, borderColor: theme.border },
                    ]}
                    onPress={() => toggleWeekday(key)}
                    testID={`weekday-${key}`}
                  >
                    <ThemedText type="small" style={[styles.weekdayText, isSelected && { color: "#E8614F" }]}>{label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

            {renderDetailRow("calendar", Copy.createReminder.start, startDate ? formatDate(startDate) : Copy.createReminder.selectDate, !!startDate, () => handleOpenDatePicker("start"))}
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            {renderTimeRows()}
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            {renderDetailRow("edit-3", Copy.createReminder.doseNotes, notes || Copy.createReminder.doseNotesPlaceholder, !!notes, () => setShowNotesInput(true))}
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            {renderDetailRow("volume-2", Copy.createReminder.notificationSound, soundName, true, () => navigation.navigate("AlarmSounds"))}
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            {renderDetailRow("clock", Copy.createReminder.snoozeDuration, snoozeDuration, true, () => navigation.navigate("SnoozeSettings"))}
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            {renderDetailRow("calendar", Copy.createReminder.endDate, endDate ? formatDate(endDate) : Copy.common.never, !!endDate, () => handleOpenDatePicker("end"))}
          </View>
        ) : null}

        {isEditMode ? (
          <Pressable style={styles.deleteButton} onPress={handleDelete} testID="button-delete">
            <ThemedText type="body" style={{ color: theme.error, fontFamily: FontFamily.sansSemiBold }}>{Copy.createReminder.deleteReminder}</ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot }]}>
        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: canSave ? "#E8614F" : "#E8C4B8" },
          ]}
          onPress={handleSave}
          disabled={!canSave || isSaving}
          testID="button-save"
        >
          <ThemedText type="button" style={styles.saveButtonText}>{Copy.createReminder.saveButton}</ThemedText>
        </Pressable>
      </View>

      {showTimePicker && Platform.OS === "android" ? (
        <DateTimePicker value={tempTime} mode="time" display="default" onChange={handleTimeChange} />
      ) : null}

      <Modal
        visible={showTimePicker && Platform.OS !== "android"}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>{Copy.createReminder.remindMeAt}</ThemedText>
            {Platform.OS === "web" ? (
              <View style={{ alignItems: "center" }}>
                <RNTextInput
                  style={[styles.webTimeInput, { color: theme.text, borderColor: theme.border, fontFamily: FontFamily.sansRegular }]}
                  value={`${String(tempTime.getHours()).padStart(2, "0")}:${String(tempTime.getMinutes()).padStart(2, "0")}`}
                  onChangeText={(text) => {
                    const [hours, minutes] = text.split(":").map(Number);
                    if (!isNaN(hours) && !isNaN(minutes)) {
                      const d = new Date();
                      d.setHours(hours, minutes, 0, 0);
                      setTempTime(d);
                    }
                  }}
                  placeholder="HH:MM"
                  placeholderTextColor="#6B5744"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            ) : (
              <DateTimePicker value={tempTime} mode="time" display="spinner" onChange={handleTimeChange} />
            )}
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]} onPress={() => setShowTimePicker(false)}>
                <ThemedText type="body">{Copy.common.cancel}</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalButton, { backgroundColor: "#E8614F" }]} onPress={handleSaveTime}>
                <ThemedText type="body" style={{ color: "#FFFFFF", fontFamily: FontFamily.sansSemiBold }}>{Copy.common.done}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {showDatePicker && Platform.OS === "android" ? (
        <DateTimePicker value={tempDate} mode="date" display="default" onChange={handleDateChange} />
      ) : null}

      <Modal
        visible={showDatePicker !== null && Platform.OS !== "android"}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>
              {showDatePicker === "end" ? Copy.createReminder.endDate : Copy.createReminder.start}
            </ThemedText>
            {Platform.OS === "web" ? (
              <RNTextInput
                style={[styles.webTimeInput, { color: theme.text, borderColor: theme.border, fontFamily: FontFamily.sansRegular }]}
                value={tempDate.toISOString().split("T")[0]}
                onChangeText={(text) => {
                  const d = new Date(text);
                  if (!isNaN(d.getTime())) setTempDate(d);
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#6B5744"
                maxLength={10}
              />
            ) : (
              <DateTimePicker value={tempDate} mode="date" display="spinner" onChange={handleDateChange} />
            )}
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]} onPress={() => setShowDatePicker(null)}>
                <ThemedText type="body">{Copy.common.cancel}</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalButton, { backgroundColor: "#E8614F" }]} onPress={handleSaveDate}>
                <ThemedText type="body" style={{ color: "#FFFFFF", fontFamily: FontFamily.sansSemiBold }}>{Copy.common.done}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNotesInput}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotesInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>{Copy.createReminder.doseNotes}</ThemedText>
            <RNTextInput
              style={[styles.notesModalInput, { color: theme.text, borderColor: theme.border, fontFamily: FontFamily.sansRegular }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={Copy.createReminder.doseNotesPlaceholder}
              placeholderTextColor="#6B5744"
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]} onPress={() => setShowNotesInput(false)}>
                <ThemedText type="body">{Copy.common.cancel}</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalButton, { backgroundColor: "#E8614F" }]} onPress={() => { setShowNotesInput(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <ThemedText type="body" style={{ color: "#FFFFFF", fontFamily: FontFamily.sansSemiBold }}>{Copy.common.done}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  function renderTimeRows() {
    return (
      <>
        {reminderTimes.map((time, index) => (
          <View key={index}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconContainer, { backgroundColor: "#FDEEE9" }]}>
                <Feather name="bell" size={18} color="#E8614F" />
              </View>
              <Pressable style={styles.detailContent} onPress={() => handleOpenTimePicker(index)}>
                <ThemedText type="body" style={{ fontFamily: FontFamily.sansSemiBold }}>{Copy.createReminder.remindMeAt}</ThemedText>
                <ThemedText type="small" style={{ color: "#6B5744" }}>{formatTime(time)}</ThemedText>
              </Pressable>
              {reminderTimes.length > 1 ? (
                <Pressable onPress={() => handleRemoveTime(index)} hitSlop={8} testID={`remove-time-${index}`}>
                  <Feather name="x" size={18} color="#6B5744" />
                </Pressable>
              ) : (
                <Feather name="chevron-right" size={20} color="#6B5744" />
              )}
            </View>
            {index < reminderTimes.length - 1 ? <View style={[styles.divider, { backgroundColor: theme.borderLight }]} /> : null}
          </View>
        ))}
        {reminderTimes.length === 0 ? (
          <>
            {renderDetailRow("bell", Copy.createReminder.remindMeAt, Copy.createReminder.selectTime, false, () => handleOpenTimePicker(null))}
          </>
        ) : null}
        {reminderTimes.length > 0 ? (
          <>
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            <Pressable style={styles.addTimeRow} onPress={() => handleOpenTimePicker(null)} testID="button-add-time">
              <View style={[styles.addTimeIcon, { borderColor: "#E8614F" }]}>
                <Feather name="plus" size={14} color="#E8614F" />
              </View>
              <ThemedText type="small" style={{ color: "#E8614F", fontFamily: FontFamily.sansSemiBold }}>{Copy.createReminder.addAnotherTime}</ThemedText>
            </Pressable>
          </>
        ) : null}
      </>
    );
  }
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
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  nameCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  nameInput: {
    height: 52,
    fontSize: 16,
  },
  frequencySection: {
    marginBottom: Spacing.lg,
  },
  frequencyHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {},
  chooseOneLabel: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: FontFamily.sansSemiBold,
  },
  pillRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  pillText: {
    fontFamily: FontFamily.sansSemiBold,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    marginBottom: Spacing.lg,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  stepperValueBox: {
    flexDirection: "row",
    alignItems: "baseline",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    minWidth: 90,
  },
  stepperValueInput: {
    fontSize: 22,
    minWidth: 30,
    textAlign: "center",
    padding: 0,
  },
  stepperUnit: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  dayRangeRow: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  dayRangeItem: {
    flex: 1,
  },
  dayRangeLabel: {
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    fontFamily: FontFamily.sansSemiBold,
  },
  dayRangeInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
  },
  dayRangeInputText: {
    fontSize: 22,
    textAlign: "center",
    padding: 0,
    minWidth: 30,
  },
  dayRangeSteppers: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xl,
    marginTop: Spacing.sm,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dateRowText: {
    flex: 1,
  },
  standaloneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {},
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  weekdayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayText: {
    fontFamily: FontFamily.sansSemiBold,
  },
  addTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  addTimeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  saveButton: {
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: FontFamily.sansSemiBold,
  },
  deleteButton: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(44, 33, 24, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  webTimeInput: {
    fontSize: 24,
    textAlign: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    width: 150,
  },
  notesModalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 16,
  },
});
