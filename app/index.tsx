import { useMachine } from '@xstate/react';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VoiceOrb } from '../components/VoiceOrb';
import { task1MotivationMachine } from '../lib/conversation/engine/XStateMachine';
import { STTService } from '../lib/conversation/services/STTService';

const QUESTION_TITLES = [
  '1. Running From (Push)',
  '2. Running Toward (Pull)',
  '3. Why Start Now (Urgency)',
  '4. Founder Manifesto',
];

export default function Index() {
  const [snapshot, send] = useMachine(task1MotivationMachine);
  const [inputText, setInputText] = useState('');
  const [isSTTActive, setIsSTTActive] = useState(false);
  
  // Typed safely using ReturnType<typeof setTimeout>
  const sttTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { stepIndex, atlasResponse, formData } = snapshot.context;

  // --- 1. Text-To-Speech (Atlas Speaking) ---
  useEffect(() => {
    if (
      snapshot.matches('speakingPrompt') ||
      snapshot.matches('speakingFeedback') ||
      snapshot.matches('taskCompleted')
    ) {
      STTService.stopListening();
      setIsSTTActive(false);
      Speech.stop();

      Speech.speak(atlasResponse, {
        onDone: () => send({ type: 'SPEECH_FINISHED' }),
        onError: () => send({ type: 'SPEECH_FINISHED' }),
      });
    }
  }, [snapshot.value, atlasResponse]);

  // --- 2. On-Device Speech-To-Text (User Listening with Hardware Delay) ---
  useEffect(() => {
    if (snapshot.matches('listening')) {
      if (sttTimeoutRef.current) clearTimeout(sttTimeoutRef.current);

      Speech.stop();

      // 350ms Hardware Delay: Allows audio channel to switch from speaker to mic
      sttTimeoutRef.current = setTimeout(async () => {
        setIsSTTActive(true);

        await STTService.startListening(
          (finalTranscript) => {
            if (finalTranscript.trim()) {
              setInputText(finalTranscript);
              send({ type: 'SUBMIT_INPUT', text: finalTranscript.trim() });
              STTService.stopListening();
              setIsSTTActive(false);
              setInputText('');
            }
          },
          (err) => {
            console.warn('STT Listening Error/Timeout:', err);
            setIsSTTActive(false);
          }
        );
      }, 350);
    } else {
      if (sttTimeoutRef.current) clearTimeout(sttTimeoutRef.current);
      STTService.stopListening();
      setIsSTTActive(false);
    }

    return () => {
      if (sttTimeoutRef.current) clearTimeout(sttTimeoutRef.current);
      STTService.stopListening();
    };
  }, [snapshot.value]);

  // --- 3. Handlers ---
  const handleRestartDemo = () => {
    if (sttTimeoutRef.current) clearTimeout(sttTimeoutRef.current);
    Speech.stop();
    STTService.stopListening();
    setIsSTTActive(false);
    send({ type: 'RESET' });
    setInputText('');
  };

  const handleOrbPress = async () => {
    if (snapshot.matches('idle')) {
      send({ type: 'START' });
    } else if (snapshot.matches('listening')) {
      Speech.stop();
      setIsSTTActive(true);
      await STTService.startListening(
        (finalTranscript) => {
          if (finalTranscript.trim()) {
            send({ type: 'SUBMIT_INPUT', text: finalTranscript.trim() });
            STTService.stopListening();
            setIsSTTActive(false);
            setInputText('');
          }
        },
        () => setIsSTTActive(false)
      );
    }
  };

  const handleTextSubmit = () => {
    if (!inputText.trim()) return;
    if (sttTimeoutRef.current) clearTimeout(sttTimeoutRef.current);
    STTService.stopListening();
    setIsSTTActive(false);
    send({ type: 'SUBMIT_INPUT', text: inputText.trim() });
    setInputText('');
  };

  const getOrbState = () => {
    if (
      snapshot.matches('speakingPrompt') ||
      snapshot.matches('speakingFeedback') ||
      snapshot.matches('taskCompleted')
    ) {
      return 'speakingFeedback';
    }
    if (snapshot.matches('listening')) return 'listening';
    if (snapshot.matches('processingTurn')) return 'evaluatingInput';
    return 'idle';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>TASK 1: MOTIVATION FORM</Text>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleRestartDemo}>
          <Text style={styles.resetButtonText}>⟳ Restart</Text>
        </TouchableOpacity>
      </View>

      {/* 4-Step Progress Header */}
      <View style={styles.header}>
        <Text style={styles.questTitle}>Task 1.1: Why Start?</Text>
        <Text style={styles.taskTitle}>{QUESTION_TITLES[stepIndex]}</Text>

        <View style={styles.progressRow}>
          {[0, 1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={[
                styles.progressDot,
                idx === stepIndex && styles.progressDotActive,
                idx < stepIndex && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Main Interactive Voice Orb */}
      <View style={styles.orbContainer}>
        <TouchableOpacity onPress={handleOrbPress} activeOpacity={0.85}>
          <VoiceOrb state={getOrbState()} size={150} />
        </TouchableOpacity>

        <Text style={styles.statusText}>
          {snapshot.matches('idle') && 'Tap Orb to Start Motivation Assessment'}
          {(snapshot.matches('speakingPrompt') || snapshot.matches('speakingFeedback')) && 'Atlas is speaking...'}
          {snapshot.matches('listening') && (isSTTActive ? '🎙️ Listening... Speak or type below' : 'Tap orb to speak')}
          {snapshot.matches('processingTurn') && 'Extracting motivation schema...'}
          {snapshot.matches('taskCompleted') && '🏆 Motivation Dossier Completed!'}
        </Text>
      </View>

      {/* Atlas Response Display Box */}
      <View style={styles.responseContainer}>
        <Text style={styles.responseText}>"{atlasResponse}"</Text>
      </View>

      {/* Live Form Payload Inspector */}
      <View style={styles.inspectorContainer}>
        <Text style={styles.inspectorTitle}>LIVE FORM DATASCHEMA PAYLOAD:</Text>
        <ScrollView style={styles.inspectorBox} nestedScrollEnabled>
          <Text style={styles.jsonText}>{JSON.stringify(formData, null, 2)}</Text>
        </ScrollView>
      </View>

      {/* Text Fallback Input Container */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.textInput,
              snapshot.matches('listening') && styles.textInputActive,
            ]}
            placeholder={
              snapshot.matches('listening')
                ? '🎤 Speak or type your answer...'
                : 'Waiting for Atlas...'
            }
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleTextSubmit}
            editable={snapshot.matches('listening')}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { opacity: snapshot.matches('listening') && inputText.trim() ? 1 : 0.4 },
            ]}
            onPress={handleTextSubmit}
            disabled={!snapshot.matches('listening') || !inputText.trim()}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  badgeContainer: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: '#00FF88', fontSize: 11, fontWeight: '700' },
  resetButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  resetButtonText: { color: '#FF453A', fontSize: 12, fontWeight: '600' },
  header: { paddingHorizontal: 20, paddingTop: 10, alignItems: 'center' },
  questTitle: { color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  taskTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 2 },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  progressDot: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#222' },
  progressDotActive: { backgroundColor: '#0066FF' },
  progressDotCompleted: { backgroundColor: '#00FF88' },
  orbContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusText: { color: '#AAA', fontSize: 14, marginTop: 16, fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },
  responseContainer: { paddingHorizontal: 24, paddingVertical: 8, alignItems: 'center' },
  responseText: { color: '#DDD', fontSize: 13, textAlign: 'center', fontStyle: 'italic', lineHeight: 18 },
  inspectorContainer: { paddingHorizontal: 20, marginBottom: 8 },
  inspectorTitle: { color: '#666', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  inspectorBox: { maxHeight: 75, backgroundColor: '#111', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#222' },
  jsonText: { color: '#00FF88', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  inputContainer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderColor: '#1E1E1E', backgroundColor: '#0A0A0A' },
  textInput: { flex: 1, backgroundColor: '#161616', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, color: '#FFF', fontSize: 15 },
  textInputActive: { borderWidth: 1, borderColor: '#00FF88' },
  sendButton: { backgroundColor: '#0066FF', borderRadius: 24, width: 48, height: 48, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  sendButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});