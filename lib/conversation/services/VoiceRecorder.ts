import axios from 'axios';
import { Audio } from 'expo-av';

let recordingInstance: Audio.Recording | null = null;

export const VoiceRecorder = {
  async startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingInstance = recording;
      return true;
    } catch (err) {
      console.error('Failed to start recording', err);
      return false;
    }
  },

  async stopAndTranscribe(): Promise<string> {
    if (!recordingInstance) return '';

    try {
      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();
      recordingInstance = null;

      if (!uri) return '';

      // Upload uri file to Whisper API endpoint for zero-native-dependency STT
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'speech.m4a',
      } as any);
      formData.append('model', 'whisper-1');

      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data.text || '';
    } catch (error) {
      console.error('Transcription error:', error);
      return '';
    }
  },
};