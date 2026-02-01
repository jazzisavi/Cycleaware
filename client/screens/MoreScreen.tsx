import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { SettingsRow } from "@/components/SettingsRow";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <SectionHeader title="Settings" />
        <SettingsRow
          icon="clock"
          iconColor={theme.warning}
          title="History"
          subtitle="View past notifications"
          onPress={() => navigation.navigate("History")}
          testID="row-history"
        />
        <SettingsRow
          icon="pause-circle"
          iconColor={theme.info}
          title="Snooze Settings"
          subtitle="Configure snooze duration"
          onPress={() => navigation.navigate("SnoozeSettings")}
          testID="row-snooze"
        />
        <SettingsRow
          icon="volume-2"
          iconColor={theme.success}
          title="Alarm Sounds"
          subtitle="Choose notification sound"
          onPress={() => navigation.navigate("AlarmSounds")}
          testID="row-sounds"
        />

        <SectionHeader title="Account" />
        <View style={[styles.subscriptionCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]}>
          <View style={styles.subscriptionHeader}>
            <ThemedText type="h4">Free Trial</ThemedText>
            <View style={[styles.badge, { backgroundColor: theme.success + "20" }]}>
              <ThemedText type="caption" style={{ color: theme.success }}>
                Active
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            30 days remaining in your trial period
          </ThemedText>
        </View>

        <SettingsRow
          icon="user"
          iconColor={theme.primary}
          title="Profile"
          subtitle="Manage your account"
          onPress={() => navigation.navigate("Profile")}
          testID="row-profile"
        />
        <SettingsRow
          icon="mail"
          iconColor={theme.textSecondary}
          title="Email"
          value="Not set"
          onPress={() => navigation.navigate("Profile")}
          testID="row-email"
        />
        <SettingsRow
          icon="log-out"
          iconColor={theme.error}
          title="Sign Out"
          showChevron={false}
          onPress={() => {}}
          testID="row-signout"
        />

        <SectionHeader title="About" />
        <SettingsRow
          icon="info"
          title="Version"
          value="1.0.0"
          showChevron={false}
          testID="row-version"
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  screenTitle: {
    marginBottom: Spacing.lg,
  },
  subscriptionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  subscriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
});
