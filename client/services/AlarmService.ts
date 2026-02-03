import { Audio } from "expo-av";

class AlarmServiceClass {
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;

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

  async playAlarm() {
    if (this.isPlaying) return;

    try {
      await this.initialize();
      
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/alarm.mp3"),
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

  getIsPlaying() {
    return this.isPlaying;
  }
}

export const AlarmService = new AlarmServiceClass();
