import React from "react";
import { View, FlatList, StyleSheet, Image, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ReminderCard } from "@/components/ReminderCard";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { Reminder } from "@shared/schema";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const { data: reminders = [], isLoading, refetch } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const todayReminders = reminders.filter((r) => {
    if (!r.nextOccurrence) return false;
    const next = new Date(r.nextOccurrence);
    const today = new Date();
    return (
      next.getDate() === today.getDate() &&
      next.getMonth() === today.getMonth() &&
      next.getFullYear() === today.getFullYear()
    );
  });

  const upcomingReminders = reminders.filter((r) => {
    if (!r.nextOccurrence) return false;
    const next = new Date(r.nextOccurrence);
    const today = new Date();
    const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7;
  });

  const handleReminderPress = (reminder: Reminder) => {
    navigation.navigate("ReminderDetail", { reminderId: reminder.id });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.welcomeRow}>
        <Image
          source={require("../../assets/images/default-avatar.png")}
          style={styles.avatar}
        />
        <View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Welcome back
          </ThemedText>
          <ThemedText type="h2">Your Reminders</ThemedText>
        </View>
      </View>

      {todayReminders.length > 0 ? (
        <>
          <SectionHeader title="Today" />
          {todayReminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onPress={() => handleReminderPress(reminder)}
              testID={`reminder-today-${reminder.id}`}
            />
          ))}
        </>
      ) : null}

      {upcomingReminders.length > 0 ? (
        <>
          <SectionHeader title="Upcoming" />
          {upcomingReminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onPress={() => handleReminderPress(reminder)}
              testID={`reminder-upcoming-${reminder.id}`}
            />
          ))}
        </>
      ) : null}
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-today.png")}
      title="All Clear!"
      description="You have no reminders for today. Enjoy your day or create a new reminder."
    />
  );

  if (reminders.length === 0 && !isLoading) {
    return (
      <ThemedView style={styles.container}>
        <FlatList
          data={[]}
          renderItem={() => null}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: headerHeight + Spacing.xl,
              paddingBottom: tabBarHeight + Spacing["5xl"],
              flex: 1,
            },
          ]}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing["5xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingBottom: Spacing.lg,
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});
