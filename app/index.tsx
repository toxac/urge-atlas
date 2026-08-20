import { useMachine } from '@xstate/react';
import * as Speech from 'expo-speech';
import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VoiceOrb } from '../components/VoiceOrb';
import { adaptiveConversationMachine } from '../lib/conversation/engine/XStateMachine';
import { VoiceRecorder } from '../lib/conversation/services/VoiceRecorder';

export default function HomeScreen() {
  const [snapshot, send] = useMachine(adaptiveConversationMachine);
  const [inputText, setInputText] = React.useState('');

  const currentState = snapshot.value as any;

  // Auto-speak instructions when state transitions
  useEffect(() => {
  if (snapshot.matches('speakingPrompt')) {
    Speech.speak(snapshot.context.atlasResponse, {
      onDone: () => send({ type: 'SPEECH_FINISHED' }),
    });
  }
}, [snapshot.value]);

  const handleOrbPress = async () => {
    if (snapshot.matches('idle')) {
      send({ type: 'START' });
    } else if (snapshot.matches('listening')) {
      // Toggle recording
      await VoiceRecorder.startRecording();
    }
  };

  const handleTextSubmit = () => {
    if (!inputText.trim()) return;
    send({ type: 'SUBMIT_INPUT', text: inputText });
    setInputText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Urge</Text>
        <Text style={styles.subtitle}>{snapshot.context.task.title}</Text>
      </View>

      {/* Center Interactive Visualizer */}
      <View style={styles.orbContainer}>
        <TouchableOpacity onPress={handleOrbPress} activeOpacity={0.8}>
          <VoiceOrb state={currentState} size={180} />
        </TouchableOpacity>
        <Text style={styles.statusText}>
          {snapshot.matches('explainingTask') && 'Atlas is setting the stage...'}
          {snapshot.matches('listening') && 'Listening... Tap orb or type below'}
          {snapshot.matches('evaluatingInput') && 'Synthesizing key insight...'}
          {snapshot.matches('speakingFeedback') && 'Atlas'}
          {snapshot.matches('completed') && 'Task Complete!'}
          {snapshot.matches('idle') && 'Tap Orb to Begin'}
        </Text>
      </View>

      {/* Text Input / Speech Fallback */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your response..."
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleTextSubmit}
            editable={snapshot.matches('listening')}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { opacity: snapshot.matches('listening') ? 1 : 0.4 },
            ]}
            onPress={handleTextSubmit}
            disabled={!snapshot.matches('listening')}
          >
            <Text style={styles.sendButtonText}>➔</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { padding: 20, alignItems: 'center' },
  title: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#888', fontSize: 14, marginTop: 4 },
  orbContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusText: { color: '#AAA', fontSize: 16, marginTop: 32, fontWeight: '500' },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#1E1E1E',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#0066FF',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});