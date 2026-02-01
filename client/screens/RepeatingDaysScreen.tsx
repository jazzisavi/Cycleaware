import React, { useState } from "react";
import { StyleSheet, View, Pressable, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "RepeatingDays">;

export default function RepeatingDaysScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const [dayStart, setDayStart] = useState(route.params?.dayStart || 14);
  const [dayEnd, setDayEnd] = useState(route.params?.dayEnd || 28);
  const [startsOn, setStartsOn] = useState<"today" | "tomorrow" | "on">(
    route.params?.startsOn || "today"
  );
  const [startDate, setStartDate] = useState<Date>(
    route.params?.startDate ? new Date(route.params.startDate) : new Date()
  );
  const [ends, setEnds] = useState<"never" | "on">(route.params?.ends || "never");
  const [endDate, setEndDate] = useState<Date>(
    route.params?.endDate ? new Date(route.params.endDate) : new Date()
  );
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("CreateCycleReminder", {
      title: route.params?.title,
      notes: route.params?.notes,
      reminderTimes: route.params?.reminderTimes,
      alarmType: route.params?.alarmType,
      dayStart,
      dayEnd,
      startsOn,
      startDate: startDate.toISOString(),
      ends,
      endDate: endDate.toISOString(),
    });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            Repeating days
          </ThemedText>
        </View>
        <Pressable onPress={handleDone} style={styles.headerButton}>
          <ThemedText type="body" style={{ color: theme.text, fontWeight: "600" }}>
            Done
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {/* Day Range Selector */}
        <View style={styles.dayRangeContainer}>
          <View style={[styles.dayInput, { borderColor: theme.border }]}>
            <TextInput
              style={[styles.dayInputText, { color: theme.text }]}
              value={String(dayStart)}
              onChangeText={(text) => setDayStart(Number(text) || 14)}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <ThemedText type="body" style={styles.toText}>to</ThemedText>
          <View style={[styles.dayInput, { borderColor: theme.border }]}>
            <TextInput
              style={[styles.dayInputText, { color: theme.text }]}
              value={String(dayEnd)}
              onChangeText={(text) => setDayEnd(Number(text) || 28)}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <ThemedText type="body" style={styles.daysLabel}>days</ThemedText>
        </View>

        {/* Description */}
        <ThemedText type="body" style={[styles.description, { color: theme.textTertiary }]}>
          Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sap
        </ThemedText>

        {/* Starts on Section */}
        <View style={styles.section}>
          <ThemedText type="body" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Cycle starts
          </ThemedText>

          <Pressable
            style={styles.radioRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setStartsOn("today");
            }}
          >
            <View style={[
              styles.radio,
              { borderColor: theme.text },
            ]}>
              {startsOn === "today" ? (
                <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
              ) : null}
            </View>
            <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.md }}>
              Today
            </ThemedText>
          </Pressable>

          <Pressable
            style={styles.radioRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setStartsOn("tomorrow");
            }}
          >
            <View style={[
              styles.radio,
              { borderColor: theme.text },
            ]}>
              {startsOn === "tomorrow" ? (
                <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
              ) : null}
            </View>
            <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.md }}>
              Tomorrow
            </ThemedText>
          </Pressable>

          <Pressable
            style={styles.radioRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setStartsOn("on");
              setShowStartDatePicker(true);
            }}
          >
            <View style={[
              styles.radio,
              { borderColor: theme.text },
            ]}>
              {startsOn === "on" ? (
                <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
              ) : null}
            </View>
            <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.md }}>
              On
            </ThemedText>
            <Pressable
              style={[styles.dateButton, { borderColor: theme.border }]}
              onPress={() => {
                setStartsOn("on");
                setShowStartDatePicker(true);
              }}
            >
              <ThemedText type="body" style={{ color: theme.text }}>
                {formatDate(startDate)}
              </ThemedText>
            </Pressable>
          </Pressable>

          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleStartDateChange}
            />
          )}
        </View>

        {/* Ends Section */}
        <View style={styles.section}>
          <ThemedText type="body" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Ends
          </ThemedText>

          <Pressable
            style={styles.radioRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEnds("never");
            }}
          >
            <View style={[
              styles.radio,
              { borderColor: theme.text },
            ]}>
              {ends === "never" ? (
                <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
              ) : null}
            </View>
            <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.md }}>
              Never
            </ThemedText>
          </Pressable>

          <Pressable
            style={styles.radioRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEnds("on");
              setShowEndDatePicker(true);
            }}
          >
            <View style={[
              styles.radio,
              { borderColor: theme.text },
            ]}>
              {ends === "on" ? (
                <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
              ) : null}
            </View>
            <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.md }}>
              On
            </ThemedText>
            <Pressable
              style={[styles.dateButton, { borderColor: theme.border }]}
              onPress={() => {
                setEnds("on");
                setShowEndDatePicker(true);
              }}
            >
              <ThemedText type="body" style={{ color: theme.text }}>
                {formatDate(endDate)}
              </ThemedText>
            </Pressable>
          </Pressable>

          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleEndDateChange}
            />
          )}
        </View>
      </View>
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  dayRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  dayInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minWidth: 60,
    alignItems: "center",
  },
  dayInputText: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  toText: {
    marginHorizontal: Spacing.md,
  },
  daysLabel: {
    marginLeft: Spacing.md,
  },
  description: {
    textAlign: "left",
    marginBottom: Spacing["2xl"],
    lineHeight: 22,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
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
  dateButton: {
    marginLeft: Spacing.md,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
});
