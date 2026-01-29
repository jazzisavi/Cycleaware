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
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, Typography, BorderRadius } from "@/constants/theme";
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
  const [showWelcome, setShowWelcome] = useState(true);

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Navigation Bar */}
      <View style={[styles.topNav, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.logoContainer}>
          <Text style={[styles.logoText, { color: theme.primary }]}>GoFlo</Text>
        </View>
        <Text style={[styles.navTitle, { color: theme.text }]}>Today</Text>
        <Pressable 
          style={styles.moreButton}
          onPress={() => navigation.navigate("More")}
          testID="button-more"
        >
          <Feather name="more-horizontal" size={24} color={theme.text} />
        </Pressable>
      </View>

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
          <View style={[styles.welcomeCard, { backgroundColor: theme.surface }]}>
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
          style={[styles.createReminderButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => navigation.navigate("TypeSelector")}
          testID="button-create-reminder"
        >
          <Text style={[styles.createReminderText, { color: theme.text }]}>
            Create a reminder
          </Text>
          <View style={[styles.plusIcon, { backgroundColor: theme.accent }]}>
            <Feather name="plus" size={20} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Today's Reminders */}
        {todaysReminders.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Today's Reminders
            </Text>
            {todaysReminders.map((reminder) => (
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
            ))}
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
            ))}
          </View>
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
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  logoContainer: {
    width: 60,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
  },
  navTitle: {
    fontSize: Typography.h2,
    fontWeight: "600",
  },
  moreButton: {
    width: 60,
    alignItems: "flex-end",
    padding: Spacing.xs,
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
    padding: Spacing.xs,
  },
  welcomeTitle: {
    fontSize: Typography.h3,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  welcomeText: {
    fontSize: Typography.body,
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
    fontSize: Typography.body,
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
    fontSize: Typography.h2,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: Typography.body,
    textAlign: "center",
  },
});
