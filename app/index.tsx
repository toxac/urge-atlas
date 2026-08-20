import { useMachine } from '@xstate/react';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
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
import { STTService } from '../lib/conversation/services/STTService';

export default function Index() {
  const [snapshot, send] = useMachine(adaptiveConversationMachine);
  const [inputText, setInputText] = useState('');
  const [isSTTActive, setIsSTTActive] = useState(false);

  const { currentQuest, currentTask, taskIndex, atlasResponse } = snapshot.context;
  const totalTasks = currentQuest.tasks.length;

  // --- 1. Text-To-Speech (Atlas Speaking) ---
  useEffect(() => {
    if (
      snapshot.matches('speakingPrompt') ||
      snapshot.matches('speakingFeedback') ||
      snapshot.matches('questCompleted')
    ) {
      Speech.stop();
      Speech.speak(atlasResponse, {
        onDone: () => send({ type: 'SPEECH_FINISHED' }),
        onError: () => send({ type: 'SPEECH_FINISHED' }),
      });
    }
  }, [snapshot.value, atlasResponse]);

  // --- 2. On-Device Speech-To-Text (User Listening) ---
  useEffect(() => {
    if (snapshot.matches('listening')) {
      setIsSTTActive(true);
      
      STTService.startListening((transcript) => {
        if (transcript.trim()) {
          setInputText(transcript);
          // Automatically submit final speech transcription to state machine
          send({ type: 'SUBMIT_INPUT', text: transcript.trim() });
          STTService.stopListening();
          setIsSTTActive(false);
          setInputText('');
        }
      });
    } else {
      STTService.stopListening();
      setIsSTTActive(false);
    }

    return () => {
      STTService.stopListening();
    };
  }, [snapshot.value]);

  // --- 3. Handlers ---
  const handleRestartDemo = () => {
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
      // Toggle or manually re-trigger listening mode
      if (!isSTTActive) {
        setIsSTTActive(true);
        await STTService.startListening((transcript) => {
          if (transcript.trim()) {
            send({ type: 'SUBMIT_INPUT', text: transcript.trim() });
            STTService.stopListening();
            setIsSTTActive(false);
            setInputText('');
          }
        });
      } else {
        STTService.stopListening();
        setIsSTTActive(false);
      }
    } else if (snapshot.matches('taskCompleted')) {
      send({ type: 'NEXT_TASK' });
    }
  };

  const handleTextSubmit = () => {
    if (!inputText.trim()) return;
    STTService.stopListening();
    setIsSTTActive(false);
    send({ type: 'SUBMIT_INPUT', text: inputText.trim() });
    setInputText('');
  };

  const getOrbState = () => {
    if (
      snapshot.matches('speakingPrompt') ||
      snapshot.matches('speakingFeedback') ||
      snapshot.matches('questCompleted')
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
          <Text style={styles.badgeText}>QUEST 1 DEMO</Text>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleRestartDemo}>
          <Text style={styles.resetButtonText}>⟳ Restart Demo</Text>
        </TouchableOpacity>
      </View>

      {/* Quest & Progress Header */}
      <View style={styles.header}>
        <Text style={styles.questTitle}>{currentQuest.title}</Text>
        <Text style={styles.taskTitle}>{currentTask.title}</Text>

        {/* Task Progress Dots */}
        <View style={styles.progressRow}>
          {currentQuest.tasks.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.progressDot,
                idx === taskIndex && styles.progressDotActive,
                idx < taskIndex && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressText}>Task {taskIndex + 1} of {totalTasks}</Text>
      </View>

      {/* Main Interactive Voice Orb */}
      <View style={styles.orbContainer}>
        <TouchableOpacity onPress={handleOrbPress} activeOpacity={0.85}>
          <VoiceOrb state={getOrbState()} size={170} />
        </TouchableOpacity>

        <Text style={styles.statusText}>
          {snapshot.matches('idle') && 'Tap Orb to Start Quest 1'}
          {(snapshot.matches('speakingPrompt') || snapshot.matches('speakingFeedback')) && 'Atlas is speaking...'}
          {snapshot.matches('listening') && (isSTTActive ? '🎙️ Listening... Speak or type below' : 'Tap orb to speak')}
          {snapshot.matches('processingTurn') && 'Analyzing response...'}
          {snapshot.matches('taskCompleted') && '🎉 Task Complete! Tap orb for Next Task'}
          {snapshot.matches('questCompleted') && '🏆 Quest 1 Completed! You unlocked the Pathfinder Badge.'}
        </Text>
      </View>

      {/* Conversation Card / Atlas Response Display */}
      <View style={styles.responseContainer}>
        <Text style={styles.responseText}>"{atlasResponse}"</Text>
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
                ? '🎤 Speak or type your response here...'
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
  header: { paddingHorizontal: 20, paddingTop: 12, alignItems: 'center' },
  questTitle: { color: '#888', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  taskTitle: { color: '#FFF', fontSize: 22, fontWeight: '700', marginTop: 2 },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  progressDot: { width: 28, height: 4, borderRadius: 2, backgroundColor: '#222' },
  progressDotActive: { backgroundColor: '#0066FF' },
  progressDotCompleted: { backgroundColor: '#00FF88' },
  progressText: { color: '#555', fontSize: 11, marginTop: 4 },
  orbContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusText: { color: '#AAA', fontSize: 15, marginTop: 24, fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },
  responseContainer: { paddingHorizontal: 28, paddingVertical: 10, alignItems: 'center' },
  responseText: { color: '#DDD', fontSize: 14, textAlign: 'center', fontStyle: 'italic', lineHeight: 20 },
  inputContainer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderColor: '#1E1E1E', backgroundColor: '#0A0A0A' },
  textInput: { flex: 1, backgroundColor: '#161616', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, color: '#FFF', fontSize: 16 },
  textInputActive: { borderWidth: 1, borderColor: '#00FF88' },
  sendButton: { backgroundColor: '#0066FF', borderRadius: 24, width: 48, height: 48, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  sendButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});