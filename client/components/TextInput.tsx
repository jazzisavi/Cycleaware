import React from "react";
import {
  TextInput as RNTextInput,
  StyleSheet,
  View,
  TextInputProps as RNTextInputProps,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
}

export function TextInput({ label, error, style, ...props }: TextInputProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
      ) : null}
      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundSecondary,
            color: theme.text,
            borderColor: error ? theme.error : theme.borderLight,
          },
          style,
        ]}
        placeholderTextColor={theme.textTertiary}
        {...props}
      />
      {error ? (
        <ThemedText type="caption" style={[styles.error, { color: theme.error }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    ...Typography.body,
  },
  error: {
    marginTop: Spacing.xs,
  },
});
