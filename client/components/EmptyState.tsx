import React from "react";
import { View, StyleSheet, Image, ImageSourcePropType } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface EmptyStateProps {
  image?: ImageSourcePropType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ image, title, description, action }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {image ? (
        <Image source={image} style={styles.image} resizeMode="contain" />
      ) : null}
      <ThemedText type="h3" style={styles.title}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      ) : null}
      {action ? <View style={styles.actionContainer}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"],
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: Spacing["2xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: "center",
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: Spacing["2xl"],
  },
});
