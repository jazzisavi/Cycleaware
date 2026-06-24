import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { AppHeader } from "@/components/AppHeader";
import { stopAlarm, getSnoozeDuration, PENDING_NAV_KEY } from "@/services/notifications";
import { useLocalReminders, useLocalHistory } from "@/hooks/useLocalReminders";
import { LocalDatabase } from "@/services/LocalDatabase";
import type { LocalReminder } from "@/services/LocalDatabase";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTrialReminder } from "@/hooks/useTrialReminder";

const MISSED_DISMISSED_AT_KEY = "@goflo/missed_dismissed_at";

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const { rs } = useResponsive();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { permissionStatus, openSettings, notificationsAvailable, checkPermissionStatus } = useNotificationPermission();
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());
  const [snoozedMap, setSnoozedMap] = useState<Map<string, Date>>(new Map());
  const [missedDismissedAt, setMissedDismissedAt] = useState<Date | null>(null);

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { reminders, refresh } = useLocalReminders();
  const { history: notificationHistory, refresh: refreshHistory } = useLocalHistory();
  const { isInTrial, daysLeft, trialExpired, isPro, isSubscribed, trialStartDate } = useSubscription();
  const trialReminder = useTrialReminder(daysLeft, isSubscribed, now.getTime(), trialStartDate);

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
      AsyncStorage.getItem(MISSED_DISMISSED_AT_KEY).then((val) => {
        setMissedDismissedAt(val ? new Date(val) : null);
      });
      AsyncStorage.getItem(PENDING_NAV_KEY).then((val) => {
        if (val === "Paywall") {
          AsyncStorage.removeItem(PENDING_NAV_KEY).catch(() => {});
          navigation.navigate("Paywall");
        }
      });
    }, [])
  );

  const handleDismissMissed = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = new Date();
    await AsyncStorage.setItem(MISSED_DISMISSED_AT_KEY, now.toISOString());
    setMissedDismissedAt(now);
  };

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
    const durationMinutes = await getSnoozeDuration();
    const snoozeUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    setSnoozedMap(prev => {
      const next = new Map(prev);
      next.set(expandedKey, snoozeUntil);
      return next;
    });
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

  // Build a set of slots already actioned via notification today.
  // Key format: `${reminderId}-${HH:MM}` derived from scheduledAt.
  // This lets us hide cards for slots taken/skipped via notification
  // even before actionedIds (homepage taps) or nextOccurrence advance pick it up.
  const todayStr = today.toDateString();
  const historicallyActionedKeys = new Set<string>();
  for (const entry of notificationHistory) {
    if (entry.status !== "completed" && entry.status !== "skipped") continue;
    const scheduled = new Date(entry.scheduledAt);
    if (scheduled.toDateString() !== todayStr) continue;
    const hh = scheduled.getHours().toString().padStart(2, "0");
    const mm = scheduled.getMinutes().toString().padStart(2, "0");
    historicallyActionedKeys.add(`${entry.reminderId}-${hh}:${mm}`);
  }

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
      if (!r.isActive) return false;
      const next = new Date(r.nextOccurrence || "");
      next.setHours(0, 0, 0, 0);
      return next.getTime() === today.getTime();
    })
    .flatMap(expandReminder)
    .filter((r) => !historicallyActionedKeys.has(`${r.id}-${r.displayTime}`))
    .sort((a, b) => (a.displayTime || "").localeCompare(b.displayTime || ""));

  const upcomingReminders = reminders
    .filter((r) => {
      if (!r.isActive) return false;
      const next = new Date(r.nextOccurrence || "");
      next.setHours(0, 0, 0, 0);
      return next > today && next <= threeDaysFromNow;
    })
    .flatMap(expandReminder)
    .sort((a, b) => {
      const dA = new Date(a.nextOccurrence || "");
      dA.setHours(0, 0, 0, 0);
      const dB = new Date(b.nextOccurrence || "");
      dB.setHours(0, 0, 0, 0);
      if (dA.getTime() !== dB.getTime()) return dA.getTime() - dB.getTime();
      return (a.displayTime || "").localeCompare(b.displayTime || "");
    });

  const unresolvedCount = notificationHistory.filter((entry) => {
    if (entry.status === "completed" || entry.status === "skipped" || entry.status === "snoozed") return false;
    const scheduled = new Date(entry.scheduledAt);
    scheduled.setHours(0, 0, 0, 0);
    if (scheduled >= today) return false;
    if (missedDismissedAt && new Date(entry.scheduledAt) <= missedDismissedAt) return false;
    return true;
  }).length;

  const showUnresolved = unresolvedCount > 0;

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
  const isSnoozed = (key: string) => snoozedMap.has(key);
  const getSnoozedUntil = (key: string): Date | undefined => snoozedMap.get(key);

  const formatSnoozedUntil = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes.toString().padStart(2, "0");
    return `${hour12}:${minuteStr} ${ampm}`;
  };

  const getCycleDayForDate = (reminder: ExpandedReminder, date: Date): number | null => {
    if (reminder.reminderType !== "cycle" || !reminder.cycleStartDate || !reminder.cycleDayEnd) return null;
    const cycleLength = reminder.cycleDayEnd;
    const start = new Date(reminder.cycleStartDate);
    start.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const daysSinceStart = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceStart < 0) return null;
    return (daysSinceStart % cycleLength) + 1;
  };

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
        {isInTrial && !isSubscribed ? (
          <View style={[styles.trialBar, { borderColor: theme.borderLight }]}>
            <View style={styles.trialBarRow}>
              <Text style={[styles.trialBarLabel, { color: theme.text }]}>{Copy.subscription.trialBarLabel}</Text>
              <Text style={[styles.trialBarDays, { color: theme.text }]}>{Copy.subscription.trialDaysLeft(daysLeft)}</Text>
            </View>
            <View style={styles.trialProgressTrack}>
              <View style={[styles.trialProgressFill, { width: `${Math.round((daysLeft / 30) * 100)}%` }]} />
            </View>
          </View>
        ) : null}

        {reminders.length === 0 ? (
          <View style={[styles.welcomeCard, { backgroundColor: "#DDF1F5" }]}>
            <View style={[styles.welcomeDecorativeCircle, { width: rs(120), height: rs(120), borderRadius: rs(60) }]} />
            <Text style={[styles.welcomeTitle, { color: theme.saveButtonActive, fontSize: rs(26) }]}>{Copy.home.welcomeTitle}</Text>
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

        {trialReminder.showReminder || todaysReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{Copy.home.todaysReminders}</Text>
            {trialReminder.showReminder ? (
              <View style={[styles.activeCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]} testID="card-trial-reminder">
                <View style={styles.activeCardTop}>
                  <View style={[styles.bellIconCircle, { backgroundColor: theme.ctaTeal + "25" }]}>
                    <MaterialCommunityIcons name="bell-ring" size={18} color={theme.ctaTeal} />
                  </View>
                  <View style={styles.activeCardInfo}>
                    <Text style={[styles.activeTitle, { color: theme.text }]}>{Copy.subscription.trialReminderTitle(daysLeft)}</Text>
                    <Text style={[styles.activeNotes, { color: theme.textSecondary }]}>{Copy.subscription.trialReminderBody(daysLeft)}</Text>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      await trialReminder.remindLater();
                    }}
                    testID="button-trial-remind-later"
                  >
                    <Text style={[styles.textActionButton, { color: theme.ctaTeal }]}>{Copy.subscription.trialWarningRemind}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.takeButton, { backgroundColor: theme.saveButtonActive }]}
                    onPress={async () => {
                      await trialReminder.upgrade();
                      navigation.navigate("Paywall");
                    }}
                    testID="button-trial-upgrade"
                  >
                    <Text style={[styles.takeButtonText, { color: "#FFFFFF" }]}>{Copy.subscription.trialWarningUpgrade}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {todaysReminders.filter((r) => !isActioned(r.expandedKey)).map((reminder) => {
              const snoozed = isSnoozed(reminder.expandedKey);
              const snoozeUntilDate = getSnoozedUntil(reminder.expandedKey);
              const slotDatetime = new Date(reminder.nextOccurrence || "");
              const [slotH, slotM] = (reminder.displayTime || "00:00").split(":").map(Number);
              slotDatetime.setHours(slotH, slotM, 0, 0);
              const isDue = slotDatetime <= now;
              const activeCycleDay = getCycleDayForDate(reminder, now);
              const activeDisplayTitle = activeCycleDay != null ? `Day ${activeCycleDay} - ${reminder.title}` : reminder.title;
              return (
                <View key={reminder.expandedKey} style={[styles.activeCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]}>
                  <View style={styles.activeCardTop}>
                    <View style={[styles.bellIconCircle, { backgroundColor: theme.ctaTeal + "25" }]}>
                      <MaterialCommunityIcons name="bell-ring" size={18} color={theme.ctaTeal} />
                    </View>
                    <View style={styles.activeCardInfo}>
                      <Text style={[styles.activeTitle, { color: theme.text }]}>{activeDisplayTitle}</Text>
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
                    {isDue ? (
                      <Pressable
                        onPress={snoozed ? undefined : () => handleSnooze(reminder.expandedKey, reminder.id, reminder.title, reminder.displayTime)}
                        disabled={snoozed}
                      >
                        <Text style={[styles.textActionButton, { color: snoozed ? theme.textTertiary : theme.ctaTeal, opacity: snoozed ? 0.4 : 1 }]}>{Copy.home.snoozeButton}</Text>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => handleSkip(reminder.expandedKey, reminder.id, reminder.title, reminder.displayTime)}>
                      <Text style={[styles.textActionButton, { color: theme.ctaTeal }]}>{Copy.home.skipButton}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.takeButton, { backgroundColor: theme.ctaTeal }]}
                      onPress={() => handleComplete(reminder.expandedKey, reminder.id, reminder.title, reminder.displayTime)}
                      testID={`button-complete-${reminder.expandedKey}`}
                    >
                      <Text style={[styles.takeButtonText, { color: theme.buttonText }]}>{Copy.home.takeButton}</Text>
                    </Pressable>
                  </View>
                  {snoozed && snoozeUntilDate ? (
                    <Text style={[styles.snoozedLabel, { color: theme.textSecondary }]}>
                      {`Snoozed until ${formatSnoozedUntil(snoozeUntilDate)}`}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {trialReminder.showUpgradeCard ? (
          <View style={[styles.upgradeCard, { backgroundColor: isDark ? theme.ctaCard : "#E3F1F4" }]} testID="card-upgrade-cta">
            <View style={styles.upgradeCardTop}>
              <Text style={[styles.upgradeCardTitle, { color: theme.saveButtonActive }]}>{Copy.subscription.trialEndedTitle}</Text>
              <Pressable onPress={() => trialReminder.dismissUpgradeCard()} hitSlop={8} testID="button-dismiss-upgrade-cta">
                <Feather name="x" size={18} color={theme.textTertiary} />
              </Pressable>
            </View>
            <Text style={[styles.upgradeCardBody, { color: theme.textSecondary }]}>{Copy.subscription.trialEndedBody}</Text>
            <Pressable onPress={() => navigation.navigate("Paywall")} testID="button-upgrade-cta-link">
              <Text style={[styles.upgradeCardLink, { color: theme.saveButtonActive }]}>{`${Copy.subscription.trialEndedLink} →`}</Text>
            </Pressable>
          </View>
        ) : null}

        {showUnresolved ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{Copy.home.unresolved}</Text>
            <Pressable
              style={[styles.unresolvedCard, { backgroundColor: isDark ? "#3D2A1E" : "#F0E6D8" }]}
              onPress={() => navigation.navigate("History")}
              testID="button-unresolved-card"
            >
              <View style={styles.unresolvedHeader}>
                <View style={styles.unresolvedIconRow}>
                  <View style={[styles.unresolvedIconCircle, { backgroundColor: theme.accentCoral + "20" }]}>
                    <Feather name="clock" size={16} color={theme.accentCoral} />
                  </View>
                  <Text style={[styles.unresolvedTitle, { color: theme.accentCoral }]}>{Copy.home.unresolvedTitle}</Text>
                </View>
                <Pressable
                  onPress={handleDismissMissed}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color={theme.textTertiary} />
                </Pressable>
              </View>
              <Text style={[styles.unresolvedBody, { color: theme.text }]}>{Copy.home.unresolvedBody}</Text>
              <Text style={[styles.unresolvedSubtext, { color: theme.textSecondary }]}>{Copy.home.unresolvedSubtext}</Text>
              <Text style={[styles.viewHistoryLink, { color: theme.text }]}>{Copy.home.viewHistory}</Text>
            </Pressable>
          </View>
        ) : null}

        {upcomingReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{Copy.home.upcoming}</Text>
            {upcomingReminders.map((reminder) => {
              const upcomingCycleDay = getCycleDayForDate(reminder, new Date(reminder.nextOccurrence || ""));
              const upcomingDisplayTitle = upcomingCycleDay != null ? `Day ${upcomingCycleDay} - ${reminder.title}` : reminder.title;
              return (
              <View key={reminder.expandedKey} style={[styles.upcomingCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]}>
                <View style={styles.upcomingCardContent}>
                  <View style={[styles.upcomingBellCircle, { backgroundColor: "#FFFFFF", borderColor: "#A8947E" }]}>
                    <Feather name="bell" size={18} color="#A8947E" />
                  </View>
                  <View style={styles.upcomingInfo}>
                    <Text style={[styles.upcomingTitle, { color: theme.text }]}>{upcomingDisplayTitle}</Text>
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
              );
            })}
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
    overflow: "hidden",
  },
  welcomeDecorativeCircle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -30,
    right: -30,
    backgroundColor: "#C5E8EE",
    opacity: 0.7,
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 32,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  activeCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bellIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 16,
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
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing.lg,
    borderRadius: 16,
  },
  takeButtonText: {
    fontSize: 13,
    fontFamily: FontFamily.sansSemiBold,
    letterSpacing: 0.5,
  },
  snoozedLabel: {
    fontSize: 12,
    fontFamily: FontFamily.sansRegular,
    marginTop: Spacing.sm,
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
    borderRadius: 32,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  upcomingCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  upcomingBellCircle: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    borderWidth: 1,
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
  trialBar: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  trialBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  trialBarLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
  },
  trialBarDays: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
  },
  trialProgressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E0E0E0",
    overflow: "hidden",
  },
  trialProgressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2E7D52",
  },
  upgradeCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  upgradeCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  upgradeCardTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 22,
    flex: 1,
    marginRight: Spacing.sm,
  },
  upgradeCardBody: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  upgradeCardLink: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    marginTop: 2,
  },
});
