import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { Card } from "@/components/Card";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { stopAlarm } from "@/services/notifications";
import { useLocalReminders, useLocalHistory } from "@/hooks/useLocalReminders";
import { LocalDatabase } from "@/services/LocalDatabase";
import type { LocalReminder } from "@/services/LocalDatabase";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

export default function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { permissionStatus, openSettings, notificationsAvailable } = useNotificationPermission();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { reminders, refresh } = useLocalReminders();
  const { history: notificationHistory, refresh: refreshHistory } = useLocalHistory();
  
  const hasReminders = reminders.length > 0;
  const showNotificationWarning = notificationsAvailable && 
    permissionStatus !== "granted" && 
    permissionStatus !== "unavailable" && 
    hasReminders && 
    !bannerDismissed;

  const incompleteCount = notificationHistory.filter(
    (item) => item.status !== "completed"
  ).length;

  const handleComplete = async (expandedKey: string, reminderId: string, title: string) => {
    await stopAlarm();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCompletedIds(prev => new Set(prev).add(expandedKey));

    LocalDatabase.addHistoryEntry({
      reminderId,
      title,
      scheduledAt: new Date().toISOString(),
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    LocalDatabase.updateReminder(reminderId, {});
    refresh();
    refreshHistory();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  interface ExpandedReminder extends LocalReminder {
    displayTime: string;
    expandedKey: string;
  }

  const expandReminder = (reminder: LocalReminder): ExpandedReminder[] => {
    const times = reminder.reminderTimes && reminder.reminderTimes.length > 0
      ? reminder.reminderTimes
      : [reminder.reminderTime];
    return times.map((time, index) => ({
      ...reminder,
      displayTime: time,
      expandedKey: `${reminder.id}-${time}-${index}`,
    }));
  };

  const todaysReminders = reminders
    .filter((r) => {
      const next = new Date(r.nextOccurrence || "");
      next.setHours(0, 0, 0, 0);
      return next.getTime() === today.getTime();
    })
    .flatMap(expandReminder);

  const upcomingReminders = reminders
    .filter((r) => {
      const next = new Date(r.nextOccurrence || "");
      next.setHours(0, 0, 0, 0);
      return next > today && next <= threeDaysFromNow;
    })
    .flatMap(expandReminder);

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <AppHeader title={Copy.navigation.today} />

      {showNotificationWarning ? (
        <View 
          style={styles.notificationBanner}
          testID="banner-notification-warning"
        >
          <View style={styles.notificationBannerHeader}>
            <Text style={styles.notificationBannerTitle}>
              {Copy.home.notificationBannerTitle}
            </Text>
            <Pressable 
              onPress={() => setBannerDismissed(true)}
              style={styles.notificationBannerClose}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.notificationBannerText}>
            {Copy.home.notificationBannerText}
          </Text>
          <Pressable 
            onPress={openSettings}
            style={styles.notificationBannerButton}
          >
            <Text style={styles.notificationBannerButtonText}>
              {Copy.home.notificationBannerButton}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: tabBarHeight + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {reminders.length === 0 ? (
          <View style={[styles.welcomeCard, { backgroundColor: "#D5DBD6" }]}>
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>
              {Copy.home.welcomeTitle}
            </Text>
            <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>
              {Copy.home.welcomeText}
            </Text>
            <Pressable
              style={[styles.ctaButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate("CreateReminder")}
              testID="button-create-reminder"
            >
              <Text style={styles.ctaButtonText}>
                {Copy.home.createReminderButton}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {todaysReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {Copy.home.todaysReminders}
            </Text>
            {todaysReminders.map((reminder) => {
              const isCompleted = completedIds.has(reminder.expandedKey);
              return (
                <Card key={reminder.expandedKey} style={styles.reminderCard}>
                  <View style={styles.reminderContent}>
                    <View
                      style={[
                        styles.typeIndicator,
                        {
                          backgroundColor:
                            reminder.reminderType === "cycle"
                              ? Colors.light.accentCoral
                              : Colors.light.accentMint,
                        },
                      ]}
                    />
                    <View style={styles.reminderInfo}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.reminderTitle, { color: theme.text }]}>
                          {reminder.title}
                        </Text>
                      </View>
                      <Text style={[styles.reminderTime, { color: theme.textSecondary }]}>
                        {Copy.home.timeToday(formatTime(reminder.displayTime))}
                      </Text>
                      {reminder.notes ? (
                        <Text 
                          style={[styles.reminderNotes, { color: theme.textSecondary }]}
                          numberOfLines={2}
                        >
                          {reminder.notes}
                        </Text>
                      ) : null}
                      {showNotificationWarning ? (
                        <Text style={styles.notificationsDisabledText}>
                          {Copy.home.notificationsDisabled}
                        </Text>
                      ) : (
                        <Text style={[styles.reminderStatus, { color: theme.textTertiary }]}>
                          {Copy.home.statusActive}
                        </Text>
                      )}
                    </View>
                    <Pressable 
                      style={[
                        styles.takenButton,
                        { 
                          backgroundColor: isCompleted ? theme.success : theme.primary,
                          opacity: isCompleted ? 0.6 : 1,
                        }
                      ]}
                      onPress={() => handleComplete(reminder.expandedKey, reminder.id, reminder.title)}
                      disabled={isCompleted}
                      testID={`button-complete-${reminder.expandedKey}`}
                    >
                      <Text style={styles.takenButtonText}>
                        {isCompleted ? Copy.home.doneButton : Copy.home.takeButton}
                      </Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : null}

        {upcomingReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {Copy.home.upcoming}
            </Text>
            {upcomingReminders.map((reminder) => (
              <Card key={reminder.expandedKey} style={styles.reminderCard}>
                <View style={styles.reminderContent}>
                  <View
                    style={[
                      styles.typeIndicator,
                      {
                        backgroundColor:
                          reminder.reminderType === "cycle"
                            ? Colors.light.accentCoral
                            : Colors.light.accentMint,
                      },
                    ]}
                  />
                  <View style={styles.reminderInfo}>
                    <Text style={[styles.reminderTitle, { color: theme.text }]}>
                      {reminder.title}
                    </Text>
                    <Text style={[styles.reminderMeta, { color: theme.textSecondary }]}>
                      {Copy.home.dateAtTime(formatDate(reminder.nextOccurrence || ""), formatTime(reminder.displayTime))}
                    </Text>
                    {reminder.notes ? (
                      <Text 
                        style={[styles.reminderNotes, { color: theme.textSecondary }]}
                        numberOfLines={2}
                      >
                        {reminder.notes}
                      </Text>
                    ) : null}
                    {showNotificationWarning ? (
                      <Text style={styles.notificationsDisabledText}>
                        {Copy.home.notificationsDisabled}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {notificationHistory.length > 0 && incompleteCount > 3 ? (
          <Pressable 
            style={[styles.historyBanner, { backgroundColor: theme.backgroundDefault }]}
            onPress={() => navigation.navigate("History")}
            testID="button-view-history"
          >
            <View style={styles.historyContent}>
              <Text style={[styles.historyTitle, { color: theme.text }]}>
                {Copy.home.checkHistory}
              </Text>
              <Text style={[styles.historyText, { color: theme.textSecondary }]}>
                {Copy.home.checkHistoryText(incompleteCount)}
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color={theme.textSecondary} />
          </Pressable>
        ) : null}

        <Text style={[styles.versionText, { color: theme.textTertiary }]}>
          v1.0.10
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  welcomeCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  welcomeText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  reminderCard: {
    marginBottom: Spacing.sm,
  },
  reminderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  reminderTime: {
    fontSize: 14,
  },
  reminderMeta: {
    fontSize: 14,
  },
  reminderNotes: {
    fontSize: 14,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  reminderStatus: {
    fontSize: 12,
    marginTop: Spacing.sm,
  },
  takenButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  takenButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  historyBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  historyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  notificationBanner: {
    backgroundColor: Colors.light.error + "15",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: Spacing.md,
  },
  notificationBannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  notificationBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.error,
  },
  notificationBannerClose: {
    padding: 4,
  },
  notificationBannerText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  notificationBannerButton: {
    backgroundColor: Colors.light.error,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  notificationBannerButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cardWarningBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.light.warning,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  notificationsDisabledText: {
    color: Colors.light.error,
    fontSize: 12,
    fontWeight: "500",
    marginTop: Spacing.xs,
  },
});
