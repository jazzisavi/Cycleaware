import React, { useState } from "react";
import { StyleSheet, View, Image, Pressable, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { TextInput } from "@/components/TextInput";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { useSubscription } from "@/contexts/SubscriptionContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const DEV_OVERRIDE_KEY = "@orbia/dev_trial_override";
const TRIAL_START_KEY = "@orbia/trial_start_date";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { rs } = useResponsive();
  const navigation = useNavigation<NavigationProp>();
  const { isSubscribed, currentPlan, daysLeft, isInTrial, trialExpired, refreshStatus } = useSubscription();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [devPanelVisible, setDevPanelVisible] = useState(false);
  const [devDaysLeft, setDevDaysLeft] = useState(daysLeft);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const handleVersionLongPress = () => {
    if (!__DEV__) return;
    setDevDaysLeft(daysLeft);
    setDevPanelVisible(true);
  };

  const handleSetDevDays = async (days: number) => {
    const clamped = Math.max(0, Math.min(30, days));
    setDevDaysLeft(clamped);
    await AsyncStorage.setItem(DEV_OVERRIDE_KEY, String(clamped));
  };

  const handleClearDevOverride = async () => {
    await AsyncStorage.removeItem(DEV_OVERRIDE_KEY);
    setDevPanelVisible(false);
  };

  const handleResetTrial = async () => {
    await AsyncStorage.removeItem(TRIAL_START_KEY);
    await AsyncStorage.removeItem(DEV_OVERRIDE_KEY);
    setDevPanelVisible(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Save logic will be implemented in Phase 2
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.backgroundDefault }]}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { fontSize: rs(28) }]}>
          {Copy.profile.title}
        </ThemedText>
      </View>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.md,
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.avatarSection}>
          <Image
            source={require("../../assets/images/default-avatar.png")}
            style={styles.avatar}
          />
          <ThemedText type="link" style={styles.changePhoto}>
            {Copy.profile.changePhoto}
          </ThemedText>
        </View>

        <SectionHeader title={Copy.profile.personalInfoSection} />
        <TextInput
          label={Copy.profile.displayNameLabel}
          placeholder={Copy.profile.displayNamePlaceholder}
          value={displayName}
          onChangeText={setDisplayName}
          testID="input-display-name"
        />
        <TextInput
          label={Copy.profile.emailLabel}
          placeholder={Copy.profile.emailPlaceholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          testID="input-email"
        />

        <SectionHeader title={Copy.profile.subscriptionSection} />
        <View style={[styles.subscriptionCard, { backgroundColor: theme.backgroundDefault, borderColor: isSubscribed ? theme.success : theme.primary }]}>
          <View style={styles.subscriptionRow}>
            <ThemedText type="h3">
              {isSubscribed ? `GoFlo Pro (${currentPlan === "yearly" ? Copy.paywall.yearlyLabel : Copy.paywall.monthlyLabel})` : Copy.profile.freeTrialTitle}
            </ThemedText>
            <View style={[styles.badge, { backgroundColor: theme.success + "20" }]}>
              <ThemedText type="caption" style={{ color: theme.success }}>
                {Copy.common.active}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            {isSubscribed ? Copy.paywall.subscribedMessage : Copy.profile.trialEndsMessage}
          </ThemedText>
          <Button
            variant="outline"
            style={{ marginTop: Spacing.lg }}
            onPress={() => navigation.navigate("Paywall")}
            testID="button-upgrade"
          >
            {isSubscribed ? Copy.paywall.manageSubscription : Copy.profile.viewPlans}
          </Button>
        </View>

        <SectionHeader title="General" />
        <Pressable
          style={[styles.reviewOnboardingRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]}
          onPress={() => navigation.navigate("Onboarding")}
          testID="button-review-onboarding"
        >
          <View style={[styles.reviewOnboardingIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="book-open" size={18} color={theme.text} />
          </View>
          <ThemedText type="body" style={{ flex: 1 }}>Review onboarding</ThemedText>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.saveSection}>
          <Button onPress={handleSave} loading={isLoading} testID="button-save">
            {Copy.profile.saveChanges}
          </Button>
        </View>

        <Pressable
          onLongPress={handleVersionLongPress}
          style={styles.versionRow}
          testID="text-version-dev"
          delayLongPress={800}
        >
          <ThemedText type="small" style={{ color: theme.textTertiary, textAlign: "center" }}>
            v{appVersion}
          </ThemedText>
        </Pressable>

        {__DEV__ ? (
          <Modal
            visible={devPanelVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setDevPanelVisible(false)}
          >
            <Pressable style={styles.devModalOverlay} onPress={() => setDevPanelVisible(false)}>
              <Pressable style={[styles.devModalSheet, { backgroundColor: theme.backgroundDefault }]} onPress={() => {}}>
                <View style={styles.devModalHandle} />
                <ThemedText type="h4" style={{ color: "#E8614F", marginBottom: Spacing.md }}>Dev Trial Panel</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
                  Trial active: {isInTrial ? "yes" : "no"} | Expired: {trialExpired ? "yes" : "no"} | Days left: {daysLeft}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
                  Override days left: {devDaysLeft}
                </ThemedText>
                <View style={styles.devStepperRow}>
                  <Pressable
                    style={[styles.devStepBtn, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => handleSetDevDays(devDaysLeft - 1)}
                  >
                    <ThemedText type="body">-</ThemedText>
                  </Pressable>
                  <ThemedText type="body" style={{ marginHorizontal: Spacing.lg }}>{devDaysLeft}</ThemedText>
                  <Pressable
                    style={[styles.devStepBtn, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => handleSetDevDays(devDaysLeft + 1)}
                  >
                    <ThemedText type="body">+</ThemedText>
                  </Pressable>
                </View>
                <Pressable
                  style={[styles.devActionBtn, { backgroundColor: theme.backgroundSecondary, marginTop: Spacing.md }]}
                  onPress={handleClearDevOverride}
                >
                  <ThemedText type="small" style={{ color: theme.text }}>Clear override</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.devActionBtn, { backgroundColor: "#E8614F" + "20", marginTop: Spacing.sm }]}
                  onPress={handleResetTrial}
                >
                  <ThemedText type="small" style={{ color: "#E8614F" }}>Reset trial start</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.devActionBtn, { marginTop: Spacing.sm }]}
                  onPress={() => setDevPanelVisible(false)}
                >
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Close</ThemedText>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}
      </KeyboardAwareScrollViewCompat>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FontFamily.serifBold,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.md,
  },
  changePhoto: {
    fontWeight: "500",
  },
  subscriptionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  subscriptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  reviewOnboardingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  reviewOnboardingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  saveSection: {
    marginTop: Spacing["3xl"],
  },
  versionRow: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  devPanel: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  devStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  devStepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  devActionBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  devModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  devModalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  devModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CCCCCC",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
});
