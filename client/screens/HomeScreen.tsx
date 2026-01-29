import React from "react";
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
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, Typography } from "@/constants/theme";
import Card from "@/components/Card";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface Reminder {
  id: string;
  title: string;
  reminderType: "cycle" | "calendar";
  nextOccurrence: string;
  reminderTime: string;
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

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

  const hasNoReminders = reminders.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: tabBarHeight + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.appTitle, { color: theme.primary }]}>GoFlo</Text>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: theme.text }]}>
            Welcome back!
          </Text>
          <Text style={[styles.welcomeSubtext, { color: theme.textSecondary }]}>
            Stay on track with your reminders
          </Text>
        </View>

        {hasNoReminders ? (
          /* Empty State */
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
            <Pressable
              style={[styles.createButton, { backgroundColor: theme.accent }]}
              onPress={() => navigation.navigate("TypeSelector")}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Reminder</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Today's Reminders */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Today's Reminders
              </Text>
              {todaysReminders.length > 0 ? (
                todaysReminders.map((reminder) => (
                  <Card key={reminder.id} style={styles.reminderCard}>
                    <View style={styles.reminderContent}>
                      <View
                        style={[
                          styles.typeIndicator,
                          {
                            backgroundColor:
                              reminder.reminderType === "cycle"
                                ? Colors.light.accent
                                : Colors.light.mint,
                          },
                        ]}
                      />
                      <View style={styles.reminderInfo}>
                        <Text style={[styles.reminderTitle, { color: theme.text }]}>
                          {reminder.title}
                        </Text>
                        <Text style={[styles.reminderTime, { color: theme.textSecondary }]}>
                          {formatTime(reminder.reminderTime)}
                        </Text>
                      </View>
                      <Pressable style={styles.completeButton}>
                        <Feather name="check-circle" size={24} color={theme.success} />
                      </Pressable>
                    </View>
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <View style={styles.emptyCardContent}>
                    <Feather name="sun" size={32} color={theme.textTertiary} />
                    <Text style={[styles.emptyCardText, { color: theme.textSecondary }]}>
                      All clear for today!
                    </Text>
                  </View>
                </Card>
              )}
            </View>

            {/* Upcoming Reminders */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Upcoming
              </Text>
              {upcomingReminders.length > 0 ? (
                upcomingReminders.map((reminder) => (
                  <Card key={reminder.id} style={styles.reminderCard}>
                    <View style={styles.reminderContent}>
                      <View
                        style={[
                          styles.typeIndicator,
                          {
                            backgroundColor:
                              reminder.reminderType === "cycle"
                                ? Colors.light.accent
                                : Colors.light.mint,
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
                      </View>
                    </View>
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <View style={styles.emptyCardContent}>
                    <Feather name="calendar" size={32} color={theme.textTertiary} />
                    <Text style={[styles.emptyCardText, { color: theme.textSecondary }]}>
                      No upcoming reminders
                    </Text>
                  </View>
                </Card>
              )}
            </View>

            {/* Quick Create CTA */}
            <Pressable
              style={[styles.quickCreateCard, { backgroundColor: theme.primaryLight }]}
              onPress={() => navigation.navigate("TypeSelector")}
            >
              <View style={styles.quickCreateContent}>
                <Feather name="plus-circle" size={24} color={theme.primary} />
                <Text style={[styles.quickCreateText, { color: theme.primary }]}>
                  Create a new reminder
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.primary} />
            </Pressable>
          </>
        )}
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
  },
  header: {
    marginBottom: Spacing.md,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  welcomeSection: {
    marginBottom: Spacing.xl,
  },
  welcomeText: {
    fontSize: Typography.display,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  welcomeSubtext: {
    fontSize: Typography.body,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyImage: {
    width: 180,
    height: 180,
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.h2,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: Typography.body,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.button,
    fontWeight: "600",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.h2,
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
    fontSize: Typography.h3,
    fontWeight: "600",
    marginBottom: 2,
  },
  reminderTime: {
    fontSize: Typography.bodySmall,
  },
  reminderMeta: {
    fontSize: Typography.bodySmall,
  },
  completeButton: {
    padding: Spacing.sm,
  },
  emptyCard: {
    paddingVertical: Spacing.xl,
  },
  emptyCardContent: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyCardText: {
    fontSize: Typography.body,
  },
  quickCreateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: 12,
    marginTop: Spacing.md,
  },
  quickCreateContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  quickCreateText: {
    fontSize: Typography.body,
    fontWeight: "600",
  },
});
