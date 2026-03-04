import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { Colors, Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { AppHeader } from "@/components/AppHeader";
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
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [dismissedUnresolved, setDismissedUnresolved] = useState<Set<string>>(new Set());

  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { reminders, refresh } = useLocalReminders();
  const { history: notificationHistory, refresh: refreshHistory } = useLocalHistory();

  const hasReminders = reminders.length > 0;
  const showNotificationWarning = notificationsAvailable &&
    permissionStatus !== "granted" &&
    permissionStatus !== "unavailable" &&
    hasReminders &&
    !bannerDismissed;

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshHistory();
    }, [])
  );

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

  const handleSkip = async (expandedKey: string, reminderId: string, title: string) => {
    await stopAlarm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSkippedIds(prev => new Set(prev).add(expandedKey));

    LocalDatabase.addHistoryEntry({
      reminderId,
      title,
      scheduledAt: new Date().toISOString(),
      status: 'skipped',
    });
    LocalDatabase.updateReminder(reminderId, {});
    refresh();
    refreshHistory();
  };

  const handleSnooze = async (expandedKey: string, reminderId: string, title: string) => {
    await stopAlarm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSnoozedIds(prev => new Set(prev).add(expandedKey));

    LocalDatabase.addHistoryEntry({
      reminderId,
      title,
      scheduledAt: new Date().toISOString(),
      status: 'snoozed',
    });
    refresh();
    refreshHistory();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

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

  const unresolvedHistory = notificationHistory.filter((entry) => {
    if (entry.status === "completed" || entry.status === "skipped" || entry.status === "snoozed") return false;
    if (dismissedUnresolved.has(entry.id)) return false;
    const scheduled = new Date(entry.scheduledAt);
    scheduled.setHours(0, 0, 0, 0);
    return scheduled < today;
  });

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

  const getTypeIcon = (type: string): keyof typeof Feather.glyphMap => {
    if (type === "cycle") return "repeat";
    return "calendar";
  };

  const isActioned = (key: string) =>
    completedIds.has(key) || skippedIds.has(key) || snoozedIds.has(key);

  const getActionLabel = (key: string) => {
    if (completedIds.has(key)) return Copy.home.doneButton;
    if (skippedIds.has(key)) return "Skipped";
    if (snoozedIds.has(key)) return "Snoozed";
    return "";
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <AppHeader title={Copy.navigation.today} showGreeting />

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
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>
              {Copy.home.welcomeTitle}
            </Text>
            <Text style={styles.welcomeText}>
              {Copy.home.welcomeText}
            </Text>
            <Pressable
              style={styles.ctaButton}
              onPress={() => navigation.navigate("CreateReminder")}
              testID="button-create-reminder"
            >
              <Feather name="plus" size={20} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
              <Text style={styles.ctaButtonText}>
                {Copy.home.createReminderButton}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {unresolvedHistory.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionBadge, { backgroundColor: "#FEF3E7" }]}>
                <Feather name="alert-circle" size={16} color="#C47D0A" />
              </View>
              <Text style={[styles.sectionTitle, { color: "#C47D0A" }]}>
                {Copy.home.unresolved}
              </Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              {Copy.home.unresolvedText}
            </Text>
            {unresolvedHistory.map((entry) => (
              <View key={entry.id} style={[styles.unresolvedCard, { backgroundColor: "#FEF3E7", borderColor: "#F0D9B5" }]}>
                <View style={styles.unresolvedContent}>
                  <View style={[styles.typeIconContainer, { backgroundColor: "#FDE8CC" }]}>
                    <Feather name="alert-circle" size={16} color="#C47D0A" />
                  </View>
                  <View style={styles.reminderInfo}>
                    <Text style={[styles.reminderTitle, { color: theme.text }]}>
                      {entry.title}
                    </Text>
                    <Text style={[styles.reminderMeta, { color: theme.textSecondary }]}>
                      {formatDate(entry.scheduledAt)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDismissedUnresolved(prev => new Set(prev).add(entry.id));
                    }}
                    hitSlop={8}
                    style={styles.dismissButton}
                  >
                    <Feather name="x" size={18} color="#6B5744" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {todaysReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {Copy.home.todaysReminders}
            </Text>
            {todaysReminders.map((reminder) => {
              const actioned = isActioned(reminder.expandedKey);
              return (
                <View key={reminder.expandedKey} style={[styles.reminderCard, { backgroundColor: theme.backgroundDefault }]}>
                  <View style={styles.reminderContent}>
                    <View style={[styles.typeIconContainer, {
                      backgroundColor: reminder.reminderType === "cycle" ? "#FDEEE9" : "#E8F5EE"
                    }]}>
                      <Feather
                        name={getTypeIcon(reminder.reminderType || "calendar")}
                        size={16}
                        color={reminder.reminderType === "cycle" ? Colors.light.accentCoral : Colors.light.accentMint}
                      />
                    </View>
                    <View style={styles.reminderInfo}>
                      <Text style={[styles.reminderTitle, { color: theme.text }]}>
                        {reminder.title}
                      </Text>
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
                    </View>
                  </View>

                  {actioned ? (
                    <View style={styles.actionedRow}>
                      <View style={[styles.actionedBadge, { backgroundColor: completedIds.has(reminder.expandedKey) ? "#E8F5EE" : "#F5F0E8" }]}>
                        <Feather
                          name={completedIds.has(reminder.expandedKey) ? "check" : skippedIds.has(reminder.expandedKey) ? "skip-forward" : "clock"}
                          size={14}
                          color={completedIds.has(reminder.expandedKey) ? "#2E7D52" : "#6B5744"}
                        />
                        <Text style={[styles.actionedText, {
                          color: completedIds.has(reminder.expandedKey) ? "#2E7D52" : "#6B5744"
                        }]}>
                          {getActionLabel(reminder.expandedKey)}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={styles.takeButton}
                        onPress={() => handleComplete(reminder.expandedKey, reminder.id, reminder.title)}
                        testID={`button-complete-${reminder.expandedKey}`}
                      >
                        <Feather name="check" size={16} color="#FFFFFF" />
                        <Text style={styles.takeButtonText}>{Copy.home.takeButton}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.outlineButton, { borderColor: theme.border }]}
                        onPress={() => handleSkip(reminder.expandedKey, reminder.id, reminder.title)}
                      >
                        <Feather name="skip-forward" size={14} color="#6B5744" />
                        <Text style={[styles.outlineButtonText, { color: "#6B5744" }]}>{Copy.home.skipButton}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.outlineButton, { borderColor: theme.border }]}
                        onPress={() => handleSnooze(reminder.expandedKey, reminder.id, reminder.title)}
                      >
                        <Feather name="clock" size={14} color="#6B5744" />
                        <Text style={[styles.outlineButtonText, { color: "#6B5744" }]}>{Copy.home.snoozeButton}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
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
              <View key={reminder.expandedKey} style={[styles.upcomingCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.reminderContent}>
                  <View style={[styles.typeIconContainer, {
                    backgroundColor: reminder.reminderType === "cycle" ? "#FDEEE9" : "#E8F5EE"
                  }]}>
                    <Feather
                      name={getTypeIcon(reminder.reminderType || "calendar")}
                      size={16}
                      color={reminder.reminderType === "cycle" ? Colors.light.accentCoral : Colors.light.accentMint}
                    />
                  </View>
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
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {notificationHistory.length > 0 && unresolvedHistory.length === 0 ? (
          <Pressable
            style={[styles.historyBanner, { backgroundColor: theme.backgroundDefault }]}
            onPress={() => navigation.navigate("History")}
            testID="button-view-history"
          >
            <View style={styles.historyContent}>
              <Text style={[styles.historyTitle, { color: theme.text }]}>
                {Copy.home.checkHistory}
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color={theme.textSecondary} />
          </Pressable>
        ) : null}

        <Text style={[styles.versionText, { color: theme.textTertiary }]}>
          v1.0.13
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
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    backgroundColor: "#A4BCBC",
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: FontFamily.serifBold,
    color: "#2C2118",
    marginBottom: Spacing.sm,
  },
  welcomeText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FontFamily.sansRegular,
    color: "#2C2118",
    opacity: 0.8,
    marginBottom: Spacing.xl,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    backgroundColor: "#E8614F",
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: FontFamily.sansSemiBold,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FontFamily.serifBold,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.sansRegular,
    marginBottom: Spacing.md,
  },
  reminderCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  upcomingCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  unresolvedCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  unresolvedContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  reminderContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  typeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    marginTop: 2,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontFamily: FontFamily.sansSemiBold,
    marginBottom: 2,
  },
  reminderTime: {
    fontSize: 14,
    fontFamily: FontFamily.sansRegular,
  },
  reminderMeta: {
    fontSize: 14,
    fontFamily: FontFamily.sansRegular,
  },
  reminderNotes: {
    fontSize: 13,
    fontFamily: FontFamily.sansRegular,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#EDE7DA",
  },
  takeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "#E8614F",
  },
  takeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: FontFamily.sansSemiBold,
  },
  outlineButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  outlineButtonText: {
    fontSize: 14,
    fontFamily: FontFamily.sansMedium,
  },
  actionedRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#EDE7DA",
    alignItems: "flex-start",
  },
  actionedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  actionedText: {
    fontSize: 13,
    fontFamily: FontFamily.sansMedium,
  },
  dismissButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
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
    fontSize: 16,
    fontFamily: FontFamily.sansSemiBold,
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
    fontFamily: FontFamily.sansSemiBold,
    color: Colors.light.error,
  },
  notificationBannerClose: {
    padding: 4,
  },
  notificationBannerText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontFamily: FontFamily.sansRegular,
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
    fontFamily: FontFamily.sansSemiBold,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: FontFamily.sansRegular,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
});
