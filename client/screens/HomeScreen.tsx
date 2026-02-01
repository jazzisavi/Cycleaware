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
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Card } from "@/components/Card";
import { AppHeader } from "@/components/AppHeader";
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

export default function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const queryClient = useQueryClient();
  const [showWelcome, setShowWelcome] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());

  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

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
      <AppHeader title="Today" />

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
          <View style={[styles.welcomeCard, { backgroundColor: "#FFFFFF" }]}>
            <Pressable 
              style={styles.closeButton}
              onPress={() => setShowWelcome(false)}
              testID="button-close-welcome"
            >
              <Feather name="x" size={18} color={theme.textTertiary} />
            </Pressable>
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>
              Welcome message
            </Text>
            <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>
              Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien is convallis
            </Text>
          </View>
        ) : null}

        {/* Create Reminder Button */}
        <Pressable
          style={[styles.createReminderButton, { backgroundColor: "#FFFFFF", borderColor: theme.border }]}
          onPress={() => navigation.navigate("TypeSelector")}
          testID="button-create-reminder"
        >
          <Text style={[styles.createReminderText, { color: theme.text }]}>
            Create a reminder
          </Text>
          <View style={[styles.plusIcon, { backgroundColor: theme.primary }]}>
            <Feather name="plus" size={20} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Today's Reminders */}
        {todaysReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Today's Reminders
            </Text>
            {todaysReminders.map((reminder) => {
              const isCompleted = completedIds.has(reminder.id);
              return (
                <Card key={reminder.id} style={styles.reminderCard}>
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
                      <Text style={[styles.reminderTime, { color: theme.textSecondary }]}>
                        {formatTime(reminder.reminderTime)} today
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
                        Status: Active
                      </Text>
                    </View>
                    <Pressable 
                      style={styles.completeButton}
                      onPress={() => handleComplete(reminder.id)}
                      disabled={isCompleted || completeMutation.isPending}
                      testID={`button-complete-${reminder.id}`}
                    >
                      <Feather 
                        name={isCompleted ? "check-circle" : "circle"} 
                        size={28} 
                        color={isCompleted ? theme.success : theme.border} 
                      />
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
              Upcoming
            </Text>
            {upcomingReminders.map((reminder) => (
              <Card key={reminder.id} style={styles.reminderCard}>
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
                      {formatDate(reminder.nextOccurrence)} at {formatTime(reminder.reminderTime)}
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

        {/* Check out your History Banner */}
        {reminders.length > 0 ? (
          <Pressable 
            style={[styles.historyBanner, { backgroundColor: "#FFFFFF" }]}
            onPress={() => navigation.navigate("History")}
            testID="button-view-history"
          >
            <View style={styles.historyContent}>
              <Text style={[styles.historyTitle, { color: theme.text }]}>
                Check out your History
              </Text>
              <Text style={[styles.historyText, { color: theme.textSecondary }]}>
                You have several unresolved reminders, check out your history to make sure you're on track
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
              No reminders yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Create your first reminder to get started
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
  createReminderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  createReminderText: {
    fontSize: 16,
    fontWeight: "500",
  },
  plusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
  completeButton: {
    padding: Spacing.sm,
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
});
