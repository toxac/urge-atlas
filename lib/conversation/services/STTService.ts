// lib/conversation/services/STTService.ts
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

export const STTService = {
  async requestPermissions(): Promise<boolean> {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  },

  async startListening(onResult: (text: string) => void): Promise<boolean> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return false;

    // Remove any existing listeners
    ExpoSpeechRecognitionModule.removeAllListeners('result');

    // Subscribe to live transcription results
    ExpoSpeechRecognitionModule.addListener('result', (event) => {
      const transcript = event.results[0]?.transcript || '';
      if (transcript.trim()) {
        onResult(transcript);
      }
    });

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
    });

    return true;
  },

  stopListening() {
    ExpoSpeechRecognitionModule.stop();
  },
};