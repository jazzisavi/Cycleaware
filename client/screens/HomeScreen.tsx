import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface Reminder {
  id: number;
  title: string;
  notes?: string;
  reminderType: "cycle" | "calendar";
  nextOccurrence: string;
  reminderTime: string;
  reminderTimes?: string[];
}

interface NotificationHistoryItem {
  id: number;
  status: string;
  scheduledFor: string;
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const queryClient = useQueryClient();
  const { permissionStatus, openSettings, notificationsAvailable } = useNotificationPermission();
  const [showWelcome, setShowWelcome] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  
  const showNotificationWarning = notificationsAvailable && permissionStatus !== "granted" && permissionStatus !== "unavailable";

  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const { data: notificationHistory = [] } = useQuery<NotificationHistoryItem[]>({
    queryKey: ["/api/notification-history"],
  });

  const incompleteCount = notificationHistory.filter(
    (item) => item.status !== "completed"
  ).length;

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/reminders/${id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
  });

  const handleComplete = (id: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCompletedIds(prev => new Set(prev).add(id));
    completeMutation.mutate(id);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const todaysReminders = reminders.filter((r) => {
    const next = new Date(r.nextOccurrence);
    next.setHours(0, 0, 0, 0);
    return next.getTime() === today.getTime();
  });

  const upcomingReminders = reminders.filter((r) => {
    const next = new Date(r.nextOccurrence);
    next.setHours(0, 0, 0, 0);
    return next > today && next <= threeDaysFromNow;
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

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <AppHeader title={Copy.navigation.today} />

      {showNotificationWarning ? (
        <Pressable 
          onPress={openSettings}
          style={styles.notificationBanner}
          testID="banner-notification-warning"
        >
          <View style={styles.notificationBannerContent}>
            <View style={styles.notificationBannerIcon}>
              <Feather name="bell-off" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.notificationBannerText}>
              {Copy.home.notificationBannerText}
            </Text>
            <Feather name="chevron-right" size={18} color="#FFFFFF" />
          </View>
        </Pressable>
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
        {/* Welcome Message Card */}
        {showWelcome ? (
          <View style={[styles.welcomeCard, { backgroundColor: theme.backgroundDefault }]}>
            <Pressable 
              style={styles.closeButton}
              onPress={() => setShowWelcome(false)}
              testID="button-close-welcome"
            >
              <Feather name="x" size={18} color={theme.textTertiary} />
            </Pressable>
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>
              {Copy.home.welcomeTitle}
            </Text>
            <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>
              {Copy.home.welcomeText}
            </Text>
          </View>
        ) : null}

        {/* Create Reminder Button - only show when no active reminders */}
        {reminders.length === 0 ? (
          <Button
            onPress={() => navigation.navigate("TypeSelector")}
            testID="button-create-reminder"
            icon="plus"
          >
            {Copy.home.createReminderButton}
          </Button>
        ) : null}

        {/* Today's Reminders */}
        {todaysReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {Copy.home.todaysReminders}
            </Text>
            {todaysReminders.map((reminder) => {
              const isCompleted = completedIds.has(reminder.id);
              return (
                <Card key={reminder.id} style={styles.reminderCard}>
                  {showNotificationWarning ? (
                    <Pressable 
                      onPress={openSettings}
                      style={styles.cardWarningBadge}
                      testID={`warning-badge-${reminder.id}`}
                    >
                      <Feather name="alert-triangle" size={12} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
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
                        {Copy.home.timeToday(formatTime(reminder.reminderTime))}
                      </Text>
                      {reminder.notes ? (
                        <Text 
                          style={[styles.reminderNotes, { color: theme.textSecondary }]}
                          numberOfLines={2}
                        >
                          {reminder.notes}
                        </Text>
                      ) : null}
                      <Text style={[styles.reminderStatus, { color: theme.textTertiary }]}>
                        {Copy.home.statusActive}
                      </Text>
                    </View>
                    <Pressable 
                      style={[
                        styles.takenButton,
                        { 
                          backgroundColor: isCompleted ? theme.success : theme.primary,
                          opacity: isCompleted ? 0.6 : 1,
                        }
                      ]}
                      onPress={() => handleComplete(reminder.id)}
                      disabled={isCompleted || completeMutation.isPending}
                      testID={`button-complete-${reminder.id}`}
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

        {/* Upcoming Reminders */}
        {upcomingReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {Copy.home.upcoming}
            </Text>
            {upcomingReminders.map((reminder) => (
              <Card key={reminder.id} style={styles.reminderCard}>
                {showNotificationWarning ? (
                  <Pressable 
                    onPress={openSettings}
                    style={styles.cardWarningBadge}
                    testID={`warning-badge-upcoming-${reminder.id}`}
                  >
                    <Feather name="alert-triangle" size={12} color="#FFFFFF" />
                  </Pressable>
                ) : null}
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
                      {Copy.home.dateAtTime(formatDate(reminder.nextOccurrence), formatTime(reminder.reminderTime))}
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
              </Card>
            ))}
          </View>
        ) : null}

        {/* Check out your History Banner - only show when more than 3 incomplete reminders */}
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

        {/* Empty State - only show if no reminders and welcome is dismissed */}
        {reminders.length === 0 && !showWelcome ? (
          <View style={styles.emptyState}>
            <Image
              source={require("../../assets/images/empty-today.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {Copy.home.noRemindersTitle}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {Copy.home.noRemindersSubtitle}
            </Text>
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
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    zIndex: 10,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  welcomeText: {
    fontSize: 16,
    lineHeight: 22,
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
  emptyState: {
    alignItems: "center",
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  emptyImage: {
    width: 160,
    height: 160,
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  notificationBanner: {
    backgroundColor: "#DC3545",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  notificationBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  notificationBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBannerText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  cardWarningBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
});
