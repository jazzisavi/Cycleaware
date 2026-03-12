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
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
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
  const { permissionStatus, openSettings, notificationsAvailable, checkPermissionStatus } = useNotificationPermission();
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());
  const [unresolvedDismissed, setUnresolvedDismissed] = useState(false);

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
      checkPermissionStatus();
    }, [])
  );

  const buildScheduledAt = (displayTime: string): string => {
    const [hours, minutes] = displayTime.split(":").map(Number);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  const handleComplete = async (expandedKey: string, reminderId: string, title: string, displayTime: string) => {
    await stopAlarm();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActionedIds(prev => new Set(prev).add(expandedKey));
    LocalDatabase.addHistoryEntry({
      reminderId,
      title,
      scheduledAt: buildScheduledAt(displayTime),
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    LocalDatabase.updateReminder(reminderId, {});
    refresh();
    refreshHistory();
  };

  const handleSkip = async (expandedKey: string, reminderId: string, title: string, displayTime: string) => {
    await stopAlarm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionedIds(prev => new Set(prev).add(expandedKey));
    LocalDatabase.addHistoryEntry({
      reminderId,
      title,
      scheduledAt: buildScheduledAt(displayTime),
      status: 'skipped',
    });
    LocalDatabase.updateReminder(reminderId, {});
    refresh();
    refreshHistory();
  };

  const handleSnooze = async (expandedKey: string, reminderId: string, title: string, displayTime: string) => {
    await stopAlarm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActionedIds(prev => new Set(prev).add(expandedKey));
    LocalDatabase.addHistoryEntry({
      reminderId,
      title,
      scheduledAt: buildScheduledAt(displayTime),
      status: 'snoozed',
    });
    refresh();
    refreshHistory();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const unresolvedCount = notificationHistory.filter((entry) => {
    if (entry.status === "completed" || entry.status === "skipped" || entry.status === "snoozed") return false;
    const scheduled = new Date(entry.scheduledAt);
    scheduled.setHours(0, 0, 0, 0);
    return scheduled < today;
  }).length;

  const showUnresolved = unresolvedCount > 0 && !unresolvedDismissed;

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatUpcomingDate = (dateString: string) => {
    const date = new Date(dateString);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    if (targetDate.getTime() === tomorrowDate.getTime()) return "TOMORROW";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
  };

  const isActioned = (key: string) => actionedIds.has(key);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <AppHeader title={Copy.navigation.today} showGreeting />

      {showNotificationWarning ? (
        <View style={[styles.notificationBanner, { backgroundColor: theme.error + "15", borderColor: theme.error + "30" }]} testID="banner-notification-warning">
          <View style={styles.notificationBannerHeader}>
            <Text style={[styles.notificationBannerTitle, { color: theme.error }]}>{Copy.home.notificationBannerTitle}</Text>
            <Pressable onPress={() => setBannerDismissed(true)} style={styles.notificationBannerClose} hitSlop={8}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
          <Text style={[styles.notificationBannerText, { color: theme.textSecondary }]}>{Copy.home.notificationBannerText}</Text>
          <Pressable onPress={openSettings} style={[styles.notificationBannerButton, { backgroundColor: theme.error }]}>
            <Text style={[styles.notificationBannerButtonText, { color: theme.buttonText }]}>{Copy.home.notificationBannerButton}</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {reminders.length === 0 ? (
          <View style={[styles.welcomeCard, { backgroundColor: theme.ctaCard }]}>
            <Text style={[styles.welcomeTitle, { color: theme.saveButtonActive }]}>{Copy.home.welcomeTitle}</Text>
            <Text style={[styles.welcomeText, { color: theme.text }]}>{Copy.home.welcomeText}</Text>
            <Pressable
              style={[styles.ctaButton, { backgroundColor: theme.saveButtonActive }]}
              onPress={() => navigation.navigate("CreateReminder")}
              testID="button-create-reminder"
            >
              <Feather name="plus" size={20} color={theme.buttonText} style={{ marginRight: Spacing.sm }} />
              <Text style={[styles.ctaButtonText, { color: theme.buttonText }]}>{Copy.home.createReminderButton}</Text>
            </Pressable>
          </View>
        ) : null}

        {todaysReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{Copy.home.todaysReminders}</Text>
            {todaysReminders.filter((r) => !isActioned(r.expandedKey)).map((reminder) => (
              <View key={reminder.expandedKey} style={[styles.activeCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.activeCardTop}>
                  <View style={[styles.bellIconCircle, { backgroundColor: theme.info + "25" }]}>
                    <Feather name="bell" size={18} color={theme.info} />
                  </View>
                  <View style={styles.activeCardInfo}>
                    <Text style={[styles.activeTitle, { color: theme.text }]}>{reminder.title}</Text>
                    {reminder.notes ? (
                      <Text style={[styles.activeNotes, { color: theme.textSecondary }]} numberOfLines={2}>
                        {reminder.notes}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.activeTime, { color: theme.textSecondary }]}>
                    {formatTime(reminder.displayTime)}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <Pressable onPress={() => handleSnooze(reminder.expandedKey, reminder.id, reminder.title, reminder.displayTime)}>
                    <Text style={[styles.textActionButton, { color: theme.info }]}>{Copy.home.snoozeButton}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleSkip(reminder.expandedKey, reminder.id, reminder.title, reminder.displayTime)}>
                    <Text style={[styles.textActionButton, { color: theme.info }]}>{Copy.home.skipButton}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.takeButton, { backgroundColor: theme.info }]}
                    onPress={() => handleComplete(reminder.expandedKey, reminder.id, reminder.title, reminder.displayTime)}
                    testID={`button-complete-${reminder.expandedKey}`}
                  >
                    <Text style={[styles.takeButtonText, { color: theme.buttonText }]}>{Copy.home.takeButton}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {showUnresolved ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{Copy.home.unresolved}</Text>
            <View style={[styles.unresolvedCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.unresolvedHeader}>
                <View style={styles.unresolvedIconRow}>
                  <View style={[styles.unresolvedIconCircle, { backgroundColor: theme.pillActiveBg }]}>
                    <Feather name="clock" size={16} color={theme.accentCoral} />
                  </View>
                  <Text style={[styles.unresolvedTitle, { color: theme.accentCoral }]}>{Copy.home.unresolvedTitle}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setUnresolvedDismissed(true);
                  }}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color={theme.textTertiary} />
                </Pressable>
              </View>
              <Text style={[styles.unresolvedBody, { color: theme.text }]}>{Copy.home.unresolvedBody}</Text>
              <Text style={[styles.unresolvedSubtext, { color: theme.textSecondary }]}>{Copy.home.unresolvedSubtext}</Text>
              <Pressable onPress={() => navigation.navigate("History")} testID="button-view-history">
                <Text style={[styles.viewHistoryLink, { color: theme.text }]}>{Copy.home.viewHistory}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {upcomingReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{Copy.home.upcoming}</Text>
            {upcomingReminders.map((reminder) => (
              <View key={reminder.expandedKey} style={[styles.upcomingCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.upcomingCardContent}>
                  <View style={[styles.upcomingBellCircle, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="bell" size={18} color={theme.textTertiary} />
                  </View>
                  <View style={styles.upcomingInfo}>
                    <Text style={[styles.upcomingTitle, { color: theme.text }]}>{reminder.title}</Text>
                    {reminder.notes ? (
                      <Text style={[styles.upcomingNotes, { color: theme.textSecondary }]} numberOfLines={2}>
                        {reminder.notes}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.upcomingDateCol}>
                    <Text style={[styles.upcomingDateLabel, { color: theme.textSecondary }]}>
                      {formatUpcomingDate(reminder.nextOccurrence || "")}
                    </Text>
                    <Text style={[styles.upcomingTimeLabel, { color: theme.textSecondary }]}>
                      {formatTime(reminder.displayTime)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 32,
    marginBottom: Spacing.lg,
  },
  welcomeTitle: {
    fontSize: 26,
    fontFamily: FontFamily.serifBold,
    marginBottom: Spacing.sm,
  },
  welcomeText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FontFamily.sansRegular,
    marginBottom: Spacing.xl,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: BorderRadius["2xl"],
  },
  ctaButtonText: {
    fontSize: 16,
    fontFamily: FontFamily.sansSemiBold,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FontFamily.sansSemiBold,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  activeCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  activeCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bellIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  activeCardInfo: {
    flex: 1,
  },
  activeTitle: {
    fontSize: 16,
    fontFamily: FontFamily.sansSemiBold,
    marginBottom: 2,
  },
  activeNotes: {
    fontSize: 13,
    fontFamily: FontFamily.sansRegular,
    lineHeight: 18,
    marginTop: 2,
  },
  activeTime: {
    fontSize: 13,
    fontFamily: FontFamily.sansMedium,
    marginLeft: Spacing.sm,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
  },
  textActionButton: {
    fontSize: 13,
    fontFamily: FontFamily.sansSemiBold,
    letterSpacing: 0.5,
  },
  takeButton: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  takeButtonText: {
    fontSize: 13,
    fontFamily: FontFamily.sansSemiBold,
    letterSpacing: 0.5,
  },
  unresolvedCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 32,
    padding: Spacing.lg,
  },
  unresolvedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  unresolvedIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  unresolvedIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  unresolvedTitle: {
    fontSize: 15,
    fontFamily: FontFamily.sansSemiBold,
  },
  unresolvedBody: {
    fontSize: 14,
    fontFamily: FontFamily.sansSemiBold,
    marginBottom: Spacing.xs,
  },
  unresolvedSubtext: {
    fontSize: 13,
    fontFamily: FontFamily.sansRegular,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  viewHistoryLink: {
    fontSize: 14,
    fontFamily: FontFamily.sansSemiBold,
  },
  upcomingCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  upcomingCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  upcomingBellCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 16,
    fontFamily: FontFamily.sansSemiBold,
    marginBottom: 2,
  },
  upcomingNotes: {
    fontSize: 13,
    fontFamily: FontFamily.sansRegular,
    lineHeight: 18,
    marginTop: 2,
  },
  upcomingDateCol: {
    alignItems: "flex-end",
    marginLeft: Spacing.sm,
  },
  upcomingDateLabel: {
    fontSize: 11,
    fontFamily: FontFamily.sansSemiBold,
    letterSpacing: 0.5,
  },
  upcomingTimeLabel: {
    fontSize: 13,
    fontFamily: FontFamily.sansRegular,
    marginTop: 2,
  },
  notificationBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
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
  },
  notificationBannerClose: {
    padding: 4,
  },
  notificationBannerText: {
    fontSize: 14,
    fontFamily: FontFamily.sansRegular,
    marginBottom: Spacing.md,
  },
  notificationBannerButton: {
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  notificationBannerButtonText: {
    fontSize: 14,
    fontFamily: FontFamily.sansSemiBold,
  },
});
