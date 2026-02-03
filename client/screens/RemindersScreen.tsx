import React, { useState, useLayoutEffect } from "react";
import {
  FlatList,
  StyleSheet,
  RefreshControl,
  View,
  Switch,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { AppHeader } from "@/components/AppHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { Reminder } from "@shared/schema";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  // Reset selection mode when navigating away from the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Cleanup when screen loses focus
        setIsSelecting(false);
        setSelectedIds(new Set());
      };
    }, [])
  );

  const { data: reminders = [], isLoading, refetch } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PUT", `/api/reminders/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/reminders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
  });

  const handleEditPress = (reminder: Reminder) => {
    if (reminder.reminderType === "cycle") {
      navigation.navigate("CreateCycleReminder", { reminderId: reminder.id });
    } else {
      navigation.navigate("CreateCalendarReminder", { reminderId: reminder.id });
    }
  };

  const handleCreatePress = () => {
    navigation.navigate("TypeSelector");
  };

  const handleToggle = (reminder: Reminder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleMutation.mutate({ id: reminder.id, isActive: !reminder.isActive });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === reminders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reminders.map((r) => r.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const message = Copy.remindersScreen.deleteConfirmMessage(selectedIds.size);
    
    const performDelete = async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      for (const id of selectedIds) {
        await deleteMutation.mutateAsync(id);
      }
      setSelectedIds(new Set());
      setIsSelecting(false);
    };

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        await performDelete();
      }
    } else {
      Alert.alert(Copy.remindersScreen.deleteConfirmTitle, message, [
        { text: Copy.common.cancel, style: "cancel" },
        { text: Copy.common.delete, style: "destructive", onPress: performDelete },
      ]);
    }
  };

  const formatStartDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDayName = (day: string) => {
    const dayNames: Record<string, string> = {
      sun: "Sun",
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
      sat: "Sat",
    };
    return dayNames[day] || day;
  };

  const formatReminderDescription = (reminder: Reminder) => {
    if (reminder.reminderType === "cycle") {
      const startDay = reminder.cycleDayStart || 1;
      const endDay = reminder.cycleDayEnd || startDay;
      const time = formatTime(reminder.reminderTime);
      const startDate = reminder.cycleStartDate ? ` - Started ${formatStartDate(reminder.cycleStartDate)}` : "";
      return `Day ${startDay} to ${endDay} at ${time}${startDate}`;
    } else {
      const time = formatTime(reminder.reminderTime);
      const weeklyDays = (reminder.weeklyRepeatDays as string[]) || [];
      const startDate = reminder.calendarStartDate ? ` - Started ${formatStartDate(reminder.calendarStartDate)}` : "";
      
      if (weeklyDays.length > 0) {
        const dayLabels = weeklyDays.map(formatDayName).join(", ");
        return `${dayLabels} at ${time}${startDate}`;
      }
      
      return `Daily at ${time}${startDate}`;
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "9am";
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "pm" : "am";
    const hour12 = hour % 12 || 12;
    return `${hour12}${minutes !== "00" ? `:${minutes}` : ""}${ampm}`;
  };

  const renderEmpty = () => (
    <EmptyState
      title={Copy.remindersScreen.noRemindersTitle}
      description={Copy.remindersScreen.noRemindersDescription}
      action={
        <Button onPress={handleCreatePress} testID="button-create-first" icon="plus">
          {Copy.remindersScreen.createReminderButton}
        </Button>
      }
    />
  );

  const renderItem = ({ item }: { item: Reminder }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight },
      ]}
    >
      {isSelecting ? (
        <Pressable
          style={styles.selectCheckbox}
          onPress={() => handleToggleSelect(item.id)}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: selectedIds.has(item.id) ? theme.primary : theme.border,
                backgroundColor: selectedIds.has(item.id) ? theme.primary : "transparent",
              },
            ]}
          >
            {selectedIds.has(item.id) ? (
              <Feather name="check" size={14} color="#FFFFFF" />
            ) : null}
          </View>
        </Pressable>
      ) : null}

      <View style={styles.cardContent}>
        <ThemedText type="h4" style={styles.cardTitle}>
          {item.title}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {formatReminderDescription(item)}
        </ThemedText>
      </View>

      <View style={styles.cardActions}>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggle(item)}
          trackColor={{ false: theme.borderLight, true: theme.primary + "60" }}
          thumbColor={item.isActive ? theme.primary : theme.textTertiary}
          style={styles.switch}
        />
        <Pressable
          onPress={() => handleEditPress(item)}
          hitSlop={8}
          testID={`button-edit-${item.id}`}
        >
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {Copy.common.edit}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const allSelected = reminders.length > 0 && selectedIds.size === reminders.length;

  const renderListHeader = () => {
    if (reminders.length === 0) return null;
    
    return (
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          {isSelecting && selectedIds.size > 0 ? (
            <Pressable onPress={handleDeleteSelected} style={styles.toolbarButton}>
              <ThemedText type="body" style={{ color: theme.error }}>
                {Copy.remindersScreen.deleteCount(selectedIds.size)}
              </ThemedText>
            </Pressable>
          ) : (
            <View />
          )}
        </View>
        
        <Pressable
          onPress={() => {
            if (isSelecting) {
              handleSelectAll();
            } else {
              // Enter selection mode AND select all items immediately
              setIsSelecting(true);
              setSelectedIds(new Set(reminders.map((r) => r.id)));
            }
          }}
          style={styles.toolbarButton}
        >
          <ThemedText type="body" style={{ color: theme.primary }}>
            {isSelecting ? (allSelected ? Copy.remindersScreen.deselectAll : Copy.remindersScreen.selectAll) : Copy.remindersScreen.selectAll}
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <AppHeader title={Copy.navigation.reminders} />
      <FlatList
        data={reminders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Spacing.md,
            paddingBottom: tabBarHeight + Spacing["5xl"],
            flex: reminders.length === 0 ? 1 : undefined,
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
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  toolbarLeft: {
    flex: 1,
  },
  toolbarButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  selectCheckbox: {
    marginRight: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    marginBottom: 4,
  },
  cardActions: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  switch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
});
