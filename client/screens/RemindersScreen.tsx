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
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { AppHeader } from "@/components/AppHeader";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { useLocalReminders } from "@/hooks/useLocalReminders";
import { LocalDatabase } from "@/services/LocalDatabase";
import type { LocalReminder } from "@/services/LocalDatabase";
import { cancelPendingNotificationsForReminder, scheduleAllTimesForReminder } from "@/services/notifications";
import { syncCycleConfigsToServer } from "@/services/pushSync";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Text } from "react-native";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { rs } = useResponsive();
  const navigation = useNavigation<NavigationProp>();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { permissionStatus, openSettings, notificationsAvailable } = useNotificationPermission();

  const { reminders, isLoaded, refresh } = useLocalReminders();

  useFocusEffect(
    useCallback(() => {
      refresh();
      return () => {
        setIsSelecting(false);
        setSelectedIds(new Set());
      };
    }, [refresh])
  );

  const hasReminders = reminders.length > 0;
  const showNotificationWarning = notificationsAvailable && 
    permissionStatus !== "granted" && 
    permissionStatus !== "unavailable" && 
    hasReminders && 
    !bannerDismissed;

  const handleEditPress = (reminder: LocalReminder) => {
    navigation.navigate("CreateReminder", { reminderId: reminder.id });
  };

  const handleCreatePress = () => {
    navigation.navigate("CreateReminder");
  };

  const handleToggle = async (reminder: LocalReminder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newActive = !reminder.isActive;
    LocalDatabase.toggleReminderActive(reminder.id, newActive);
    if (!newActive) {
      await cancelPendingNotificationsForReminder(reminder.id);
    } else {
      const updated = LocalDatabase.getReminder(reminder.id);
      if (updated && updated.nextOccurrence) {
        await scheduleAllTimesForReminder(updated);
      }
    }
    refresh();
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
      let hasCycle = false;
      for (const id of selectedIds) {
        const r = LocalDatabase.getReminder(id);
        if (r?.reminderType === "cycle") hasCycle = true;
        await cancelPendingNotificationsForReminder(id);
        LocalDatabase.deleteReminder(id);
      }
      if (hasCycle) {
        syncCycleConfigsToServer();
      }
      refresh();
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

  const formatReminderDescription = (reminder: LocalReminder) => {
    const times = reminder.reminderTimes && reminder.reminderTimes.length > 0
      ? reminder.reminderTimes.map(formatTime).join(", ")
      : formatTime(reminder.reminderTime);

    if (reminder.reminderType === "cycle") {
      const startDay = reminder.cycleDayStart || 1;
      const endDay = reminder.cycleDayEnd || startDay;
      const startDate = reminder.cycleStartDate ? ` - Started ${formatStartDate(reminder.cycleStartDate)}` : "";
      return `Day ${startDay} to ${endDay} at ${times}${startDate}`;
    } else {
      const weeklyDays = (reminder.weeklyRepeatDays as string[]) || [];
      const startDate = reminder.calendarStartDate ? ` - Started ${formatStartDate(reminder.calendarStartDate)}` : "";
      const unit = reminder.repeatUnit || "week";
      const interval = reminder.repeatInterval || 1;
      
      if (unit === "day") {
        if (interval === 1) {
          return `Daily at ${times}${startDate}`;
        }
        return `Every ${interval} days at ${times}${startDate}`;
      }
      
      if (weeklyDays.length > 0) {
        const dayLabels = weeklyDays.map(formatDayName).join(", ");
        if (interval > 1) {
          return `Every ${interval} weeks on ${dayLabels} at ${times}${startDate}`;
        }
        return `${dayLabels} at ${times}${startDate}`;
      }
      
      return `Daily at ${times}${startDate}`;
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
    <View style={[styles.welcomeCard, { backgroundColor: "#DDF1F5" }]}>
      <View style={[styles.welcomeDecorativeCircle, { width: rs(120), height: rs(120), borderRadius: rs(60) }]} />
      <Text style={[styles.welcomeTitle, { color: theme.saveButtonActive, fontSize: rs(26) }]}>{Copy.home.welcomeTitle}</Text>
      <Text style={[styles.welcomeText, { color: theme.text }]}>{Copy.home.welcomeText}</Text>
      <Pressable
        style={[styles.ctaButton, { backgroundColor: theme.saveButtonActive }]}
        onPress={handleCreatePress}
        testID="button-create-first"
      >
        <Feather name="plus" size={20} color={theme.buttonText} style={{ marginRight: Spacing.sm }} />
        <Text style={[styles.ctaButtonText, { color: theme.buttonText }]}>{Copy.home.createReminderButton}</Text>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: LocalReminder }) => (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight },
      ]}
      onPress={() => !isSelecting && handleEditPress(item)}
      testID={`card-reminder-${item.id}`}
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
                borderColor: selectedIds.has(item.id) ? theme.saveButtonActive : theme.border,
                backgroundColor: selectedIds.has(item.id) ? theme.saveButtonActive : "transparent",
              },
            ]}
          >
            {selectedIds.has(item.id) ? (
              <Feather name="check" size={14} color={theme.buttonText} />
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
        {showNotificationWarning ? (
          <Text style={[styles.notificationsDisabledText, { color: theme.error }]}>
            {Copy.home.notificationsDisabled}
          </Text>
        ) : null}
      </View>

      <View style={styles.cardActions}>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggle(item)}
          trackColor={{ false: theme.borderLight, true: theme.saveButtonActive + "60" }}
          thumbColor={item.isActive ? theme.saveButtonActive : theme.textTertiary}
          style={styles.switch}
        />
      </View>
    </Pressable>
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
              setIsSelecting(true);
              setSelectedIds(new Set(reminders.map((r) => r.id)));
            }
          }}
          style={styles.toolbarButton}
        >
          <ThemedText type="body" style={{ color: "#2C2118" }}>
            {isSelecting ? (allSelected ? Copy.remindersScreen.deselectAll : Copy.remindersScreen.selectAll) : Copy.remindersScreen.selectAll}
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <AppHeader title={Copy.navigation.reminders} />
      
      {showNotificationWarning ? (
        <View style={[styles.notificationBanner, { backgroundColor: theme.error + "10", borderColor: theme.error + "30" }]}>
          <View style={styles.notificationBannerHeader}>
            <Text style={[styles.notificationBannerTitle, { color: theme.error }]}>
              {Copy.home.notificationBannerTitle}
            </Text>
            <Pressable 
              onPress={() => setBannerDismissed(true)}
              style={styles.notificationBannerClose}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
          <Text style={[styles.notificationBannerText, { color: theme.textSecondary }]}>
            {Copy.home.notificationBannerText}
          </Text>
          <Pressable 
            onPress={openSettings}
            style={[styles.notificationBannerButton, { backgroundColor: theme.error }]}
          >
            <Text style={styles.notificationBannerButtonText}>
              {Copy.home.notificationBannerButton}
            </Text>
          </Pressable>
        </View>
      ) : null}
      
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
          <RefreshControl refreshing={!isLoaded} onRefresh={refresh} />
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
    fontWeight: "600",
  },
  notificationBannerClose: {
    padding: 4,
  },
  notificationBannerText: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  notificationBannerButton: {
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  notificationBannerButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  notificationsDisabledText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: Spacing.xs,
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
});
