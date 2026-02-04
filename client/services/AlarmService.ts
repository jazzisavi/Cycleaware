import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SELECTED_SOUND_KEY = "@goflo/selected_alarm_sound";

export type AlarmSoundId = "morning_glory" | "alarm_clock";

const SOUND_FILES: Record<AlarmSoundId, any> = {
  morning_glory: require("../../assets/sounds/morning_glory.mp3"),
  alarm_clock: require("../../assets/sounds/alarm_clock.mp3"),
};

class AlarmServiceClass {
  private sound: Audio.Sound | null = null;
  private previewSound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private isPreviewing: boolean = false;

  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error("Error initializing audio mode:", error);
    }
  }

  async getSelectedSound(): Promise<AlarmSoundId> {
    try {
      const saved = await AsyncStorage.getItem(SELECTED_SOUND_KEY);
      if (saved && saved in SOUND_FILES) {
        return saved as AlarmSoundId;
      }
    } catch (error) {
      console.error("Error reading selected sound:", error);
    }
    return "morning_glory";
  }

  async setSelectedSound(soundId: AlarmSoundId): Promise<void> {
    try {
      await AsyncStorage.setItem(SELECTED_SOUND_KEY, soundId);
    } catch (error) {
      console.error("Error saving selected sound:", error);
    }
  }

  async playAlarm(soundId?: AlarmSoundId) {
    if (this.isPlaying) return;

    try {
      await this.initialize();
      
      const selectedSound = soundId || await this.getSelectedSound();
      const soundFile = SOUND_FILES[selectedSound] || SOUND_FILES.morning_glory;
      
      const { sound } = await Audio.Sound.createAsync(
        soundFile,
        {
          isLooping: true,
          shouldPlay: true,
          volume: 1.0,
        }
      );
      
      this.sound = sound;
      this.isPlaying = true;
    } catch (error) {
      console.error("Error playing alarm:", error);
    }
  }

  async stopAlarm() {
    if (!this.isPlaying || !this.sound) return;

    try {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
      this.isPlaying = false;
    } catch (error) {
      console.error("Error stopping alarm:", error);
    }
  }

  async playPreview(soundId: AlarmSoundId, durationMs: number = 4000): Promise<void> {
    await this.stopPreview();

    try {
      await this.initialize();
      
      const soundFile = SOUND_FILES[soundId] || SOUND_FILES.morning_glory;
      
      const { sound: previewAudio } = await Audio.Sound.createAsync(
        soundFile,
        {
          isLooping: true,
          shouldPlay: true,
          volume: 1.0,
        }
      );
      
      this.previewSound = previewAudio;
      this.isPreviewing = true;

      setTimeout(() => {
        this.stopPreview();
      }, durationMs);
    } catch (error) {
      console.error("Error previewing sound:", error);
    }
  }

  async stopPreview(): Promise<void> {
    if (!this.previewSound) return;

    try {
      await this.previewSound.stopAsync();
      await this.previewSound.unloadAsync();
      this.previewSound = null;
      this.isPreviewing = false;
    } catch (error) {
      console.error("Error stopping preview:", error);
    }
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  getIsPreviewing() {
    return this.isPreviewing;
  }
}

export const AlarmService = new AlarmServiceClass();
