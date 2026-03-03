import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.logoContainer}>
        <Text style={[styles.logoText, { color: theme.primary }]}>GoFlo</Text>
      </View>
      <Text style={[styles.navTitle, { color: theme.text }]}>{title}</Text>
      <Pressable
        style={styles.moreButton}
        onPress={() => navigation.navigate("More")}
        testID="button-more"
      >
        <Feather name="more-horizontal" size={24} color={theme.text} />
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
  logoContainer: {
    flex: 1,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "PlayfairDisplay_700Bold",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  moreButton: {
    flex: 1,
    alignItems: "flex-end",
  },
});
