import React from "react";
import { FlatList, StyleSheet, View, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NotificationHistory } from "@shared/schema";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const { data: history = [], isLoading, refetch } = useQuery<NotificationHistory[]>({
    queryKey: ["/api/notification-history"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return theme.success;
      case "snoozed":
        return theme.warning;
      case "missed":
        return theme.textTertiary;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusIcon = (status: string): keyof typeof Feather.glyphMap => {
    switch (status) {
      case "completed":
        return "check-circle";
      case "snoozed":
        return "pause-circle";
      case "missed":
        return "x-circle";
      default:
        return "circle";
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }: { item: NotificationHistory }) => (
    <View
      style={[
        styles.historyItem,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight },
      ]}
    >
      <View style={styles.iconContainer}>
        <Feather
          name={getStatusIcon(item.status)}
          size={24}
          color={getStatusColor(item.status)}
        />
      </View>
      <View style={styles.content}>
        <ThemedText type="body" numberOfLines={1}>
          {item.title}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {formatTime(item.scheduledAt)} · {formatDate(item.scheduledAt)}
        </ThemedText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
        <ThemedText type="caption" style={{ color: getStatusColor(item.status), textTransform: "capitalize" }}>
          {item.status}
        </ThemedText>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-history.png")}
      title="No History Yet"
      description="Your notification history will appear here once you start receiving reminders."
    />
  );

  const renderSectionHeader = (date: string) => (
    <ThemedText type="small" style={[styles.sectionHeader, { color: theme.textSecondary }]}>
      {date}
    </ThemedText>
  );

  // Group history by date
  const groupedHistory = history.reduce((acc, item) => {
    const date = formatDate(item.scheduledAt);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, NotificationHistory[]>);

  const sections = Object.entries(groupedHistory).map(([date, items]) => ({
    date,
    items,
  }));

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing["2xl"],
            flex: history.length === 0 ? 1 : undefined,
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
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
});
