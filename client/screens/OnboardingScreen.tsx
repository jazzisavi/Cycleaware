import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput as RNTextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { FontFamily, Spacing, BorderRadius } from "@/constants/theme";
import { Copy } from "@/constants/copy";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ONBOARDING_KEY = "@goflo/onboarding_complete";
const USER_NAME_KEY = "@goflo/user_name";

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [name, setName] = useState("");
  const nameInputRef = useRef<RNTextInput>(null);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(1);
    setTimeout(() => nameInputRef.current?.focus(), 300);
  };

  const handleGetStarted = async () => {
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
      <View style={[styles.content, { paddingTop: insets.top + Spacing["4xl"], paddingBottom: insets.bottom + Spacing["2xl"] }]}>
        {page === 0 ? (
          <View style={styles.page}>
            <View style={styles.topSection}>
              <View style={styles.iconCircle}>
                <Feather name="heart" size={48} color="#E8614F" />
              </View>
              <Text style={styles.logoText}>{Copy.app.name}</Text>
            </View>

            <View style={styles.textSection}>
              <Text style={styles.title}>{Copy.onboarding.welcomeTitle}</Text>
              <Text style={styles.subtitle}>{Copy.onboarding.welcomeText}</Text>
            </View>

            <View style={styles.bottomSection}>
              <View style={styles.dots}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
              </View>
              <Pressable style={styles.primaryButton} onPress={handleContinue}>
                <Text style={styles.primaryButtonText}>{Copy.onboarding.continueButton}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.page}>
            <View style={styles.topSection}>
              <View style={styles.iconCircle}>
                <Feather name="user" size={48} color="#E8614F" />
              </View>
            </View>

            <View style={styles.textSection}>
              <Text style={styles.title}>{Copy.onboarding.namePrompt}</Text>
              <View style={styles.nameInputContainer}>
                <RNTextInput
                  ref={nameInputRef}
                  style={styles.nameInput}
                  placeholder={Copy.onboarding.namePlaceholder}
                  placeholderTextColor="#6B5744"
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                  onSubmitEditing={handleGetStarted}
                />
              </View>
            </View>

            <View style={styles.bottomSection}>
              <View style={styles.dots}>
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotActive]} />
              </View>
              <Pressable
                style={[styles.primaryButton, !name.trim() && styles.primaryButtonDisabled]}
                onPress={handleGetStarted}
                disabled={!name.trim()}
              >
                <Text style={styles.primaryButtonText}>{Copy.onboarding.getStartedButton}</Text>
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
  page: {
    flex: 1,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    paddingTop: Spacing["4xl"],
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FDEEE9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  logoText: {
    fontFamily: FontFamily.serifBold,
    fontSize: 32,
    color: "#2C2118",
  },
  textSection: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.serifBold,
    fontSize: 28,
    color: "#2C2118",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 16,
    color: "#6B5744",
    textAlign: "center",
    lineHeight: 24,
  },
  nameInputContainer: {
    width: "100%",
    marginTop: Spacing.md,
  },
  nameInput: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 18,
    color: "#2C2118",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#D9D0C3",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    textAlign: "center",
  },
  bottomSection: {
    alignItems: "center",
    gap: Spacing.xl,
  },
  dots: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D9D0C3",
  },
  dotActive: {
    backgroundColor: "#E8614F",
    width: 24,
  },
  primaryButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#E8614F",
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#E8C4B8",
  },
  primaryButtonText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 18,
    color: "#FFFFFF",
  },
});
