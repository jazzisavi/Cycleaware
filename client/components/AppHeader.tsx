import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { useUserName } from "@/hooks/useUserName";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface AppHeaderProps {
  title: string;
  showGreeting?: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return Copy.home.goodMorning;
  if (hour < 17) return Copy.home.goodAfternoon;
  return Copy.home.goodEvening;
}

function getFormattedDate(): string {
  const now = new Date();
  const datePart = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const timePart = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  return `${datePart} ${timePart}`;
}

export function AppHeader({ title, showGreeting = false }: AppHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { name } = useUserName();

  if (showGreeting) {
    return (
      <View style={[styles.greetingContainer, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.greetingContent}>
          <Text style={[styles.greetingText, { color: theme.text }]}>
            {getGreeting()}
          </Text>
          {name ? (
            <Text style={[styles.greetingName, { color: theme.text }]}>
              {name}
            </Text>
          ) : null}
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {getFormattedDate()}
          </Text>
        </View>
        <Pressable
          style={styles.profileButton}
          onPress={() => navigation.navigate("More")}
          testID="button-profile"
        >
          <View style={[styles.profileIconContainer, { borderColor: theme.text }]}>
            <Feather name="user" size={18} color={theme.text} />
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.titleContainer}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <Pressable
        style={styles.profileButton}
        onPress={() => navigation.navigate("More")}
        testID="button-more"
      >
        <View style={[styles.profileIconContainer, { borderColor: theme.text }]}>
          <Feather name="user" size={18} color={theme.text} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: FontFamily.serifBold,
    lineHeight: 36,
  },
  greetingContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  greetingContent: {
    flex: 1,
  },
  greetingText: {
    fontSize: 28,
    fontFamily: FontFamily.serifBold,
    lineHeight: 36,
  },
  greetingName: {
    fontSize: 28,
    fontFamily: FontFamily.serifBold,
    lineHeight: 36,
    marginBottom: Spacing.xs,
  },
  dateText: {
    fontSize: 14,
    fontFamily: FontFamily.sansRegular,
  },
  profileButton: {
    marginLeft: Spacing.md,
    marginTop: Spacing.xs,
  },
  profileIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
