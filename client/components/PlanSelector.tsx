import React from "react";
import { View, Pressable, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";

const CORAL = "#E8614F";
const TEAL = "#3FA0B0";
const MUTED_BROWN = "#6B5744";

interface PlanSelectorProps {
  isSelected: boolean;
  period: string;
  subLine: string;
  price: string;
  isBestValue?: boolean;
  loading: boolean;
  onSelect: () => void;
  onUpgrade: () => void;
  testID: string;
  theme: any;
  isDark: boolean;
}

export function PlanSelector({
  isSelected,
  period,
  subLine,
  price,
  isBestValue,
  loading,
  onSelect,
  onUpgrade,
  testID,
  theme,
  isDark,
}: PlanSelectorProps) {
  if (isSelected) {
    return (
      <View
        style={[
          styles.selectedPlanCard,
          {
            backgroundColor: isDark ? "#2C2118" : "#FFFFFF",
            borderColor: TEAL,
          },
        ]}
      >
        <View style={styles.selectedPlanHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText
              type="h3"
              style={{ fontFamily: FontFamily.serifBold, fontSize: 24, color: theme.text }}
            >
              {period}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: isDark ? theme.textSecondary : MUTED_BROWN, fontSize: 12, marginTop: 2 }}
            >
              {subLine}
            </ThemedText>
          </View>
          <ThemedText type="h3" style={{ fontFamily: FontFamily.sansBold, color: theme.text }}>
            {price}
          </ThemedText>
        </View>

        {isBestValue ? (
          <View style={[styles.bestValuePill, { backgroundColor: TEAL }]}>
            <ThemedText
              type="caption"
              style={{
                color: "#FFFFFF",
                fontFamily: FontFamily.sansBold,
                fontSize: 9,
                textTransform: "uppercase",
              }}
            >
              {Copy.subscription.bestValue}
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.upgradePill,
            { backgroundColor: loading ? CORAL + "80" : CORAL },
          ]}
          onPress={onUpgrade}
          disabled={loading}
          testID={testID}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText
              type="caption"
              style={{
                color: "#FFFFFF",
                fontFamily: FontFamily.sansBold,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {Copy.subscription.upgradeButton}
            </ThemedText>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      style={[
        styles.collapsedPlanRow,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.35)",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(60,40,20,0.08)",
        },
      ]}
      onPress={onSelect}
    >
      <ThemedText
        type="body"
        style={{ fontFamily: FontFamily.serifBold, fontSize: 20, color: theme.text }}
      >
        {period}
      </ThemedText>
      <ThemedText type="body" style={{ fontFamily: FontFamily.sansBold, color: theme.text }}>
        {price}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
