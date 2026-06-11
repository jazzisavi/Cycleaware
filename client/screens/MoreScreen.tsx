import React from "react";
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

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { rs } = useResponsive();
  const navigation = useNavigation<NavigationProp>();
  const { isSubscribed, currentPlan } = useSubscription();

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const platformInfo = `${Platform.OS} ${Platform.Version}`;

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
              {isSubscribed ? "GoFlo Pro" : Copy.more.freeTrialTitle}
            </ThemedText>
            <View style={[styles.badge, { backgroundColor: theme.success + "20" }]}>
              <ThemedText type="caption" style={[styles.badgeText, { color: theme.success }]}>
                {isSubscribed ? (currentPlan === "yearly" ? Copy.paywall.yearlyLabel : Copy.paywall.monthlyLabel) : Copy.more.activeBadge}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {isSubscribed ? Copy.paywall.subscribedMessage : Copy.more.freeTrialSubtitle}
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
  devSection: {
    marginTop: Spacing["3xl"],
  },
  versionText: {
    textAlign: "center" as const,
    marginTop: Spacing.xl,
  },
});
