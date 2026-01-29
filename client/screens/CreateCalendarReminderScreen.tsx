import React, { useState } from "react";
import { StyleSheet, View, Pressable, Platform, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
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

export default function CreateCalendarReminderScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [time, setTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [alarmType, setAlarmType] = useState<"notification" | "alarm">("notification");

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

    const reminderData = {
      title: title.trim(),
      notes: notes.trim() || null,
      reminderType: "calendar",
      reminderTime: timeString,
      alarmType,
      isActive: true,
    };

    createMutation.mutate(reminderData);
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

        {/* Add Repeats frequency */}
        <Pressable style={[styles.row, { borderBottomColor: theme.border }]}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Add Repeats frequency
          </ThemedText>
        </Pressable>

        {/* Start today */}
        <Pressable style={[styles.row, { borderBottomColor: theme.border }]}>
          <ThemedText type="body" style={{ color: theme.text }}>
            Start today
          </ThemedText>
        </Pressable>

        {/* No end date */}
        <Pressable 
          style={[styles.row, { borderBottomColor: theme.border }]}
          onPress={() => setHasEndDate(!hasEndDate)}
        >
          <ThemedText type="body" style={{ color: theme.text }}>
            {hasEndDate ? "Has end date" : "No end date"}
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
        <Pressable style={[styles.row, { borderBottomColor: theme.border }]}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Set another reminder
          </ThemedText>
        </Pressable>

        {/* Add medication notes */}
        <Pressable style={[styles.row, { borderBottomColor: theme.border }]}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Add medication notes
          </ThemedText>
        </Pressable>

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
});
