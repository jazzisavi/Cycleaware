import React, { useState } from "react";
import { FlatList, StyleSheet, View, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Copy } from "@/constants/copy";

type SoundId = keyof typeof Copy.alarmSounds.sounds;

interface AlarmSound {
  id: SoundId;
  systemName: string;
}

const ALARM_SOUNDS: AlarmSound[] = [
  { id: "default", systemName: "default" },
  { id: "chime", systemName: "chime" },
  { id: "bell", systemName: "bell" },
  { id: "digital", systemName: "digital" },
  { id: "gentle", systemName: "gentle" },
  { id: "classic", systemName: "classic" },
  { id: "melody", systemName: "melody" },
  { id: "vibrate", systemName: "vibrate" },
];

export default function AlarmSoundsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [selectedSound, setSelectedSound] = useState("default");
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = (soundId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSound(soundId);
  };

  const handlePlay = async (soundId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (playingSound === soundId) {
      setPlayingSound(null);
    } else {
      setPlayingSound(soundId);
      // Simulate playing sound
      setTimeout(() => setPlayingSound(null), 2000);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Save logic will be implemented in Phase 2
    setTimeout(() => setIsLoading(false), 1000);
  };

  const renderItem = ({ item }: { item: AlarmSound }) => {
    const isSelected = selectedSound === item.id;
    const isPlaying = playingSound === item.id;

    return (
      <Pressable
        onPress={() => handleSelect(item.id)}
        style={[
          styles.soundItem,
          {
            backgroundColor: isSelected ? theme.primary + "10" : theme.backgroundDefault,
            borderColor: isSelected ? theme.primary : theme.borderLight,
          },
        ]}
      >
        <View style={styles.soundInfo}>
          {isSelected ? (
            <View style={[styles.radioOuter, { borderColor: theme.primary }]}>
              <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
            </View>
          ) : (
            <View style={[styles.radioOuter, { borderColor: theme.border }]} />
          )}
          <ThemedText type="body" style={{ marginLeft: Spacing.md }}>
            {Copy.alarmSounds.sounds[item.id]}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => handlePlay(item.id)}
          style={[styles.playButton, { backgroundColor: theme.backgroundSecondary }]}
          hitSlop={8}
        >
          <Feather
            name={isPlaying ? "pause" : "play"}
            size={18}
            color={theme.primary}
          />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={ALARM_SOUNDS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="h2" style={styles.title}>
              {Copy.alarmSounds.title}
            </ThemedText>
            <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
              {Copy.alarmSounds.description}
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {Platform.OS === "web" ? (
              <View style={[styles.webNotice, { backgroundColor: theme.warning + "20" }]}>
                <Feather name="alert-circle" size={18} color={theme.warning} />
                <ThemedText type="small" style={{ color: theme.warning, marginLeft: Spacing.sm, flex: 1 }}>
                  {Copy.alarmSounds.webNotice}
                </ThemedText>
              </View>
            ) : null}
            <Button onPress={handleSave} loading={isLoading} testID="button-save-sound">
              {Copy.alarmSounds.saveButton}
            </Button>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing["2xl"],
  },
  title: {
    marginBottom: Spacing.sm,
  },
  description: {
    marginBottom: Spacing.lg,
  },
  soundItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  soundInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    marginTop: Spacing.xl,
  },
  webNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
});
