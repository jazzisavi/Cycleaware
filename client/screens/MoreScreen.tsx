import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import Constants from "expo-constants";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { SettingsRow } from "@/components/SettingsRow";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { useSubscription } from "@/contexts/SubscriptionContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DEV_OVERRIDE_KEY = "@orbia/dev_trial_override";
const TRIAL_START_KEY = "@orbia/trial_start_date";
const TRIAL_REMINDER_STATE_KEY = "@orbia/trial_reminder_state";
const TRIAL_BAR_DISMISSED_KEY = "@orbia/trial_bar_dismissed";
const TRIAL_DURATION_DAYS = 30;

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { rs } = useResponsive();
  const navigation = useNavigation<NavigationProp>();
  const { isSubscribed, currentPlan, daysLeft, refreshTrial } = useSubscription();

  const [trialDays, setTrialDays] = useState(daysLeft);

  useEffect(() => {
    setTrialDays(daysLeft);
  }, [daysLeft]);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const platformInfo = `${Platform.OS} ${Platform.Version}`;

  const handleSetTrialDays = async (days: number) => {
    const clamped = Math.max(-7, Math.min(TRIAL_DURATION_DAYS, days));
    setTrialDays(clamped);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const existingStart = await AsyncStorage.getItem(TRIAL_START_KEY);
    if (!existingStart) {
      await AsyncStorage.setItem(TRIAL_START_KEY, new Date().toISOString());
    }
    await AsyncStorage.setItem(DEV_OVERRIDE_KEY, String(clamped));
    // Reset trial reminder/bar dismissal state so testers always see the
    // trial surfaces fresh after changing the day count.
    await AsyncStorage.removeItem(TRIAL_REMINDER_STATE_KEY);
    await AsyncStorage.removeItem(TRIAL_BAR_DISMISSED_KEY);
    await refreshTrial();
  };

  const handleClearTrialOverride = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.removeItem(DEV_OVERRIDE_KEY);
    await refreshTrial();
  };

  const handleResetTrial = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem(TRIAL_START_KEY, new Date().toISOString());
    await AsyncStorage.removeItem(DEV_OVERRIDE_KEY);
    await AsyncStorage.removeItem(TRIAL_REMINDER_STATE_KEY);
    await AsyncStorage.removeItem(TRIAL_BAR_DISMISSED_KEY);
    await refreshTrial();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleSupportEmail = (type: "issue" | "feature") => {
    const subject =
      type === "issue" ? Copy.more.issueEmailSubject : Copy.more.featureEmailSubject;
    const body =
      type === "issue"
        ? Copy.more.issueEmailBody(appVersion, platformInfo)
        : Copy.more.featureEmailBody(appVersion, platformInfo);

    const mailto = `mailto:${Copy.more.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailto);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable
          onPress={handleClose}
          style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
          testID="button-close-account"
        >
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { fontSize: rs(20) }]}>{Copy.more.title}</ThemedText>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <Pressable
          onPress={() => navigation.navigate("Paywall")}
          style={[styles.subscriptionCard, { backgroundColor: theme.backgroundDefault }]}
          testID="card-subscription"
        >
          <View style={styles.subscriptionHeader}>
            <ThemedText type="h3">
              {isSubscribed ? Copy.subscription.orbiaProTitle : Copy.more.freeTrialTitle}
            </ThemedText>
            <View style={[styles.badge, { backgroundColor: theme.success + "20" }]}>
              <ThemedText type="caption" style={[styles.badgeText, { color: theme.success }]}>
                {isSubscribed ? (currentPlan === "yearly" ? Copy.paywall.yearlyLabel : Copy.paywall.monthlyLabel) : Copy.more.activeBadge}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {isSubscribed ? Copy.subscription.subscribedMessage : Copy.more.freeTrialSubtitle}
          </ThemedText>
        </Pressable>

        <SettingsRow
          icon="user"
          iconColor={theme.warning}
          title={Copy.more.profileTitle}
          subtitle={Copy.more.profileSubtitle}
          onPress={() => navigation.navigate("Profile")}
          testID="row-profile"
        />

        <SectionHeader title={Copy.more.settingsSection} />

        <SettingsRow
          icon="clock"
          iconColor={theme.info}
          title={Copy.more.historyTitle}
          subtitle={Copy.more.historySubtitle}
          onPress={() => navigation.navigate("History")}
          testID="row-history"
        />

        <SectionHeader title={Copy.more.supportSection} />

        <SettingsRow
          icon="alert-circle"
          iconColor={theme.error}
          title={Copy.more.reportIssueTitle}
          subtitle={Copy.more.reportIssueSubtitle}
          onPress={() => handleSupportEmail("issue")}
          testID="row-report-issue"
        />

        <SettingsRow
          icon="message-circle"
          iconColor={theme.info}
          title={Copy.more.requestFeatureTitle}
          subtitle={Copy.more.requestFeatureSubtitle}
          onPress={() => handleSupportEmail("feature")}
          testID="row-request-feature"
        />

        <SectionHeader title={Copy.trialControl.sectionTitle} />

        <View style={[styles.trialCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]}>
          <ThemedText type="body">{Copy.trialControl.cardTitle}</ThemedText>
          <ThemedText type="small" style={[styles.trialHelper, { color: theme.textSecondary }]}>
            {Copy.trialControl.helperText}
          </ThemedText>

          <View style={styles.trialStepperRow}>
            <Pressable
              accessibilityLabel={Copy.trialControl.decrease}
              onPress={() => handleSetTrialDays(trialDays - 1)}
              disabled={trialDays <= -7}
              style={[
                styles.stepButton,
                { backgroundColor: theme.backgroundSecondary, opacity: trialDays <= -7 ? 0.4 : 1 },
              ]}
              testID="button-trial-decrease"
            >
              <Feather name="minus" size={20} color={theme.text} />
            </Pressable>

            <View style={styles.trialValueContainer}>
              <ThemedText type="h3" testID="text-trial-days">
                {Copy.trialControl.daysValue(trialDays)}
              </ThemedText>
            </View>

            <Pressable
              accessibilityLabel={Copy.trialControl.increase}
              onPress={() => handleSetTrialDays(trialDays + 1)}
              disabled={trialDays >= TRIAL_DURATION_DAYS}
              style={[
                styles.stepButton,
                { backgroundColor: theme.backgroundSecondary, opacity: trialDays >= TRIAL_DURATION_DAYS ? 0.4 : 1 },
              ]}
              testID="button-trial-increase"
            >
              <Feather name="plus" size={20} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <SettingsRow
          icon="rotate-ccw"
          iconColor={theme.info}
          title={Copy.trialControl.clearOverrideTitle}
          subtitle={Copy.trialControl.clearOverrideSubtitle}
          onPress={handleClearTrialOverride}
          showChevron={false}
          testID="row-clear-trial-override"
        />

        <SettingsRow
          icon="refresh-cw"
          iconColor={theme.success}
          title={Copy.trialControl.resetTrialTitle}
          subtitle={Copy.trialControl.resetTrialSubtitle}
          onPress={handleResetTrial}
          showChevron={false}
          testID="row-reset-trial"
        />

        <View style={styles.devSection}>
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
        </View>

        <ThemedText
          type="small"
          style={[styles.versionText, { color: theme.textTertiary }]}
          testID="text-app-version"
        >
          v{appVersion}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 20,
    lineHeight: 28,
    textAlign: "center",
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  subscriptionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
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
  badgeText: {
    fontWeight: "600",
  },
  trialCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  trialHelper: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  trialStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  trialValueContainer: {
    flex: 1,
    alignItems: "center",
  },
  devSection: {
    marginTop: Spacing["3xl"],
  },
  versionText: {
    textAlign: "center" as const,
    marginTop: Spacing.xl,
  },
});
