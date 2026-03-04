import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { FontFamily, Spacing, BorderRadius } from "@/constants/theme";
import { Copy } from "@/constants/copy";

const ONBOARDING_KEY = "@goflo/onboarding_complete";
const USER_NAME_KEY = "@goflo/user_name";

interface OnboardingScreenProps {
  onComplete: () => void;
}

function DotIndicators({ active, total }: { active: number; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === active ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
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
  return (
    <View style={[styles.exampleCardOuter, { backgroundColor: bgColor }]}>
      <Text style={[styles.exampleCategoryLabel, { color: categoryColor }]}>
        {categoryLabel}
      </Text>
      <View style={styles.exampleCardInner}>
        <View style={[styles.exampleIconCircle, { backgroundColor: iconColor + "20" }]}>
          <Feather name={iconName} size={18} color={iconColor} />
        </View>
        <View style={styles.exampleCardText}>
          <Text style={styles.exampleTitle}>{title}</Text>
          <Text style={styles.exampleDetail}>{detail}</Text>
        </View>
        <Text style={styles.exampleNow}>{Copy.onboarding.now}</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [name, setName] = useState("");
  const nameInputRef = useRef<RNTextInput>(null);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(1);
    setTimeout(() => nameInputRef.current?.focus(), 400);
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const trimmed = name.trim();
    if (trimmed) {
      await AsyncStorage.setItem(USER_NAME_KEY, trimmed);
    }
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: "#F5F0E8" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing["2xl"] }]}>
        <DotIndicators active={page} total={2} />

        {page === 0 ? (
          <View style={styles.page}>
            <View style={styles.pageOneContent}>
              <Text style={styles.bigTitle}>{Copy.onboarding.pageOneTitle}</Text>

              <ExampleCard
                categoryLabel={Copy.onboarding.cycleAligned}
                categoryColor="#2E7D52"
                bgColor="#D5EDE0"
                iconName="circle"
                iconColor="#2E7D52"
                title={Copy.onboarding.cycleExample}
                detail={Copy.onboarding.cycleDetail}
              />

              <ExampleCard
                categoryLabel={Copy.onboarding.dailyRhythm}
                categoryColor="#C03A2B"
                bgColor="#FAE4D5"
                iconName="sunrise"
                iconColor="#E8614F"
                title={Copy.onboarding.dailyExample}
                detail={Copy.onboarding.dailyDetail}
              />

              <ExampleCard
                categoryLabel={Copy.onboarding.setDays}
                categoryColor="#2A6E7A"
                bgColor="#D5E8EC"
                iconName="star"
                iconColor="#2A6E7A"
                title={Copy.onboarding.setDaysExample}
                detail={Copy.onboarding.setDaysDetail}
              />
            </View>

            <View style={styles.bottomRow}>
              <View style={{ flex: 1 }} />
              <Pressable style={styles.arrowButton} onPress={handleNext}>
                <Feather name="arrow-right" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.page}>
            <View style={styles.pageTwoContent}>
              <Text style={styles.helloTitle}>{Copy.onboarding.pageTwoTitle}</Text>

              <View style={styles.nameInputWrapper}>
                <RNTextInput
                  ref={nameInputRef}
                  style={styles.nameInput}
                  placeholder={Copy.onboarding.namePrompt}
                  placeholderTextColor="#D4A090"
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                  onSubmitEditing={handleComplete}
                />
                <View style={styles.nameInputUnderline} />
              </View>

              <Text style={styles.nameExplanation}>
                {Copy.onboarding.nameExplanation}
              </Text>
            </View>

            <View style={styles.bottomRow}>
              <View style={{ flex: 1 }} />
              <Pressable style={styles.arrowButton} onPress={handleComplete}>
                <Feather name="arrow-right" size={24} color="#FFFFFF" />
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
    paddingHorizontal: Spacing.xl,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#E8916F",
  },
  dotInactive: {
    backgroundColor: "#F0D5C8",
  },
  page: {
    flex: 1,
    justifyContent: "space-between",
  },
  pageOneContent: {
    flex: 1,
  },
  bigTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 36,
    color: "#2C2118",
    marginBottom: Spacing["2xl"],
    lineHeight: 44,
  },
  exampleCardOuter: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  exampleCategoryLabel: {
    fontFamily: FontFamily.serifBold,
    fontSize: 18,
    marginBottom: Spacing.sm,
  },
  exampleCardInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  exampleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  exampleCardText: {
    flex: 1,
  },
  exampleTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: "#2C2118",
  },
  exampleDetail: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: "#6B5744",
    marginTop: 2,
  },
  exampleNow: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: "#9A8D7F",
    marginLeft: Spacing.sm,
  },
  pageTwoContent: {
    flex: 1,
    paddingTop: Spacing["4xl"],
  },
  helloTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 48,
    color: "#2C2118",
    marginBottom: Spacing["3xl"],
  },
  nameInputWrapper: {
    marginBottom: Spacing.md,
  },
  nameInput: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 20,
    color: "#2C2118",
    paddingVertical: Spacing.md,
    paddingHorizontal: 0,
  },
  nameInputUnderline: {
    height: 2,
    backgroundColor: "#E8614F",
  },
  nameExplanation: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: "#6B5744",
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
    backgroundColor: "#E8614F",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});
