// app/index.tsx

import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { StateMachine } from '../lib/conversation/engine/StateMachine';
import { StorageService } from '../lib/conversation/services/StorageService';

const { width } = Dimensions.get('window');
const ORB_SIZE = width * 0.5;

type Message = {
  id: string;
  sender: 'atlas' | 'user';
  text: string;
  timestamp: string;
};

export default function App() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [engineState, setEngineState] = useState<string>('IDLE');
  const [isListening, setIsListening] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [taskTitle, setTaskTitle] = useState('Why Start?');
  const [showTranscript, setShowTranscript] = useState(false);
  const [statusText, setStatusText] = useState('Tap to start');

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Refs
  const machineRef = useRef<StateMachine | null>(null);
  const listenResolverRef = useRef<((value: string) => void) | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // --- Animation Effects ---
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (engineState === 'SPEAKING' || engineState === 'LISTENING') {
      pulse.start();
      glow.start();
    } else {
      pulse.stop();
      glow.stop();
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }

    return () => {
      pulse.stop();
      glow.stop();
    };
  }, [engineState]);

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      try {
        await StorageService.init();
        const machine = new StateMachine();
        machineRef.current = machine;

        machine.onStateChangeListener((state, data) => {
          setEngineState(state);
          if (state === 'PROCESSING') {
            setIsThinking(true);
            setStatusText('Thinking...');
          } else {
            setIsThinking(false);
          }
          if (state === 'LISTENING') {
            setIsListening(true);
            setStatusText('Listening...');
          } else {
            setIsListening(false);
          }
          if (state === 'COMPLETE') {
            setStatusText('Task complete! 🎉');
          }
          if (state === 'IDLE') {
            setStatusText('Idle');
          }
        });

        machine.initialize(
          // Speak callback
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
            setStatusText('Speaking...');
            Speech.speak(text, {
              language: 'en-US',
              pitch: 1.0,
              rate: 0.9,
              onDone: () => {
                setStatusText('Listening...');
              },
            });
          },
          // Listen callback
          async () => {
            setIsListening(true);
            setStatusText('Listening...');
            return new Promise<string>((resolve) => {
              listenResolverRef.current = resolve;
            });
          }
        );

        await machine.startOrResume();
        setStatusText('Speaking...');
      } catch (error) {
        console.error('Init error:', error);
        setStatusText('Error initializing');
      }
    };

    init();

    return () => {
      Speech.stop();
    };
  }, []);

  // --- Handlers ---
  const handleSendText = async () => {
    if (!userInput.trim()) return;
    const transcript = userInput.trim();
    setUserInput('');

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'user',
        text: transcript,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (listenResolverRef.current) {
      listenResolverRef.current(transcript);
      listenResolverRef.current = null;
    }
    setIsListening(false);
  };

  const toggleTranscript = () => {
    setShowTranscript(!showTranscript);
  };

  // --- Orb Color ---
  const getOrbColor = () => {
    switch (engineState) {
      case 'SPEAKING':
        return '#0066ff';
      case 'LISTENING':
        return '#00ff88';
      case 'PROCESSING':
        return '#ffaa00';
      case 'COMPLETE':
        return '#00ccff';
      default:
        return '#444';
    }
  };

  // --- Render ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar style="light" />

      {/* Minimal Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>
          ⚔️ Atlas
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: getOrbColor(),
            }}
          />
          <Text style={{ fontSize: 11, color: '#666' }}>{taskTitle}</Text>
        </View>
      </View>

      {/* Main Content - Centered Orb */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        {/* Orb */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={toggleTranscript}
          disabled={engineState === 'PROCESSING'}
          style={{
            width: ORB_SIZE,
            height: ORB_SIZE,
            borderRadius: ORB_SIZE / 2,
            backgroundColor: getOrbColor(),
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: getOrbColor(),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.9],
            }),
            shadowRadius: 30,
            elevation: 10,
          }}
        >
          <Animated.View
            style={{
              width: ORB_SIZE,
              height: ORB_SIZE,
              borderRadius: ORB_SIZE / 2,
              transform: [{ scale: pulseAnim }],
              backgroundColor: getOrbColor(),
              opacity: 0.3,
              position: 'absolute',
            }}
          />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
            {engineState === 'IDLE' ? '👋' : engineState === 'SPEAKING' ? '🔊' : engineState === 'LISTENING' ? '🎤' : engineState === 'PROCESSING' ? '⏳' : '✓'}
          </Text>
        </TouchableOpacity>

        {/* Status Text */}
        <Text style={{ marginTop: 20, fontSize: 14, color: '#888', textAlign: 'center' }}>
          {statusText}
        </Text>

        {/* Toggle Transcript Button */}
        <TouchableOpacity
          onPress={toggleTranscript}
          style={{ marginTop: 16 }}
        >
          <Text style={{ color: '#555', fontSize: 12 }}>
            {showTranscript ? 'Hide transcript' : 'Show transcript'}
          </Text>
        </TouchableOpacity>

        {/* Transcript Panel (Collapsible) */}
        {showTranscript && (
          <View
            style={{
              width: '100%',
              maxHeight: 200,
              backgroundColor: '#111',
              borderRadius: 12,
              padding: 12,
              marginTop: 16,
            }}
          >
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 && (
                <Text style={{ color: '#444', fontSize: 12, textAlign: 'center' }}>
                  No conversation yet...
                </Text>
              )}
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: 8,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: msg.sender === 'atlas' ? '#0066ff' : '#00ff88', fontWeight: '700' }}>
                    {msg.sender === 'atlas' ? 'A:' : 'Y:'}
                  </Text>
                  <Text style={{ color: '#ccc', fontSize: 13, flex: 1 }}>
                    {msg.text}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Input Area (hidden behind a tap to reveal) */}
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
              placeholder="Type your answer..."
              placeholderTextColor="#666"
              value={userInput}
              onChangeText={setUserInput}
              onSubmitEditing={handleSendText}
              editable={!isThinking}
            />
            <TouchableOpacity
              onPress={handleSendText}
              style={{
                backgroundColor: isThinking ? '#333' : '#0066ff',
                borderRadius: 30,
                padding: 12,
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
              }}
              disabled={isThinking || !userInput.trim()}
            >
              <Text style={{ color: '#fff', fontSize: 20 }}>
                {isListening ? '✓' : '➤'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 20,
                paddingVertical: 6,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: '#333',
                opacity: 0.6,
              }}
              onPress={() => console.log('🎤 Voice input requires dev build')}
            >
              <Text style={{ color: '#666', fontSize: 11 }}>
                🎤 Voice input (dev build)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}