import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { FontFamily, Spacing, BorderRadius } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { scheduleTrialNotifications } from "@/services/notifications";

const ONBOARDING_KEY = "@goflo/onboarding_complete";
const USER_NAME_KEY = "@goflo/user_name";
const TRIAL_START_KEY = "@orbia/trial_start_date";

interface OnboardingScreenProps {
  onComplete?: () => void;
  reviewMode?: boolean;
}

function DotIndicators({ active, total }: { active: number; total: number }) {
  const { theme } = useTheme();
  const { rs } = useResponsive();
  return (
    <View style={[styles.dotsWrapper, { marginBottom: rs(Spacing["2xl"]) }]}>
      <View style={styles.dotsRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === active
                ? { backgroundColor: theme.saveButtonActive }
                : { backgroundColor: theme.saveButtonDisabled },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function ExampleCard({
  categoryLabel,
  categoryColor,
  bgColor,
  iconName,
  iconColor,
  title,
  detail,
}: {
  categoryLabel: string;
  categoryColor: string;
  bgColor: string;
  iconName: keyof typeof Feather.glyphMap;
  iconColor: string;
  title: string;
  detail: string;
}) {
  const { theme } = useTheme();
  const { rs } = useResponsive();
  return (
    <View style={[styles.exampleCardOuter, { backgroundColor: bgColor }]}>
      <Text style={[styles.exampleCategoryLabel, { color: categoryColor, fontSize: rs(22) }]}>
        {categoryLabel}
      </Text>
      <View style={[styles.exampleCardInner, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.exampleIconCircle, { backgroundColor: iconColor + "20" }]}>
          <Feather name={iconName} size={16} color={iconColor} />
        </View>
        <View style={styles.exampleCardText}>
          <Text style={[styles.exampleTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.exampleDetail, { color: theme.textSecondary }]}>{detail}</Text>
        </View>
        <Text style={[styles.exampleNow, { color: theme.textTertiary }]}>{Copy.onboarding.now}</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen({ onComplete, reviewMode }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { rs } = useResponsive();
  const [page, setPage] = useState(0);
  const [name, setName] = useState("");
  const nameInputRef = useRef<RNTextInput>(null);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(1);
    setTimeout(() => nameInputRef.current?.focus(), 400);
  };

  const handleToTrialPage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(2);
  };

  const handleComplete = async (navigateToPaywall?: boolean) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!onComplete) return;
    if (!reviewMode) {
      const trimmed = name.trim();
      if (trimmed) {
        await AsyncStorage.setItem(USER_NAME_KEY, trimmed);
      }
      const alreadyStarted = await AsyncStorage.getItem(TRIAL_START_KEY);
      if (!alreadyStarted) {
        await AsyncStorage.setItem(TRIAL_START_KEY, new Date().toISOString());
        try {
          await scheduleTrialNotifications();
        } catch {}
      }
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    }
    onComplete();
  };

  const cycleCardBg = isDark ? "#1E3D2E" : "#E3F4EC";
  const dailyCardBg = isDark ? "#3D2A1E" : "#F5E7D1";
  const setDaysCardBg = isDark ? "#1E3040" : "#D6EFF5";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing["2xl"] }]}>
        <DotIndicators active={Math.min(page, 2)} total={3} />

        {page === 2 ? (
          <View style={styles.page}>
            <View style={[styles.pageTwoContent, { paddingTop: rs(Spacing["3xl"]) }]}>
              <Text style={[styles.trialLabel, { color: theme.saveButtonActive, fontSize: rs(11) }]}>
                {Copy.subscription.trialPageLabel}
              </Text>
              <Text style={[styles.bigTitle, { color: theme.text, fontSize: rs(28), lineHeight: rs(38), marginBottom: rs(Spacing.lg) }]}>
                {Copy.subscription.trialPageTitle}
              </Text>
              <Text style={[styles.nameExplanation, { color: theme.textSecondary, fontSize: rs(15), lineHeight: rs(22), marginBottom: rs(Spacing["3xl"]) }]}>
                {Copy.subscription.trialPageBody}
              </Text>
              <View style={[styles.trialFeatureList, { backgroundColor: isDark ? "#1A3D44" : "#EBF6F8", borderRadius: BorderRadius.lg, padding: Spacing.lg }]}>
                {[...Copy.subscription.orbiaProFeatures, ...Copy.subscription.orbiaLiteFeatures].map((f, i) => (
                  <View key={i} style={[styles.trialFeatureRow, i > 0 && { marginTop: Spacing.sm }]}>
                    <Feather name="check" size={14} color={theme.saveButtonActive} style={{ marginRight: Spacing.sm }} />
                    <Text style={[{ fontFamily: FontFamily.sansRegular, fontSize: rs(14), color: theme.text }]}>{f}</Text>
                  </View>
                ))}
              </View>
              <Pressable onPress={() => handleComplete(true)} style={{ marginTop: Spacing["2xl"] }}>
                <Text style={[{ color: theme.saveButtonActive, fontFamily: FontFamily.sansSemiBold, fontSize: rs(14), textDecorationLine: "underline" }]}>
                  {Copy.subscription.trialPageSubscribeLink}
                </Text>
              </Pressable>
            </View>
            <View style={styles.bottomRow}>
              <View style={{ flex: 1 }} />
              <Pressable style={[styles.arrowButton, { backgroundColor: theme.saveButtonActive }]} onPress={() => handleComplete()}>
                <Feather name="arrow-right" size={24} color={theme.buttonText} />
              </Pressable>
            </View>
          </View>
        ) : page === 0 ? (
          <View style={styles.page}>
            <ScrollView
              style={styles.pageOneScroll}
              contentContainerStyle={styles.pageOneContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.bigTitle, { color: theme.text, fontSize: rs(26), lineHeight: rs(34), marginBottom: rs(Spacing.sm) }]}>
                {Copy.onboarding.pageOneTitle}
                <Text style={styles.brandHighlight}>{Copy.onboarding.pageOneBrand}</Text>
              </Text>
              <Text style={[styles.pageOneSubtitle, { color: theme.textSecondary, fontSize: rs(16), lineHeight: rs(22), marginBottom: rs(Spacing["3xl"]) }]}>{Copy.onboarding.pageOneSubtitle}</Text>

              <View style={[styles.cardsContainer, { gap: rs(Spacing.lg) }]}>
                <ExampleCard
                  categoryLabel={Copy.onboarding.cycleAligned}
                  categoryColor={theme.accentMint}
                  bgColor={cycleCardBg}
                  iconName="circle"
                  iconColor={theme.accentMint}
                  title={Copy.onboarding.cycleExample}
                  detail={Copy.onboarding.cycleDetail}
                />

                <ExampleCard
                  categoryLabel={Copy.onboarding.dailyRhythm}
                  categoryColor={theme.accentCoral}
                  bgColor={dailyCardBg}
                  iconName="sunrise"
                  iconColor={theme.saveButtonActive}
                  title={Copy.onboarding.dailyExample}
                  detail={Copy.onboarding.dailyDetail}
                />

                <ExampleCard
                  categoryLabel={Copy.onboarding.setDays}
                  categoryColor={theme.info}
                  bgColor={setDaysCardBg}
                  iconName="star"
                  iconColor={theme.info}
                  title={Copy.onboarding.setDaysExample}
                  detail={Copy.onboarding.setDaysDetail}
                />
              </View>
            </ScrollView>

            <Pressable
              style={[styles.arrowButton, styles.arrowButtonFloating, { backgroundColor: theme.saveButtonActive }]}
              onPress={handleNext}
            >
              <Feather name="arrow-right" size={24} color={theme.buttonText} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.page}>
            <View style={[styles.pageTwoContent, { paddingTop: rs(Spacing["4xl"]) }]}>
              <Text style={[styles.helloTitle, { color: theme.text, fontSize: rs(48), marginBottom: rs(Spacing["3xl"]) }]}>{Copy.onboarding.pageTwoTitle}</Text>

              <View style={styles.nameInputWrapper}>
                <RNTextInput
                  ref={nameInputRef}
                  style={[styles.nameInput, { color: theme.text, fontSize: rs(20) }]}
                  placeholder={Copy.onboarding.namePrompt}
                  placeholderTextColor={theme.saveButtonDisabled}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                  onSubmitEditing={handleComplete}
                />
                <View style={[styles.nameInputUnderline, { backgroundColor: theme.saveButtonActive }]} />
              </View>

              <Text style={[styles.nameExplanation, { color: theme.textSecondary }]}>
                {Copy.onboarding.nameExplanation}
              </Text>
            </View>

            <View style={styles.bottomRow}>
              <View style={{ flex: 1 }} />
              <Pressable style={[styles.arrowButton, { backgroundColor: theme.saveButtonActive }]} onPress={handleToTrialPage}>
                <Feather name="arrow-right" size={24} color={theme.buttonText} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing["2xl"],
  },
  dotsWrapper: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  trialLabel: {
    fontFamily: FontFamily.sansBold,
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
  },
  trialFeatureList: {},
  trialFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  page: {
    flex: 1,
    justifyContent: "space-between",
  },
  pageOneScroll: {
    flex: 1,
  },
  pageOneContent: {
    paddingBottom: 56 + Spacing.xl,
  },
  bigTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 44,
    marginBottom: Spacing["3xl"],
    lineHeight: 52,
  },
  brandHighlight: {
    fontFamily: FontFamily.serifBold,
    color: "#E8614F",
  },
  pageOneSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: Spacing["3xl"],
  },
  cardsContainer: {
    justifyContent: "flex-start",
    gap: Spacing.lg,
  },
  exampleCardOuter: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 32,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    overflow: "hidden",
  },
  exampleCategoryLabel: {
    fontFamily: FontFamily.serifBold,
    fontSize: 22,
    marginBottom: Spacing.sm,
  },
  exampleCardInner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  exampleIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  exampleCardText: {
    flex: 1,
  },
  exampleTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
  },
  exampleDetail: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    marginTop: 2,
  },
  exampleNow: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    marginLeft: Spacing.sm,
  },
  pageTwoContent: {
    flex: 1,
    paddingTop: Spacing["4xl"],
  },
  helloTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 48,
    marginBottom: Spacing["3xl"],
  },
  nameInputWrapper: {
    marginBottom: Spacing.md,
  },
  nameInput: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 20,
    paddingVertical: Spacing.md,
    paddingHorizontal: 0,
  },
  nameInputUnderline: {
    height: 2,
  },
  nameExplanation: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  arrowButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  arrowButtonFloating: {
    position: "absolute",
    right: 0,
    bottom: 0,
  },
});
