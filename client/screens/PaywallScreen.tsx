import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { PurchasesPackage, PACKAGE_TYPE } from "react-native-purchases";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { PlanSelector } from "@/components/PlanSelector";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";

const CORAL = "#E8614F";
const TEAL = "#3FA0B0";
const TERRACOTTA = "#C03A2B";
const EMERALD = "#2E7D52";
const MUTED_BROWN = "#6B5744";
const PRO_CARD_BG = "#EBF6F8";
const SUPPORTER_CARD_BG = "#E3F4EC";
const PRO_CARD_BG_DARK = "#1A2E33";
const SUPPORTER_CARD_BG_DARK = "#1A2E28";
const WARM_LINEN = "#F5F0E8";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const {
    isSubscribed,
    offering,
    isLoading,
    purchasePackage,
    restorePurchases,
  } = useSubscription();

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Independent selection per card: "yearly" | "monthly"
  const [proSelection, setProSelection] = useState<"yearly" | "monthly">("yearly");
  const [supporterSelection, setSupporterSelection] = useState<"yearly" | "monthly">("yearly");

  const monthlyPackage = offering?.availablePackages.find(
    (p) => p.packageType === PACKAGE_TYPE.MONTHLY
  );
  const yearlyPackage = offering?.availablePackages.find(
    (p) => p.packageType === PACKAGE_TYPE.ANNUAL
  );

  const handlePurchase = async (pkg: PurchasesPackage | undefined, planKey: string) => {
    if (!pkg) {
      setMessage({ text: Copy.subscription.storeUnavailable, type: "error" });
      return;
    }
    setPurchasing(planKey);
    setMessage(null);
    const result = await purchasePackage(pkg);
    setPurchasing(null);
    if (result.success) {
      setMessage({ text: Copy.subscription.purchaseSuccess, type: "success" });
    } else if (result.error !== "cancelled") {
      setMessage({ text: Copy.subscription.purchaseError, type: "error" });
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setMessage(null);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.success) {
      setMessage({ text: Copy.subscription.restoreSuccess, type: "success" });
    } else {
      setMessage({ text: Copy.subscription.restoreNoActive, type: "error" });
    }
  };

  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centeredContent, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <Feather name="smartphone" size={48} color={theme.primary} />
          <ThemedText type="h2" style={styles.centeredTitle}>Orbia Pro</ThemedText>
          <ThemedText type="body" style={[styles.centeredText, { color: theme.textSecondary }]}>
            {Copy.subscription.webNotice}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isSubscribed) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centeredContent, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <View style={[styles.checkCircle, { backgroundColor: theme.success + "20" }]}>
            <Feather name="check" size={32} color={theme.success} />
          </View>
          <ThemedText type="h2" style={styles.centeredTitle}>You're a Pro!</ThemedText>
          <ThemedText type="body" style={[styles.centeredText, { color: theme.textSecondary }]}>
            {Copy.subscription.subscribedMessage}
          </ThemedText>
          <Pressable
            style={[styles.manageButton, { borderColor: theme.border, borderWidth: 1 }]}
            onPress={() => {
              try {
                if (Platform.OS !== "web") Linking.openSettings();
              } catch {}
            }}
            testID="button-manage-subscription"
          >
            <ThemedText type="body" style={{ color: theme.text }}>
              {Copy.paywall.manageSubscription}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? theme.backgroundRoot : WARM_LINEN }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {message ? (
          <View style={[styles.messageBanner, { backgroundColor: message.type === "success" ? theme.success + "20" : theme.error + "20" }]}>
            <ThemedText type="small" style={{ color: message.type === "success" ? theme.success : theme.error, textAlign: "center" }}>
              {message.text}
            </ThemedText>
          </View>
        ) : null}

        {/* Current Plan */}
        <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {Copy.subscription.currentPlanLabel}
        </ThemedText>

        <View style={[styles.currentPlanCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]}>
          <View style={styles.currentPlanHeader}>
            <ThemedText type="h3" style={{ fontFamily: FontFamily.serifBold }}>
              {Copy.subscription.orbiaLiteTitle}
            </ThemedText>
            <ThemedText type="caption" style={[styles.planSubtitleSmall, { color: theme.textSecondary }]}>
              {Copy.subscription.orbiaLiteSubtitle}
            </ThemedText>
          </View>
          {Copy.subscription.orbiaLiteFeatures.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Feather name="check" size={14} color={theme.success} style={{ marginRight: Spacing.sm }} />
              <ThemedText type="small" style={{ color: theme.text }}>{f}</ThemedText>
            </View>
          ))}
        </View>

        {/* Choose Plan */}
        <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: Spacing["2xl"] }]}>
          {Copy.subscription.choosePlanLabel}
        </ThemedText>

        {/* Orbia Pro Card */}
        <View style={[styles.planCard, {
          backgroundColor: isDark ? PRO_CARD_BG_DARK : PRO_CARD_BG,
          borderColor: "rgba(60,40,20,0.1)",
        }]}>
          {/* Decorative circle */}
          <View style={[styles.decorCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(60,40,20,0.04)" }]} />

          <ThemedText type="h3" style={[styles.cardTitle, { color: isDark ? "#E07B5A" : TERRACOTTA, fontSize: 30 }]}>
            {Copy.subscription.proCardTitle}
          </ThemedText>
          <ThemedText type="caption" style={[styles.cardSubtitle, { color: isDark ? "#C4B8A8" : MUTED_BROWN }]}>
            {Copy.subscription.proCardSubtitle}
          </ThemedText>

          {Copy.subscription.orbiaProFeatures.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Feather name="check" size={14} color={isDark ? "#E07B5A" : TERRACOTTA} style={{ marginRight: Spacing.sm }} />
              <ThemedText type="small" style={{ color: theme.text }}>{f}</ThemedText>
            </View>
          ))}

          <ThemedText type="small" style={[styles.tagline, { color: isDark ? theme.textSecondary : MUTED_BROWN }]}>
            {Copy.subscription.proCardTagline}
          </ThemedText>

          {/* Plan Accordion */}
          <View style={{ marginTop: Spacing.sm }}>
            <PlanSelector
              isSelected={proSelection === "yearly"}
              period={Copy.subscription.yearlyPeriod}
              subLine={yearlyPackage ? `${Copy.subscription.yearlySubLine} ${yearlyPackage.product.priceString}` : "12 Months @ £12"}
              price={yearlyPackage ? yearlyPackage.product.priceString : "£12"}
              isBestValue
              loading={purchasing === "pro-yearly"}
              onSelect={() => setProSelection("yearly")}
              onUpgrade={() => handlePurchase(yearlyPackage, "pro-yearly")}
              testID="button-pro-yearly"
              theme={theme}
              isDark={isDark}
            />
            <View style={{ height: Spacing.sm }} />
            <PlanSelector
              isSelected={proSelection === "monthly"}
              period={Copy.subscription.monthlyPeriod}
              subLine={monthlyPackage ? `${monthlyPackage.product.priceString}/${Copy.subscription.monthlySubLine}` : "£2/month"}
              price={monthlyPackage ? monthlyPackage.product.priceString : "£2"}
              loading={purchasing === "pro-monthly"}
              onSelect={() => setProSelection("monthly")}
              onUpgrade={() => handlePurchase(monthlyPackage, "pro-monthly")}
              testID="button-pro-monthly"
              theme={theme}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Orbia Supporter Card */}
        <View style={[styles.planCard, {
          backgroundColor: isDark ? SUPPORTER_CARD_BG_DARK : SUPPORTER_CARD_BG,
          borderColor: "rgba(60,40,20,0.1)",
          marginTop: Spacing.md,
        }]}>
          {/* Decorative circle */}
          <View style={[styles.decorCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(60,40,20,0.04)" }]} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
            <ThemedText type="h3" style={[styles.cardTitle, { color: isDark ? "#68D391" : EMERALD, fontSize: 30 }]}>
              {Copy.subscription.supporterCardTitle}
            </ThemedText>
            <Feather name="star" size={18} color={isDark ? "#68D391" : EMERALD} />
          </View>
          <ThemedText type="caption" style={[styles.cardSubtitle, { color: isDark ? "#C4B8A8" : MUTED_BROWN }]}>
            {Copy.subscription.supporterCardSubtitle}
          </ThemedText>

          {Copy.subscription.orbiaSupporterFeatures.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Feather name="check" size={14} color={isDark ? "#68D391" : EMERALD} style={{ marginRight: Spacing.sm }} />
              <ThemedText type="small" style={{ color: theme.text }}>{f}</ThemedText>
            </View>
          ))}

          <ThemedText type="small" style={[styles.tagline, { color: isDark ? theme.textSecondary : MUTED_BROWN }]}>
            {Copy.subscription.supporterCardBody}
          </ThemedText>

          <Pressable>
            <ThemedText type="small" style={{ color: CORAL, fontFamily: FontFamily.sansSemiBold, marginBottom: Spacing.md }}>
              {Copy.subscription.supporterCardLink} →
            </ThemedText>
          </Pressable>

          {/* Plan Accordion */}
          <View style={{ marginTop: Spacing.sm }}>
            <PlanSelector
              isSelected={supporterSelection === "yearly"}
              period={Copy.subscription.yearlyPeriod}
              subLine={yearlyPackage ? `${Copy.subscription.yearlySubLine} ${yearlyPackage.product.priceString}` : "12 Months @ £12"}
              price={yearlyPackage ? yearlyPackage.product.priceString : "£12"}
              isBestValue
              loading={purchasing === "supporter-yearly"}
              onSelect={() => setSupporterSelection("yearly")}
              onUpgrade={() => handlePurchase(yearlyPackage, "supporter-yearly")}
              testID="button-supporter-yearly"
              theme={theme}
              isDark={isDark}
            />
            <View style={{ height: Spacing.sm }} />
            <PlanSelector
              isSelected={supporterSelection === "monthly"}
              period={Copy.subscription.monthlyPeriod}
              subLine={monthlyPackage ? `${monthlyPackage.product.priceString}/${Copy.subscription.monthlySubLine}` : "£3/month"}
              price={monthlyPackage ? monthlyPackage.product.priceString : "£3"}
              loading={purchasing === "supporter-monthly"}
              onSelect={() => setSupporterSelection("monthly")}
              onUpgrade={() => handlePurchase(monthlyPackage, "supporter-monthly")}
              testID="button-supporter-monthly"
              theme={theme}
              isDark={isDark}
            />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : null}

        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreButton}
          testID="button-restore"
        >
          {restoring ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
              {Copy.subscription.restoreButton}
            </ThemedText>
          )}
        </Pressable>

        <ThemedText type="caption" style={[styles.terms, { color: theme.textTertiary }]}>
          {Copy.subscription.termsNotice}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  centeredTitle: { marginTop: Spacing.xl, textAlign: "center" },
  centeredText: { marginTop: Spacing.md, textAlign: "center" },
  checkCircle: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: "center", alignItems: "center",
  },
  manageButton: {
    marginTop: Spacing["2xl"],
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  messageBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  currentPlanCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  currentPlanHeader: { marginBottom: Spacing.md },
  planSubtitleSmall: { marginTop: 2, fontFamily: FontFamily.sansMedium },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  planCard: {
    padding: 25,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  decorCircle: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cardTitle: {
    fontFamily: FontFamily.serifBold,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: FontFamily.sansBold,
    letterSpacing: 1,
    fontSize: 11,
    marginBottom: Spacing.md,
  },
  tagline: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  selectedPlanCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    padding: 22,
    position: "relative",
  },
  selectedPlanHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  bestValuePill: {
    position: "absolute",
    top: -10,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  upgradePill: {
    width: "100%",
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  collapsedPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 22,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  loadingOverlay: { alignItems: "center", paddingVertical: Spacing.md },
  restoreButton: { paddingVertical: Spacing.lg, alignItems: "center" },
  terms: { textAlign: "center", paddingHorizontal: Spacing.lg, lineHeight: 18 },
});
