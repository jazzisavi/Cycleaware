import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { SettingsRow } from "@/components/SettingsRow";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { useSubscription } from "@/contexts/SubscriptionContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { isSubscribed, currentPlan } = useSubscription();

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
        <SectionHeader title={Copy.more.settingsSection} />
        <SettingsRow
          icon="clock"
          iconColor={theme.warning}
          title={Copy.more.historyTitle}
          subtitle={Copy.more.historySubtitle}
          onPress={() => navigation.navigate("History")}
          testID="row-history"
        />
        <SettingsRow
          icon="pause-circle"
          iconColor={theme.info}
          title={Copy.more.snoozeTitle}
          subtitle={Copy.more.snoozeSubtitle}
          onPress={() => navigation.navigate("SnoozeSettings")}
          testID="row-snooze"
        />
        <SettingsRow
          icon="volume-2"
          iconColor={theme.success}
          title={Copy.more.alarmSoundsTitle}
          subtitle={Copy.more.alarmSoundsSubtitle}
          onPress={() => navigation.navigate("AlarmSounds")}
          testID="row-sounds"
        />

        <SectionHeader title={Copy.more.accountSection} />
        <Pressable
          onPress={() => navigation.navigate("Paywall")}
          style={[styles.subscriptionCard, { backgroundColor: theme.backgroundDefault, borderColor: isSubscribed ? theme.success : theme.borderLight }]}
          testID="card-subscription"
        >
          <View style={styles.subscriptionHeader}>
            <ThemedText type="h4">
              {isSubscribed ? `GoFlo Pro` : Copy.more.freeTrialTitle}
            </ThemedText>
            <View style={[styles.badge, { backgroundColor: theme.success + "20" }]}>
              <ThemedText type="caption" style={{ color: theme.success }}>
                {isSubscribed ? (currentPlan === "yearly" ? Copy.paywall.yearlyLabel : Copy.paywall.monthlyLabel) : Copy.common.active}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {isSubscribed ? Copy.paywall.subscribedMessage : Copy.more.trialRemaining(30)}
          </ThemedText>
        </Pressable>

        <SettingsRow
          icon="user"
          iconColor={theme.primary}
          title={Copy.more.profileTitle}
          subtitle={Copy.more.profileSubtitle}
          onPress={() => navigation.navigate("Profile")}
          testID="row-profile"
        />
        <SettingsRow
          icon="mail"
          iconColor={theme.textSecondary}
          title={Copy.more.emailTitle}
          value={Copy.more.emailNotSet}
          onPress={() => navigation.navigate("Profile")}
          testID="row-email"
        />
        <SettingsRow
          icon="log-out"
          iconColor={theme.error}
          title={Copy.more.signOutTitle}
          showChevron={false}
          onPress={() => {}}
          testID="row-signout"
        />

        <SectionHeader title={Copy.more.aboutSection} />
        <SettingsRow
          icon="info"
          title={Copy.more.versionTitle}
          value="1.0.13"
          showChevron={false}
          testID="row-version"
        />
        <SettingsRow
          icon="refresh-cw"
          iconColor={theme.warning}
          title="Reset Onboarding"
          subtitle="See the onboarding screens again"
          onPress={async () => {
            await AsyncStorage.removeItem("@goflo/onboarding_complete");
            await AsyncStorage.removeItem("@goflo/user_name");
            reloadAppAsync();
          }}
          testID="row-reset-onboarding"
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
