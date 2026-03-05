import React, { useState } from "react";
import { StyleSheet, View, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { TextInput } from "@/components/TextInput";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { useSubscription } from "@/contexts/SubscriptionContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { isSubscribed, currentPlan } = useSubscription();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        <ThemedText style={styles.headerTitle}>
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

        <View style={styles.saveSection}>
          <Button onPress={handleSave} loading={isLoading} testID="button-save">
            {Copy.profile.saveChanges}
          </Button>
        </View>
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
  saveSection: {
    marginTop: Spacing["3xl"],
  },
});
