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
        <View style={styles.notificationBanner} testID="banner-notification-warning">
          <View style={styles.notificationBannerHeader}>
            <Text style={styles.notificationBannerTitle}>{Copy.home.notificationBannerTitle}</Text>
            <Pressable onPress={() => setBannerDismissed(true)} style={styles.notificationBannerClose} hitSlop={8}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.notificationBannerText}>{Copy.home.notificationBannerText}</Text>
          <Pressable onPress={openSettings} style={styles.notificationBannerButton}>
            <Text style={styles.notificationBannerButtonText}>{Copy.home.notificationBannerButton}</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {reminders.length === 0 ? (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>{Copy.home.welcomeTitle}</Text>
            <Text style={styles.welcomeText}>{Copy.home.welcomeText}</Text>
            <Pressable
              style={styles.ctaButton}
              onPress={() => navigation.navigate("CreateReminder")}
              testID="button-create-reminder"
            >
              <Feather name="plus" size={20} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
              <Text style={styles.ctaButtonText}>{Copy.home.createReminderButton}</Text>
            </Pressable>
          </View>
        ) : null}

        {todaysReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{Copy.home.todaysReminders}</Text>
            {todaysReminders.map((reminder) => {
              const actioned = isActioned(reminder.expandedKey);
              return (
                <View key={reminder.expandedKey} style={[styles.activeCard, { backgroundColor: theme.backgroundDefault }]}>
                  <View style={styles.activeCardTop}>
                    <View style={styles.bellIconCircle}>
                      <Feather name="bell" size={18} color="#2A6E7A" />
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

                  {actioned ? (
                    <View style={styles.actionedRow}>
                      <View style={[styles.actionedBadge, {
                        backgroundColor: completedIds.has(reminder.expandedKey) ? "#E8F5EE" : "#F5F0E8"
                      }]}>
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
                      <Pressable onPress={() => handleSnooze(reminder.expandedKey, reminder.id, reminder.title)}>
                        <Text style={styles.textActionButton}>{Copy.home.snoozeButton}</Text>
                      </Pressable>
                      <Pressable onPress={() => handleSkip(reminder.expandedKey, reminder.id, reminder.title)}>
                        <Text style={styles.textActionButton}>{Copy.home.skipButton}</Text>
                      </Pressable>
                      <View style={{ flex: 1 }} />
                      <Pressable
                        style={styles.takeButton}
                        onPress={() => handleComplete(reminder.expandedKey, reminder.id, reminder.title)}
                        testID={`button-complete-${reminder.expandedKey}`}
                      >
                        <Text style={styles.takeButtonText}>{Copy.home.takeButton}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        {showUnresolved ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{Copy.home.unresolved}</Text>
            <View style={[styles.unresolvedCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.unresolvedHeader}>
                <View style={styles.unresolvedIconRow}>
                  <View style={styles.unresolvedIconCircle}>
                    <Feather name="clock" size={16} color="#C03A2B" />
                  </View>
                  <Text style={styles.unresolvedTitle}>{Copy.home.unresolvedTitle}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setUnresolvedDismissed(true);
                  }}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color="#9A8D7F" />
                </Pressable>
              </View>
              <Text style={[styles.unresolvedBody, { color: theme.text }]}>{Copy.home.unresolvedBody}</Text>
              <Text style={[styles.unresolvedSubtext, { color: theme.textSecondary }]}>{Copy.home.unresolvedSubtext}</Text>
              <Pressable onPress={() => navigation.navigate("History")} testID="button-view-history">
                <Text style={styles.viewHistoryLink}>{Copy.home.viewHistory}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {upcomingReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{Copy.home.upcoming}</Text>
            {upcomingReminders.map((reminder) => (
              <View key={reminder.expandedKey} style={[styles.upcomingCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.upcomingCardContent}>
                  <View style={styles.upcomingBellCircle}>
                    <Feather name="bell" size={18} color="#9A8D7F" />
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
    backgroundColor: "#D5E8E4",
  },
  welcomeTitle: {
    fontSize: 26,
    fontFamily: FontFamily.serifBold,
    color: "#E8614F",
    marginBottom: Spacing.sm,
  },
  welcomeText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FontFamily.sansRegular,
    color: "#2C2118",
    marginBottom: Spacing.xl,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: BorderRadius["2xl"],
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
  sectionLabel: {
    fontSize: 12,
    fontFamily: FontFamily.sansSemiBold,
    color: "#6B5744",
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
    backgroundColor: "#D5E8EC",
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
    marginTop: Spacing.lg,
    gap: Spacing.xl,
  },
  textActionButton: {
    fontSize: 13,
    fontFamily: FontFamily.sansSemiBold,
    color: "#2A6E7A",
    letterSpacing: 0.5,
  },
  takeButton: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: "#E8614F",
  },
  takeButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FontFamily.sansSemiBold,
    letterSpacing: 0.5,
  },
  actionedRow: {
    marginTop: Spacing.lg,
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
  unresolvedCard: {
    borderRadius: BorderRadius.lg,
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
    backgroundColor: "#FDEEE9",
    alignItems: "center",
    justifyContent: "center",
  },
  unresolvedTitle: {
    fontSize: 15,
    fontFamily: FontFamily.sansSemiBold,
    color: "#C03A2B",
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
    color: "#2C2118",
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
    backgroundColor: "#EDE7DA",
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
