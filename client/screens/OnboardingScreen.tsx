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
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

import { FontFamily, Spacing } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { scheduleTrialNotifications } from "@/services/notifications";
import { useUserName } from "@/hooks/useUserName";

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

function ReminderPreviewCard({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.reminderCard}>
      <View style={styles.reminderCardText}>
        <Text style={styles.reminderCardTitle}>{title}</Text>
        <Text style={styles.reminderCardDetail}>{detail}</Text>
      </View>
      <View style={styles.takeButton}>
        <Text style={styles.takeButtonLabel}>{Copy.onboarding.takeButton}</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen({ onComplete, reviewMode }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { rs } = useResponsive();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setName: setGlobalName } = useUserName();
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
        await setGlobalName(trimmed);
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing["2xl"] }]}>
        <DotIndicators active={Math.min(page + 1, 3)} total={4} />

        {page === 2 ? (
          <View style={styles.page}>
            <ScrollView
              style={styles.pageOneScroll}
              contentContainerStyle={[styles.trialPageContent, { paddingBottom: rs(80) }]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.bigTitle, { color: theme.text, fontSize: rs(28), lineHeight: rs(36), marginBottom: rs(Spacing.lg) }]}>
                {Copy.subscription.trialPageTitle}
              </Text>
              <Text style={[styles.trialLabel, { color: theme.textSecondary, fontSize: rs(11), marginBottom: rs(Spacing.md) }]}>
                {Copy.subscription.trialPageLabel}
              </Text>
              <Text style={[styles.nameExplanation, { color: theme.text, fontSize: rs(15), lineHeight: rs(23), marginBottom: rs(Spacing.xl) }]}>
                {Copy.subscription.trialPageBody}
              </Text>
              <Pressable
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (!reviewMode) {
                    const trimmed = name.trim();
                    if (trimmed) await setGlobalName(trimmed);
                  }
                  navigation.navigate("Paywall");
                }}
                style={{ marginBottom: rs(Spacing["2xl"]) }}
              >
                <Text style={[styles.subscribeLink, { color: theme.saveButtonActive }]}>
                  {Copy.subscription.trialPageSubscribeLink}
                  {" →"}
                </Text>
              </Pressable>
              <Image
                source={require("../assets/images/onboarding-hero.png")}
                style={styles.heroImage}
                resizeMode="cover"
              />
            </ScrollView>
            <Pressable
              style={[styles.arrowButton, styles.arrowButtonFloating, { backgroundColor: theme.saveButtonActive }]}
              onPress={() => handleComplete()}
            >
              <Feather name="arrow-right" size={24} color={theme.buttonText} />
            </Pressable>
          </View>
        ) : page === 0 ? (
          <View style={styles.page}>
            <ScrollView
              style={styles.pageOneScroll}
              contentContainerStyle={styles.pageOneContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.bigTitle, { color: theme.text, fontSize: rs(32), lineHeight: rs(40), marginBottom: rs(Spacing.sm) }]}>
                {Copy.onboarding.pageOneTitle}
              </Text>
              <Text style={[styles.pageOneSubtitle, { color: theme.textSecondary, fontSize: rs(15), lineHeight: rs(22), marginBottom: rs(Spacing["2xl"]) }]}>{Copy.onboarding.pageOneSubtitle}</Text>

              <View style={styles.cardsContainer}>
                <ReminderPreviewCard title={Copy.onboarding.reminderCard1Title} detail={Copy.onboarding.reminderCard1Detail} />
                <ReminderPreviewCard title={Copy.onboarding.reminderCard2Title} detail={Copy.onboarding.reminderCard2Detail} />
                <ReminderPreviewCard title={Copy.onboarding.reminderCard3Title} detail={Copy.onboarding.reminderCard3Detail} />
                <ReminderPreviewCard title={Copy.onboarding.reminderCard4Title} detail={Copy.onboarding.reminderCard4Detail} />
                <ReminderPreviewCard title={Copy.onboarding.reminderCard5Title} detail={Copy.onboarding.reminderCard5Detail} />
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
  trialPageContent: {
    paddingTop: Spacing.lg,
  },
  subscribeLink: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
  },
  heroImage: {
    width: "100%",
    height: 260,
    borderRadius: 20,
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
  pageOneSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: Spacing["3xl"],
  },
  cardsContainer: {
    gap: 18,
  },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    height: 70,
    paddingHorizontal: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  reminderCardText: {
    flex: 1,
    marginRight: Spacing.md,
  },
  reminderCardTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: "#111827",
  },
  reminderCardDetail: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  takeButton: {
    backgroundColor: "#3FA0B0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  takeButtonLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: "#FFFFFF",
    letterSpacing: 0.5,
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
