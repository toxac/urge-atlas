// app/index.tsx

import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { StateMachine } from './conversation/engine/StateMachine';
import { StorageService } from './conversation/services/StorageService';

type Message = {
  id: string;
  sender: 'atlas' | 'user';
  text: string;
  timestamp: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'atlas',
      text: "I'm Atlas, your startup co-pilot. Let's begin your journey.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [engineState, setEngineState] = useState<string>('IDLE');
  const [isListening, setIsListening] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [taskTitle, setTaskTitle] = useState('Why Start?');

  const machineRef = useRef<StateMachine | null>(null);
  const listenResolverRef = useRef<((value: string) => void) | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize the app
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize SQLite
        await StorageService.init();
        console.log('📦 Storage initialized');

        // Create state machine
        const machine = new StateMachine();
        machineRef.current = machine;

        // Listen to state changes
        machine.onStateChangeListener((state, data) => {
          setEngineState(state);
          if (state === 'PROCESSING') {
            setIsThinking(true);
          } else {
            setIsThinking(false);
          }
          if (state === 'LISTENING') {
            setIsListening(true);
          } else {
            setIsListening(false);
          }
          if (state === 'COMPLETE') {
            // Task complete!
            console.log('🎉 Task complete:', data);
          }
        });

        // Initialize with callbacks
        machine.initialize(
          // Speak callback - handles TTS and UI
          (text) => {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                sender: 'atlas',
                text: text,
                timestamp: new Date().toISOString(),
              },
            ]);

            // Speak aloud using TTS
            Speech.speak(text, {
              language: 'en-US',
              pitch: 1.0,
              rate: 0.9,
              onDone: () => {
                console.log('🔊 TTS finished');
              },
            });
          },

          // Listen callback - returns a promise that resolves with transcript
          async () => {
            setIsListening(true);
            return new Promise<string>((resolve) => {
              listenResolverRef.current = resolve;
            });
          }
        );

        // Start the conversation
        await machine.startOrResume();
        console.log('🚀 Session started');
      } catch (error) {
        console.error('❌ Init error:', error);
      }
    };

    init();

    // Cleanup TTS on unmount
    return () => {
      Speech.stop();
    };
  }, []);

  // Handle sending text input (Expo Go fallback)
  const handleSendText = async () => {
    if (!userInput.trim()) return;

    const transcript = userInput.trim();
    setUserInput('');

    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'user',
        text: transcript,
        timestamp: new Date().toISOString(),
      },
    ]);

    setIsListening(false);

    // Resolve the pending listen promise
    if (listenResolverRef.current) {
      listenResolverRef.current(transcript);
      listenResolverRef.current = null;
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Get state display color
  const getStateColor = () => {
    switch (engineState) {
      case 'LISTENING':
        return '#00ff88';
      case 'PROCESSING':
        return '#ffaa00';
      case 'COMPLETE':
        return '#00ccff';
      default:
        return '#888';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#1a1a1a',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff' }}>
            ⚔️ Atlas
          </Text>
          <Text
            style={{
              marginLeft: 12,
              fontSize: 12,
              color: '#666',
              backgroundColor: '#1a1a1a',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            {taskTitle}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#1a1a1a',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: getStateColor(),
            }}
          />
          <Text style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>
            {engineState}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingVertical: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={{
              alignSelf: msg.sender === 'atlas' ? 'flex-start' : 'flex-end',
              backgroundColor: msg.sender === 'atlas' ? '#1a1a1a' : '#0066ff',
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
              maxWidth: '85%',
            }}
          >
            <Text
              style={{
                color: msg.sender === 'atlas' ? '#e0e0e0' : '#fff',
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              {msg.text}
            </Text>
            <Text
              style={{
                color: msg.sender === 'atlas' ? '#555' : 'rgba(255,255,255,0.6)',
                fontSize: 10,
                marginTop: 6,
              }}
            >
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#888" />
              <Text style={{ color: '#888', fontSize: 14 }}>Atlas is thinking...</Text>
            </View>
          </View>
        )}

        {/* Listening indicator */}
        {isListening && (
          <View
            style={{
              alignSelf: 'flex-end',
              backgroundColor: '#0044cc',
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#00ff88',
                }}
              />
              <Text style={{ color: '#fff', fontSize: 14 }}>Listening...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: '#1a1a1a',
            backgroundColor: '#0a0a0a',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: '#1a1a1a',
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: '#fff',
                fontSize: 16,
                minHeight: 48,
              }}
              placeholder="Type your answer (Expo Go fallback)..."
              placeholderTextColor="#666"
              value={userInput}
              onChangeText={setUserInput}
              onSubmitEditing={handleSendText}
              editable={!isThinking && !isListening}
              multiline
              numberOfLines={1}
            />
            <TouchableOpacity
              onPress={handleSendText}
              style={{
                backgroundColor: isThinking || isListening ? '#333' : '#0066ff',
                borderRadius: 30,
                padding: 12,
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                opacity: isThinking || isListening ? 0.5 : 1,
              }}
              disabled={isThinking || isListening || !userInput.trim()}
            >
              <Text style={{ color: '#fff', fontSize: 20 }}>➤</Text>
            </TouchableOpacity>
          </View>

          {/* Voice button placeholder */}
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 20,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: '#333',
                opacity: 0.6,
              }}
              onPress={() => {
                console.log('🎤 Voice recording not available in Expo Go');
              }}
            >
              <Text style={{ color: '#666', fontSize: 12 }}>
                🎤 Voice input requires development build
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}