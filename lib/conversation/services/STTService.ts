// lib/conversation/services/STTService.ts
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

let isListeningActive = false;

export const STTService = {
  async requestPermissions(): Promise<boolean> {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return result.granted;
    } catch (err) {
      console.warn('STT Permission error:', err);
      return false;
    }
  },

  async startListening(
    onFinalResult: (text: string) => void,
    onError?: (err: string) => void
  ): Promise<boolean> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      onError?.('Microphone permission not granted');
      return false;
    }

    // Clean up active session if running
    this.stopListening();

    try {
      // Clear previous event subscriptions
      ExpoSpeechRecognitionModule.removeAllListeners('result');
      ExpoSpeechRecognitionModule.removeAllListeners('error');
      ExpoSpeechRecognitionModule.removeAllListeners('end');

      // 1. Result Listener (type casted to handle native result variants safely)
      ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
        const resultItem = event.results?.[0];
        const transcript = resultItem?.transcript || event.transcript || '';
        const isFinal = event.isFinal ?? resultItem?.isFinal ?? true;

        // Trigger callback when final utterance is recognized
        if (isFinal && transcript.trim()) {
          onFinalResult(transcript.trim());
        }
      });

      // 2. Error Listener
      ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
        console.warn('STT Native Error:', event.error);
        isListeningActive = false;
        onError?.(event.error || 'Speech recognition error');
      });

      // 3. End Listener
      ExpoSpeechRecognitionModule.addListener('end', () => {
        isListeningActive = false;
      });

      // Start recognition (single utterance mode)
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        requiresOnDeviceRecognition: false,
      });

      isListeningActive = true;
      return true;
    } catch (error: any) {
      console.error('Failed to start STT:', error);
      isListeningActive = false;
      onError?.(error?.message || 'Failed to start STT');
      return false;
    }
  },

  stopListening() {
    try {
      if (isListeningActive) {
        ExpoSpeechRecognitionModule.stop();
        isListeningActive = false;
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  },
};