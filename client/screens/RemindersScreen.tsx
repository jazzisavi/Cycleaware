import React from "react";
import { FlatList, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import { ThemedView } from "@/components/ThemedView";
import { ReminderCard } from "@/components/ReminderCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { Reminder } from "@shared/schema";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const { data: reminders = [], isLoading, refetch } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const activeReminders = reminders.filter((r) => r.isActive);

  const handleReminderPress = (reminder: Reminder) => {
    // Navigate to edit form based on reminder type
    if (reminder.reminderType === "cycle") {
      navigation.navigate("CreateCycleReminder", { reminderId: reminder.id });
    } else {
      navigation.navigate("CreateCalendarReminder", { reminderId: reminder.id });
    }
  };

  const handleCreatePress = () => {
    navigation.navigate("TypeSelector");
  };

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-reminders.png")}
      title="No Reminders Yet"
      description="Create your first reminder to get started with building good habits."
      action={
        <Button onPress={handleCreatePress} testID="button-create-first">
          Create Reminder
        </Button>
      }
    />
  );

  const renderItem = ({ item }: { item: Reminder }) => (
    <ReminderCard
      reminder={item}
      onPress={() => handleReminderPress(item)}
      testID={`reminder-card-${item.id}`}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={activeReminders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing["5xl"],
            flex: activeReminders.length === 0 ? 1 : undefined,
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
});
