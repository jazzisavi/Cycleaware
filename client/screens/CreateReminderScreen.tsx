import React, { useState, useEffect, useCallback, useRef } from "react";
import { StyleSheet, View, Pressable, Platform, ScrollView, TextInput as RNTextInput, Modal, Alert, KeyboardAvoidingView } from "react-native";
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
type IntervalUnit = "day" | "week";

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
  const titleInputRef = useRef<RNTextInput>(null);

  const reminderId = route.params?.reminderId;
  const isEditMode = !!reminderId;

  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<FrequencyType>(null);

  const [cycleLength, setCycleLength] = useState(28);
  const [cycleDayStart, setCycleDayStart] = useState(14);
  const [cycleDayEnd, setCycleDayEnd] = useState(28);
  const [cycleStartDate, setCycleStartDate] = useState<Date | null>(null);

  const [intervalDays, setIntervalDays] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>("day");

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

  useEffect(() => {
    if (!isEditMode) {
      setTimeout(() => titleInputRef.current?.focus(), 300);
    }
  }, [isEditMode]);

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
          setIntervalUnit("day");
        } else {
          if (reminderData.weeklyRepeatDays && reminderData.weeklyRepeatDays.length > 0) {
            setFrequency("weekdays");
            setSelectedWeekdays(reminderData.weeklyRepeatDays || []);
          } else {
            setFrequency("interval");
            setIntervalDays(reminderData.repeatInterval || 1);
            setIntervalUnit("week");
          }
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
    setIntervalUnit("day");
    setSelectedWeekdays([]);
    setEndDate(null);
    if (f === "interval" || f === "weekdays") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setStartDate(today);
    } else {
      setStartDate(null);
    }
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

  const handleClearEndDate = () => {
    setEndDate(null);
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
          repeatUnit: intervalUnit,
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

  const renderStepper = (value: number, onDecrement: () => void, onIncrement: () => void, unitLabel: string, onChangeValue: (v: number) => void, min: number = 1, max: number = 99, onUnitPress?: () => void) => (
    <View style={styles.stepperOuterRow}>
      <View style={styles.stepperContainer}>
        <Pressable
          style={[styles.stepperButton, { backgroundColor: "#EDE7DA" }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDecrement(); }}
        >
          <Feather name="minus" size={20} color={theme.text} />
        </Pressable>
        <Pressable
          style={styles.stepperValueBox}
          onPress={onUnitPress}
        >
          <RNTextInput
            style={[styles.stepperValueInput, { color: theme.text, fontFamily: FontFamily.sansBold }]}
            keyboardType="number-pad"
            maxLength={2}
            value={String(value)}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
              const num = parseInt(cleaned, 10);
              if (!isNaN(num)) {
                onChangeValue(Math.max(min, Math.min(max, num)));
              } else if (cleaned === "") {
                onChangeValue(min);
              }
            }}
            selectTextOnFocus
          />
        </Pressable>
        <Pressable
          style={[styles.stepperButton, { backgroundColor: "#EDE7DA" }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onIncrement(); }}
        >
          <Feather name="plus" size={20} color={theme.text} />
        </Pressable>
      </View>
      <Pressable onPress={onUnitPress} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} disabled={!onUnitPress}>
        <ThemedText type="body" style={[styles.stepperUnitLabel, { color: theme.text, fontFamily: FontFamily.sansBold }]}>{unitLabel}</ThemedText>
        {onUnitPress ? <Feather name="chevron-down" size={14} color={theme.text} /> : null}
      </Pressable>
    </View>
  );

  const renderMiniStepper = (label: string, value: number, onDecrement: () => void, onIncrement: () => void, onChangeValue: (v: number) => void, min: number = 1, max: number = 99) => (
    <View style={styles.dayRangeItem}>
      <ThemedText type="caption" style={[styles.dayRangeLabel, { color: theme.text }]}>{label}</ThemedText>
      <View style={styles.miniStepperContainer}>
        <Pressable
          style={[styles.miniStepperButton, { backgroundColor: "#EDE7DA" }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDecrement(); }}
        >
          <Feather name="minus" size={16} color={theme.text} />
        </Pressable>
        <View style={styles.miniStepperValueBox}>
          <RNTextInput
            style={[styles.miniStepperValueInput, { color: theme.text, fontFamily: FontFamily.sansBold }]}
            keyboardType="number-pad"
            maxLength={2}
            value={String(value)}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
              const num = parseInt(cleaned, 10);
              if (!isNaN(num)) {
                onChangeValue(Math.max(min, Math.min(max, num)));
              } else if (cleaned === "") {
                onChangeValue(min);
              }
            }}
            selectTextOnFocus
          />
        </View>
        <Pressable
          style={[styles.miniStepperButton, { backgroundColor: "#EDE7DA" }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onIncrement(); }}
        >
          <Feather name="plus" size={16} color={theme.text} />
        </Pressable>
      </View>
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

  const renderEndDateRow = () => {
    const endDateExtra = endDate ? (
      <Pressable
        onPress={handleClearEndDate}
        hitSlop={8}
        style={{ marginRight: Spacing.xs }}
      >
        <Feather name="x-circle" size={20} color="#6B5744" />
      </Pressable>
    ) : undefined;

    return renderDetailRow(
      "calendar",
      Copy.createReminder.endDate,
      endDate ? formatDate(endDate) : Copy.common.never,
      true,
      () => handleOpenDatePicker("end"),
      true,
      endDateExtra,
    );
  };

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

  const toggleIntervalUnit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIntervalUnit((prev) => (prev === "day" ? "week" : "day"));
  };

  const intervalUnitLabel = intervalUnit === "day"
    ? (intervalDays === 1 ? "DAY" : "DAYS")
    : (intervalDays === 1 ? "WEEK" : "WEEKS");

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
            ref={titleInputRef}
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
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="body" style={styles.inCardHeading}>{Copy.createReminder.cycleLength}</ThemedText>
            <ThemedText type="small" style={[styles.cardDescription, { color: "#6B5744" }]}>
              {Copy.createReminder.cycleLengthDescription}
            </ThemedText>
            {renderStepper(
              cycleLength,
              () => {
                const newLength = Math.max(2, cycleLength - 1);
                setCycleLength(newLength);
                if (cycleDayEnd > newLength) setCycleDayEnd(newLength);
                if (cycleDayStart >= newLength) setCycleDayStart(Math.max(1, newLength - 1));
              },
              () => setCycleLength(Math.min(99, cycleLength + 1)),
              Copy.createReminder.daysLabel,
              (v: number) => {
                const newLength = Math.max(2, Math.min(99, v));
                setCycleLength(newLength);
                if (cycleDayEnd > newLength) setCycleDayEnd(newLength);
                if (cycleDayStart >= newLength) setCycleDayStart(Math.max(1, newLength - 1));
              },
              2,
              99,
            )}

            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

            <ThemedText type="body" style={styles.inCardHeading}>{Copy.createReminder.dayRange}</ThemedText>
            <ThemedText type="small" style={[styles.cardDescription, { color: "#6B5744" }]}>
              {Copy.createReminder.dayRangeDescription}
            </ThemedText>
            <View style={styles.dayRangeRow}>
              {renderMiniStepper(
                Copy.createReminder.fromDay,
                cycleDayStart,
                () => setCycleDayStart(Math.max(1, cycleDayStart - 1)),
                () => {
                  const newStart = cycleDayStart + 1;
                  if (newStart < cycleDayEnd) setCycleDayStart(newStart);
                },
                (v: number) => {
                  const clamped = Math.max(1, Math.min(cycleDayEnd - 1, Math.min(99, v)));
                  setCycleDayStart(clamped);
                },
                1,
                99,
              )}
              {renderMiniStepper(
                Copy.createReminder.toDay,
                cycleDayEnd,
                () => {
                  const newEnd = cycleDayEnd - 1;
                  if (newEnd > cycleDayStart) setCycleDayEnd(newEnd);
                },
                () => {
                  const newEnd = cycleDayEnd + 1;
                  if (newEnd > cycleLength) setCycleLength(Math.min(99, newEnd));
                  if (newEnd <= 99) setCycleDayEnd(newEnd);
                },
                (v: number) => {
                  const clamped = Math.max(cycleDayStart + 1, Math.min(99, v));
                  setCycleDayEnd(clamped);
                  if (clamped > cycleLength) setCycleLength(clamped);
                },
                1,
                99,
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

            <ThemedText type="body" style={styles.inCardHeading}>{Copy.createReminder.startDate}</ThemedText>
            <ThemedText type="small" style={[styles.cardDescription, { color: "#6B5744" }]}>
              {Copy.createReminder.startDateDescription}
            </ThemedText>
            {renderDetailRow("calendar", Copy.createReminder.cycleStart, cycleStartDate ? formatDate(cycleStartDate) : Copy.createReminder.selectDate, !!cycleStartDate, () => handleOpenDatePicker("cycleStart"))}

            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

            <ThemedText type="body" style={styles.inCardHeading}>{Copy.createReminder.details}</ThemedText>
            {renderTimeRows()}
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            {renderDetailRow("edit-3", Copy.createReminder.doseNotes, notes || Copy.createReminder.doseNotesPlaceholder, !!notes, () => setShowNotesInput(true))}
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            {renderDetailRow("volume-2", Copy.createReminder.notificationSound, soundName, true, () => navigation.navigate("AlarmSounds"))}
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            {renderDetailRow("clock", Copy.createReminder.snoozeDuration, snoozeDuration, true, () => navigation.navigate("SnoozeSettings"))}
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            {renderEndDateRow()}
          </View>
        ) : null}

        {frequency === "interval" ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="body" style={styles.inCardHeading}>{Copy.createReminder.repeatsEvery}</ThemedText>
            {renderStepper(
              intervalDays,
              () => setIntervalDays(Math.max(1, intervalDays - 1)),
              () => setIntervalDays(Math.min(99, intervalDays + 1)),
              intervalUnitLabel,
              (v: number) => setIntervalDays(Math.max(1, Math.min(99, v))),
              1,
              99,
              toggleIntervalUnit,
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
            {renderEndDateRow()}
          </View>
        ) : null}

        {frequency === "weekdays" ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="body" style={styles.inCardHeading}>{Copy.createReminder.repeatOn}</ThemedText>
            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, index) => {
                const key = WEEKDAY_KEYS[index];
                const isSelected = selectedWeekdays.includes(key);
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.weekdayButton,
                      isSelected && { backgroundColor: "#F9E8E4", borderColor: "#E8614F", borderWidth: 1 },
                      !isSelected && { backgroundColor: "#EDE7DA" },
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
            {renderEndDateRow()}
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
        <DateTimePicker value={tempTime} mode="time" display="default" onChange={handleTimeChange} accentColor="#E8614F" />
      ) : null}

      <Modal
        visible={showTimePicker && Platform.OS !== "android"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={[styles.fullModal, { backgroundColor: "#F5F0E8" }]}>
          <View style={[styles.fullModalHeader, { paddingTop: insets.top + Spacing.sm }]}>
            <Pressable style={styles.backCircle} onPress={() => setShowTimePicker(false)}>
              <Feather name="arrow-left" size={20} color="#2C2118" />
            </Pressable>
            <ThemedText type="h2" style={styles.fullModalTitle}>Select time</ThemedText>
          </View>
          <View style={[styles.helpCard, { backgroundColor: "#EDE7DA" }]}>
            <Feather name="info" size={18} color="#C47D0A" style={{ marginRight: Spacing.sm, marginTop: 2 }} />
            <ThemedText type="body" style={{ flex: 1, color: "#2C2118", fontFamily: FontFamily.sansRegular }}>
              Choose a time that works with your daily routine.
            </ThemedText>
          </View>
          <View style={styles.pickerCard}>
            {Platform.OS === "web" ? (
              <View style={{ alignItems: "center", padding: Spacing.xl }}>
                <RNTextInput
                  style={[styles.webTimeInput, { color: "#2C2118", borderColor: "#EDE7DA", fontFamily: FontFamily.sansRegular }]}
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
              <DateTimePicker value={tempTime} mode="time" display="spinner" onChange={handleTimeChange} accentColor="#E8614F" textColor="#2C2118" />
            )}
          </View>
          <View style={{ flex: 1 }} />
          <View style={[styles.fullModalFooter, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Pressable style={styles.fullModalSaveButton} onPress={handleSaveTime}>
              <ThemedText type="button" style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {showDatePicker && Platform.OS === "android" ? (
        <DateTimePicker value={tempDate} mode="date" display="default" onChange={handleDateChange} accentColor="#E8614F" />
      ) : null}

      <Modal
        visible={showDatePicker !== null && Platform.OS !== "android"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDatePicker(null)}
      >
        <View style={[styles.fullModal, { backgroundColor: "#F5F0E8" }]}>
          <View style={[styles.fullModalHeader, { paddingTop: insets.top + Spacing.sm }]}>
            <Pressable style={styles.backCircle} onPress={() => setShowDatePicker(null)}>
              <Feather name="chevron-left" size={20} color="#2C2118" />
            </Pressable>
            <ThemedText type="h2" style={styles.fullModalTitle}>
              {showDatePicker === "cycleStart" ? "Cycle start date" : showDatePicker === "end" ? Copy.createReminder.endDate : Copy.createReminder.start}
            </ThemedText>
          </View>
          <View style={[styles.helpCard, { backgroundColor: "#EDE7DA" }]}>
            <Feather name="info" size={18} color="#C47D0A" style={{ marginRight: Spacing.sm, marginTop: 2 }} />
            <ThemedText type="body" style={{ flex: 1, color: "#2C2118", fontFamily: FontFamily.sansRegular }}>
              {showDatePicker === "cycleStart"
                ? "Select the start date of your therapeutic cycle or day 1 of your last bleed."
                : "Select a date for your reminder."}
            </ThemedText>
          </View>
          <View style={styles.pickerCard}>
            {Platform.OS === "web" ? (
              <View style={{ alignItems: "center", padding: Spacing.xl }}>
                <RNTextInput
                  style={[styles.webTimeInput, { color: "#2C2118", borderColor: "#EDE7DA", fontFamily: FontFamily.sansRegular }]}
                  value={tempDate.toISOString().split("T")[0]}
                  onChangeText={(text) => {
                    const d = new Date(text);
                    if (!isNaN(d.getTime())) setTempDate(d);
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6B5744"
                  maxLength={10}
                />
              </View>
            ) : (
              <DateTimePicker value={tempDate} mode="date" display="spinner" onChange={handleDateChange} accentColor="#E8614F" textColor="#2C2118" />
            )}
          </View>
          <View style={{ flex: 1 }} />
          <View style={[styles.fullModalFooter, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Pressable style={styles.fullModalSaveButton} onPress={handleSaveDate}>
              <ThemedText type="button" style={styles.saveButtonText}>
                {showDatePicker === "cycleStart" ? "Save Reminder" : "Save"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNotesInput}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotesInput(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#F5F0E8" }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
          <View style={[styles.fullModalHeader, { paddingTop: insets.top + Spacing.sm }]}>
            <Pressable style={styles.backCircle} onPress={() => setShowNotesInput(false)}>
              <Feather name="arrow-left" size={20} color="#2C2118" />
            </Pressable>
            <ThemedText type="h2" style={styles.fullModalTitle}>Add notes</ThemedText>
          </View>
          <ThemedText type="body" style={styles.notesSubtitle}>
            Add any specific instructions for this reminder.
          </ThemedText>
          <View style={[styles.notesCard, { flexGrow: 1, flexShrink: 1 }]}>
            <RNTextInput
              style={[styles.notesCardInput, { fontFamily: FontFamily.sansRegular }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Take with water, before breakfast..."
              placeholderTextColor="#9A8D7F"
              multiline
              autoFocus
              textAlignVertical="top"
            />
          </View>
          <View style={[styles.fullModalFooter, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Pressable style={styles.fullModalSaveButton} onPress={() => { setShowNotesInput(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <ThemedText type="button" style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
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
  inCardHeading: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    marginBottom: Spacing.lg,
  },
  stepperOuterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "#E0DAD0",
    padding: 4,
    gap: 4,
  },
  stepperValueBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  stepperValueInput: {
    fontSize: 28,
    minWidth: 40,
    padding: 0,
    textAlign: "center",
  },
  stepperUnitLabel: {
    fontSize: 16,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  dayRangeRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  dayRangeItem: {
    flex: 1,
  },
  dayRangeLabel: {
    marginBottom: Spacing.xs,
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
  },
  miniStepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "#E0DAD0",
    padding: 4,
    gap: 4,
  },
  miniStepperButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  miniStepperValueBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
  },
  miniStepperValueInput: {
    fontSize: 22,
    padding: 0,
    textAlign: "center",
    minWidth: 30,
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
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  weekdayButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
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
  fullModal: {
    flex: 1,
  },
  fullModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDE7DA",
    alignItems: "center",
    justifyContent: "center",
  },
  fullModalTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 24,
    color: "#2C2118",
  },
  helpCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  pickerCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  fullModalFooter: {
    paddingHorizontal: Spacing.lg,
  },
  fullModalSaveButton: {
    height: 56,
    borderRadius: BorderRadius.xl,
    backgroundColor: "#E8614F",
    alignItems: "center",
    justifyContent: "center",
  },
  notesSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: "#6B5744",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  notesCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    minHeight: 250,
  },
  notesCardInput: {
    fontSize: 16,
    color: "#2C2118",
    flex: 1,
    textAlignVertical: "top",
    padding: 0,
  },
  webTimeInput: {
    fontSize: 24,
    textAlign: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    width: 150,
  },
});
