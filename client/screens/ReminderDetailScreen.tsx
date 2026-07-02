import React, { useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { LocalDatabase } from "@/services/LocalDatabase";
import { useLocalReminder } from "@/hooks/useLocalReminders";
import type { LocalReminder } from "@/services/LocalDatabase";
import { scheduleReminderNotification, cancelPendingNotificationsForReminder, scheduleTrialNotifications } from "@/services/notifications";
import { syncCycleConfigsToServer } from "@/services/pushSync";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "ReminderDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ReminderDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();

  const { reminderId } = route.params;

  const { reminder, isLoaded } = useLocalReminder(reminderId);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await cancelPendingNotificationsForReminder(reminderId);
      const wasType = reminder?.reminderType;
      LocalDatabase.deleteReminder(reminderId);
      if (wasType === "cycle") {
        syncCycleConfigsToServer();
      }
      // Re-evaluate trial push schedule (7/1/0 vs 7/0 depends on cycle reminder presence)
      scheduleTrialNotifications().catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Failed to delete:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleComplete = async () => {
    if (!reminder) return;
    setIsCompleting(true);
    try {
      LocalDatabase.addHistoryEntry({
        reminderId: reminder.id,
        title: reminder.title,
        scheduledAt: reminder.nextOccurrence || new Date().toISOString(),
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      const updated = LocalDatabase.updateReminder(reminder.id, {
        completedOccurrences: (reminder.completedOccurrences || 0) + 1,
      });

      if (updated?.nextOccurrence) {
        await scheduleReminderNotification(
          updated.id,
          updated.title,
          updated.notes || null,
          new Date(updated.nextOccurrence),
          updated.soundEnabled
        );
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Failed to complete:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCompleting(false);
    }
  };

  if (!isLoaded) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!reminder) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ThemedText type="body">{Copy.reminderDetail.reminderNotFound}</ThemedText>
      </ThemedView>
    );
  }

  const formatTime = () => {
    if (!reminder.reminderTime) return "";
    const [hours, minutes] = reminder.reminderTime.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatNextOccurrence = () => {
    if (!reminder.nextOccurrence) return Copy.reminderDetail.notScheduled;
    const date = new Date(reminder.nextOccurrence);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const getRepeatDescription = () => {
    if (reminder.reminderType === "cycle") {
      return Copy.reminderDetail.everyNDays(reminder.cycleIntervalDays || 1);
    }
    if (reminder.weeklyRepeatDays && reminder.weeklyRepeatDays.length > 0) {
      const dayNameMap: Record<string, string> = {
        sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat"
      };
      const days = reminder.weeklyRepeatDays.map((d: string) => dayNameMap[d] || d);
      return Copy.reminderDetail.everyDays(days.join(", "));
    }
    return Copy.reminderDetail.customSchedule;
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
        <View style={[styles.typeIndicator, { backgroundColor: reminder.reminderType === "cycle" ? theme.accentCoral + "20" : theme.accentMint + "20" }]}>
          <Feather
            name={reminder.reminderType === "cycle" ? "refresh-cw" : "calendar"}
            size={16}
            color={reminder.reminderType === "cycle" ? theme.accentCoral : theme.accentMint}
          />
          <ThemedText type="small" style={{ color: reminder.reminderType === "cycle" ? theme.accentCoral : theme.accentMint, marginLeft: Spacing.xs }}>
            {reminder.reminderType === "cycle" ? Copy.reminderDetail.cycleBasedLabel : Copy.reminderDetail.calendarBasedLabel}
          </ThemedText>
        </View>

        <ThemedText type="display" style={styles.title}>
          {reminder.title}
        </ThemedText>

        {reminder.notes ? (
          <ThemedText type="body" style={[styles.notes, { color: theme.textSecondary }]}>
            {reminder.notes}
          </ThemedText>
        ) : null}

        <SectionHeader title={Copy.reminderDetail.scheduleSection} />
        <Card style={styles.scheduleCard}>
          <View style={styles.scheduleRow}>
            <View style={[styles.scheduleIcon, { backgroundColor: theme.primary + "15" }]}>
              <Feather name="clock" size={20} color={theme.primary} />
            </View>
            <View>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {Copy.reminderDetail.timeLabel}
              </ThemedText>
              <ThemedText type="h4">{formatTime()}</ThemedText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
          <View style={styles.scheduleRow}>
            <View style={[styles.scheduleIcon, { backgroundColor: theme.info + "15" }]}>
              <Feather name="repeat" size={20} color={theme.info} />
            </View>
            <View>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {Copy.reminderDetail.repeatLabel}
              </ThemedText>
              <ThemedText type="h4">{getRepeatDescription()}</ThemedText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
          <View style={styles.scheduleRow}>
            <View style={[styles.scheduleIcon, { backgroundColor: theme.success + "15" }]}>
              <Feather name="calendar" size={20} color={theme.success} />
            </View>
            <View>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {Copy.reminderDetail.nextOccurrenceLabel}
              </ThemedText>
              <ThemedText type="h4">{formatNextOccurrence()}</ThemedText>
            </View>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            onPress={handleComplete}
            loading={isCompleting}
            testID="button-complete"
          >
            {Copy.reminderDetail.markAsComplete}
          </Button>
          <Button
            variant="outline"
            onPress={handleDelete}
            loading={isDeleting}
            style={{ borderColor: theme.error }}
            testID="button-delete"
          >
            <ThemedText type="button" style={{ color: theme.error }}>
              {Copy.reminderDetail.deleteReminder}
            </ThemedText>
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
  centered: {
    alignItems: "center",
    justifyContent: "center",
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
  title: {
    marginBottom: Spacing.sm,
  },
  notes: {
    marginBottom: Spacing.lg,
  },
  scheduleCard: {
    padding: Spacing.lg,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  scheduleIcon: {
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
  actions: {
    marginTop: Spacing["3xl"],
    gap: Spacing.md,
  },
});
