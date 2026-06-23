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
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";

const CORAL = "#E8614F";
const TEAL_BG = "#EBF6F8";
const TEAL_BG_DARK = "#1A3D44";

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
            Thank you for supporting Orbia. You have access to all features.
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

  const cardBg = isDark ? TEAL_BG_DARK : TEAL_BG;

  return (
    <ThemedView style={styles.container}>
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

        <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: Spacing["2xl"] }]}>
          {Copy.subscription.choosePlanLabel}
        </ThemedText>

        <View style={[styles.planCard, { backgroundColor: cardBg }]}>
          <ThemedText type="h3" style={[styles.planTitle, { color: isDark ? "#B8E4EC" : "#2A6E7A" }]}>
            {Copy.subscription.orbiaProTitle}
          </ThemedText>
          <ThemedText type="caption" style={[styles.planSubtitleCaps, { color: isDark ? "#7BC9D5" : "#3A8A9A" }]}>
            {Copy.subscription.orbiaProSubtitle}
          </ThemedText>
          {Copy.subscription.orbiaProFeatures.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Feather name="check" size={14} color={CORAL} style={{ marginRight: Spacing.sm }} />
              <ThemedText type="small" style={{ color: theme.text }}>{f}</ThemedText>
            </View>
          ))}
          <ThemedText type="small" style={[styles.tagline, { color: theme.textSecondary }]}>
            {Copy.subscription.orbiaProTagline}
          </ThemedText>

          <View style={[styles.pricingRows, { backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.45)" }]}>
            <PricingRow
              label={Copy.subscription.bestValue}
              period="Yearly"
              priceDisplay={yearlyPackage ? yearlyPackage.product.priceString : "£12"}
              subText={yearlyPackage ? Copy.subscription.yearlyPrice(yearlyPackage.product.priceString) : "12 Months @ £12"}
              loading={purchasing === "pro-yearly"}
              onUpgrade={() => handlePurchase(yearlyPackage, "pro-yearly")}
              testID="button-pro-yearly"
            />
            <View style={[styles.pricingDivider, { backgroundColor: isDark ? "#2A5560" : "#C8E8EC" }]} />
            <PricingRow
              period="Monthly"
              priceDisplay={monthlyPackage ? monthlyPackage.product.priceString : "£2"}
              subText={monthlyPackage ? Copy.subscription.monthlyPrice(monthlyPackage.product.priceString) : "£2/month"}
              loading={purchasing === "pro-monthly"}
              onUpgrade={() => handlePurchase(monthlyPackage, "pro-monthly")}
              testID="button-pro-monthly"
            />
          </View>
        </View>

        <View style={[styles.planCard, { backgroundColor: cardBg, marginTop: Spacing.md }]}>
          <ThemedText type="h3" style={[styles.planTitle, { color: isDark ? "#B8E4EC" : "#2A6E7A" }]}>
            {Copy.subscription.orbiaSupporterTitle}
          </ThemedText>
          <ThemedText type="caption" style={[styles.planSubtitleCaps, { color: isDark ? "#7BC9D5" : "#3A8A9A" }]}>
            {Copy.subscription.orbiaSupporterSubtitle}
          </ThemedText>
          {Copy.subscription.orbiaSupporterFeatures.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Feather name="check" size={14} color={CORAL} style={{ marginRight: Spacing.sm }} />
              <ThemedText type="small" style={{ color: theme.text }}>{f}</ThemedText>
            </View>
          ))}
          <ThemedText type="small" style={[styles.tagline, { color: theme.textSecondary }]}>
            {Copy.subscription.orbiaSupporterBody}
          </ThemedText>
          <Pressable>
            <ThemedText type="small" style={{ color: CORAL, fontFamily: FontFamily.sansSemiBold, marginBottom: Spacing.md }}>
              {Copy.subscription.orbiaSupporterLink} →
            </ThemedText>
          </Pressable>

          <View style={[styles.pricingRows, { backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.45)" }]}>
            <PricingRow
              label={Copy.subscription.bestValue}
              period="Yearly"
              priceDisplay={yearlyPackage ? yearlyPackage.product.priceString : "£12"}
              subText={yearlyPackage ? Copy.subscription.yearlyPrice(yearlyPackage.product.priceString) : "12 Months @ £12"}
              loading={purchasing === "supporter-yearly"}
              onUpgrade={() => handlePurchase(yearlyPackage, "supporter-yearly")}
              testID="button-supporter-yearly"
            />
            <View style={[styles.pricingDivider, { backgroundColor: isDark ? "#2A5560" : "#C8E8EC" }]} />
            <PricingRow
              period="Monthly"
              priceDisplay={monthlyPackage ? monthlyPackage.product.priceString : "£3"}
              subText={monthlyPackage ? Copy.subscription.monthlyPrice(monthlyPackage.product.priceString) : "£3/month"}
              loading={purchasing === "supporter-monthly"}
              onUpgrade={() => handlePurchase(monthlyPackage, "supporter-monthly")}
              testID="button-supporter-monthly"
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

function PricingRow({
  label,
  period,
  priceDisplay,
  subText,
  loading,
  onUpgrade,
  testID,
}: {
  label?: string;
  period: string;
  priceDisplay: string;
  subText: string;
  loading: boolean;
  onUpgrade: () => void;
  testID: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.pricingRow}>
      <View style={styles.pricingInfo}>
        <View style={styles.pricingPeriodRow}>
          <ThemedText type="body" style={{ fontFamily: FontFamily.sansSemiBold }}>
            {period}
          </ThemedText>
          {label ? (
            <View style={styles.bestValueBadge}>
              <ThemedText type="caption" style={{ color: CORAL, fontFamily: FontFamily.sansBold, fontSize: 10 }}>
                {label}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {subText}
        </ThemedText>
      </View>
      <View style={styles.pricingRight}>
        <ThemedText type="h3" style={{ color: "#2A6E7A", fontFamily: FontFamily.serifBold }}>
          {priceDisplay}
        </ThemedText>
        <Pressable
          style={[styles.upgradeButton, { backgroundColor: loading ? CORAL + "80" : CORAL }]}
          onPress={onUpgrade}
          disabled={loading}
          testID={testID}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText type="caption" style={{ color: "#FFFFFF", fontFamily: FontFamily.sansBold }}>
              {Copy.subscription.upgradeButton}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
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
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  planTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 20,
    marginBottom: 2,
  },
  planSubtitleCaps: {
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
  pricingRows: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginTop: Spacing.sm,
  },
  pricingDivider: { height: 1 },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  pricingInfo: { flex: 1 },
  pricingPeriodRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  bestValueBadge: {
    backgroundColor: CORAL + "20",
    borderRadius: BorderRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pricingRight: { alignItems: "flex-end", gap: Spacing.xs },
  upgradeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
  },
  loadingOverlay: { alignItems: "center", paddingVertical: Spacing.md },
  restoreButton: { paddingVertical: Spacing.lg, alignItems: "center" },
  terms: { textAlign: "center", paddingHorizontal: Spacing.lg, lineHeight: 18 },
});
