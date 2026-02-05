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
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly AUTO_STOP_DURATION_MS = 2 * 60 * 1000; // 2 minutes

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
    // Prevent multiple instances - stop any existing sound first
    if (this.isPlaying) {
      console.log("[AlarmService] Already playing, stopping existing sound first");
      await this.stopAlarm();
    }

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
      
      // Set auto-stop timer (2 minutes) as safety net
      this.clearAutoStopTimer();
      this.autoStopTimer = setTimeout(async () => {
        console.log("[AlarmService] Auto-stopping after 2 minutes");
        await this.stopAlarm();
      }, this.AUTO_STOP_DURATION_MS);
      
      console.log("[AlarmService] Alarm started playing");
    } catch (error) {
      console.error("Error playing alarm:", error);
      this.isPlaying = false;
    }
  }
  
  private clearAutoStopTimer() {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
  }

  async stopAlarm() {
    // Clear auto-stop timer first
    this.clearAutoStopTimer();
    
    if (!this.sound) {
      this.isPlaying = false;
      return;
    }

    try {
      console.log("[AlarmService] Stopping alarm");
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
      this.isPlaying = false;
      console.log("[AlarmService] Alarm stopped successfully");
    } catch (error) {
      console.error("Error stopping alarm:", error);
      // Force cleanup even on error
      this.sound = null;
      this.isPlaying = false;
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
