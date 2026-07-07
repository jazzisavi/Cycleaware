import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { Copy } from "@/constants/copy";
import { AlarmService, AlarmSoundId } from "@/services/AlarmService";

interface AlarmSound {
  id: AlarmSoundId;
  labelKey: keyof typeof Copy.alarmSounds.sounds;
}

const ALARM_SOUNDS: AlarmSound[] = [
  { id: "morning_glory", labelKey: "morning_glory" },
  { id: "alarm_clock", labelKey: "alarm_clock" },
];

export default function AlarmSoundsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { rs } = useResponsive();
  const [selectedSound, setSelectedSound] = useState<AlarmSoundId>("morning_glory");
  const [playingSound, setPlayingSound] = useState<AlarmSoundId | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSelectedSound = async () => {
      const saved = await AlarmService.getSelectedSound();
      setSelectedSound(saved);
    };
    loadSelectedSound();

    return () => {
      AlarmService.stopPreview();
    };
  }, []);

  const handleSelect = (soundId: AlarmSoundId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSound(soundId);
  };

  const handlePlay = async (soundId: AlarmSoundId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (playingSound === soundId) {
      await AlarmService.stopPreview();
      setPlayingSound(null);
    } else {
      setPlayingSound(soundId);
      await AlarmService.playPreview(soundId);
      
      setTimeout(() => {
        setPlayingSound(null);
      }, 4000);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await AlarmService.stopPreview();
      await AlarmService.setSelectedSound(selectedSound);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Error saving sound:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.backgroundDefault }]}
          hitSlop={8}
          testID="button-back-alarm"
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { fontSize: rs(20) }]}>
          {Copy.alarmSounds.title}
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.soundsList}>
          {ALARM_SOUNDS.map((item) => {
            const isSelected = selectedSound === item.id;
            const isPlaying = playingSound === item.id;

            return (
              <Pressable
                key={item.id}
                onPress={() => handleSelect(item.id)}
                style={[
                  styles.soundItem,
                  {
                    backgroundColor: isSelected ? theme.pillActiveBg : theme.backgroundDefault,
                    borderColor: isSelected ? theme.pillActiveBorder : "transparent",
                    borderWidth: isSelected ? 1.5 : 1.5,
                  },
                  !isSelected && { borderColor: "transparent" },
                ]}
                testID={`sound-option-${item.id}`}
              >
                <View style={styles.soundInfo}>
                  {isSelected ? (
                    <View style={[styles.radioOuter, { borderColor: theme.pillActiveBorder }]}>
                      <View style={[styles.radioInner, { backgroundColor: theme.pillActiveBorder }]} />
                    </View>
                  ) : (
                    <View style={[styles.radioOuter, { borderColor: theme.border }]} />
                  )}
                  <ThemedText type="body" style={{ marginLeft: Spacing.md }}>
                    {Copy.alarmSounds.sounds[item.labelKey]}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => handlePlay(item.id)}
                  hitSlop={8}
                  testID={`play-sound-${item.id}`}
                >
                  <Feather
                    name={isPlaying ? "pause" : "play"}
                    size={20}
                    color={isSelected ? theme.pillActiveBorder : theme.border}
                  />
                </Pressable>
              </Pressable>
            );
          })}
        </View>

        {Platform.OS === "web" ? (
          <View style={[styles.webNotice, { backgroundColor: theme.warning + "20" }]}>
            <Feather name="alert-circle" size={18} color={theme.warning} />
            <ThemedText type="small" style={{ color: theme.warning, marginLeft: Spacing.sm, flex: 1 }}>
              {Copy.alarmSounds.webNotice}
            </ThemedText>
          </View>
        ) : null}

        <Button
          onPress={handleSave}
          loading={isLoading}
          style={[styles.saveButton, { backgroundColor: theme.saveButtonActive }]}
          testID="button-save-sound"
        >
          {Copy.alarmSounds.saveButton}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FontFamily.serifBold,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  soundsList: {
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  soundItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
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
  saveButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  webNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
});
