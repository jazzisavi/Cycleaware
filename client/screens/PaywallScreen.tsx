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
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Copy } from "@/constants/copy";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    isSubscribed,
    offering,
    isLoading,
    purchasePackage,
    restorePurchases,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const monthlyPackage = offering?.availablePackages.find(
    (p) => p.packageType === PACKAGE_TYPE.MONTHLY
  );
  const yearlyPackage = offering?.availablePackages.find(
    (p) => p.packageType === PACKAGE_TYPE.ANNUAL
  );

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    setMessage(null);
    const result = await purchasePackage(selectedPackage);
    setPurchasing(false);
    if (result.success) {
      setMessage({ text: Copy.paywall.purchaseSuccess, type: "success" });
    } else if (result.error !== "cancelled") {
      setMessage({ text: Copy.paywall.purchaseError, type: "error" });
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setMessage(null);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.success) {
      setMessage({ text: Copy.paywall.restoreSuccess, type: "success" });
    } else {
      setMessage({ text: Copy.paywall.restoreNoActive, type: "error" });
    }
  };

  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centeredContent, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <Feather name="smartphone" size={48} color={theme.primary} />
          <ThemedText type="h2" style={styles.centeredTitle}>
            {Copy.paywall.title}
          </ThemedText>
          <ThemedText type="body" style={[styles.centeredText, { color: theme.textSecondary }]}>
            {Copy.paywall.webNotice}
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
          <ThemedText type="h2" style={styles.centeredTitle}>
            {Copy.paywall.subscribedTitle}
          </ThemedText>
          <ThemedText type="body" style={[styles.centeredText, { color: theme.textSecondary }]}>
            {Copy.paywall.subscribedMessage}
          </ThemedText>
          <Button
            variant="outline"
            style={{ marginTop: Spacing["2xl"] }}
            onPress={() => {
              try {
                if (Platform.OS !== "web") {
                  Linking.openSettings();
                }
              } catch {}
            }}
            testID="button-manage-subscription"
          >
            {Copy.paywall.manageSubscription}
          </Button>
        </View>
      </ThemedView>
    );
  }

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
        <View style={styles.headerSection}>
          <ThemedText type="h1" style={styles.title}>
            {Copy.paywall.title}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            {Copy.paywall.subtitle}
          </ThemedText>
        </View>

        <View style={styles.featuresSection}>
          {Copy.paywall.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: theme.success + "20" }]}>
                <Feather name="check" size={14} color={theme.success} />
              </View>
              <ThemedText type="body">{feature}</ThemedText>
            </View>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              {Copy.paywall.loadingPlans}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.plansSection}>
            {monthlyPackage ? (
              <PlanCard
                label={Copy.paywall.monthlyLabel}
                price={monthlyPackage.product.priceString}
                period={Copy.paywall.perMonth}
                selected={selectedPackage?.identifier === monthlyPackage.identifier}
                onSelect={() => setSelectedPackage(monthlyPackage)}
                theme={theme}
                testID="plan-monthly"
              />
            ) : null}
            {yearlyPackage ? (
              <PlanCard
                label={Copy.paywall.yearlyLabel}
                price={yearlyPackage.product.priceString}
                period={Copy.paywall.perYear}
                badge={Copy.paywall.yearlyBadge}
                selected={selectedPackage?.identifier === yearlyPackage.identifier}
                onSelect={() => setSelectedPackage(yearlyPackage)}
                theme={theme}
                testID="plan-yearly"
              />
            ) : null}
          </View>
        )}

        {message ? (
          <View
            style={[
              styles.messageBanner,
              {
                backgroundColor:
                  message.type === "success"
                    ? theme.success + "20"
                    : theme.error + "20",
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: message.type === "success" ? theme.success : theme.error,
                textAlign: "center",
              }}
            >
              {message.text}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.actionsSection}>
          <Button
            onPress={handlePurchase}
            loading={purchasing}
            disabled={!selectedPackage || purchasing}
            testID="button-subscribe"
          >
            {Copy.paywall.subscribeButton}
          </Button>

          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            style={styles.restoreButton}
            testID="button-restore"
          >
            {restoring ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <ThemedText type="link" style={{ color: theme.primary, textAlign: "center" }}>
                {Copy.paywall.restoreButton}
              </ThemedText>
            )}
          </Pressable>
        </View>

        <ThemedText type="caption" style={[styles.terms, { color: theme.textTertiary }]}>
          {Copy.paywall.termsNotice}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function PlanCard({
  label,
  price,
  period,
  badge,
  selected,
  onSelect,
  theme,
  testID,
}: {
  label: string;
  price: string;
  period: string;
  badge?: string;
  selected: boolean;
  onSelect: () => void;
  theme: any;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.planCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: selected ? theme.primary : theme.borderLight,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      testID={testID}
    >
      <View style={styles.planHeader}>
        <ThemedText type="h3">{label}</ThemedText>
        {badge ? (
          <View style={[styles.saveBadge, { backgroundColor: theme.success + "20" }]}>
            <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600" }}>
              {badge}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.planPricing}>
        <ThemedText type="h2" style={{ color: theme.text }}>
          {price}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {period}
        </ThemedText>
      </View>
      <View style={[styles.radioOuter, { borderColor: selected ? theme.primary : theme.border }]}>
        {selected ? (
          <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  centeredTitle: {
    marginTop: Spacing.xl,
    textAlign: "center",
  },
  centeredText: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  featuresSection: {
    marginBottom: Spacing["2xl"],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  loadingSection: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  plansSection: {
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  planCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  planHeader: {
    flex: 1,
  },
  planPricing: {
    alignItems: "flex-end",
    marginRight: Spacing.lg,
  },
  saveBadge: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: undefined,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  messageBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  actionsSection: {
    gap: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  restoreButton: {
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  terms: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
});
