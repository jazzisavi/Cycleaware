import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { Spacing, FontFamily, BorderRadius } from "@/constants/theme";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { rs } = useResponsive();
  const navigation = useNavigation();

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.backgroundDefault }]}
          hitSlop={8}
          testID="button-about-back"
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { fontSize: rs(28) }]}>About</ThemedText>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]}>
          <ThemedText type="h2" style={styles.appName}>Orbia</ThemedText>
          <ThemedText type="small" style={[styles.version, { color: theme.textSecondary }]}>
            Version {appVersion}
          </ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
          <ThemedText type="body" style={[styles.tagline, { color: theme.textSecondary }]}>
            From hormones to vitamins, Orbia keeps your daily routine in perfect flow.
          </ThemedText>
          <ThemedText type="small" style={[styles.comingSoon, { color: theme.textTertiary }]}>
            More content coming soon.
          </ThemedText>
        </View>
      </View>
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
    fontFamily: FontFamily.serifBold,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  appName: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  version: {
    textAlign: "center",
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: Spacing.lg,
  },
  tagline: {
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  comingSoon: {
    textAlign: "center",
  },
});
