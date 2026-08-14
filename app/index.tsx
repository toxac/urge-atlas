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
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [engineState, setEngineState] = useState<string>('IDLE');
  const [isListening, setIsListening] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [taskTitle, setTaskTitle] = useState('Why Start?');
  const [showTranscript, setShowTranscript] = useState(false);
  const [statusText, setStatusText] = useState('Tap to start');
  const [debugInfo, setDebugInfo] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

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
          console.log('🔔 State change:', state, data);
          setEngineState(state);
          setDebugInfo(`State: ${state} | Node: ${machineRef.current?.['currentNodeIndex'] || 0}`);
          
          if (state === 'PROCESSING') {
            setIsThinking(true);
            setStatusText('Thinking...');
          } else {
            setIsThinking(false);
          }
          if (state === 'LISTENING') {
            setIsListening(true);
            setStatusText('Listening...');
            console.log('🎧 LISTENING - resolver should be set');
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
          (text) => {
            console.log('🗣️ TTS speaking:', text.substring(0, 50) + '...');
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
                console.log('🔊 TTS finished');
                // Don't change status here - the state machine will handle it
              },
            });
          },
          async () => {
            console.log('🎤 onListen called - creating promise');
            setIsListening(true);
            setStatusText('Listening...');
            return new Promise<string>((resolve) => {
              console.log('📌 Storing resolver');
              listenResolverRef.current = resolve;
            });
          }
        );

        await machine.startOrResume();
        setStatusText('Speaking...');
      } catch (error) {
        console.error('Init error:', error);
        setStatusText('Error initializing');
        setDebugInfo(String(error));
      }
    };

    init();

    return () => {
      Speech.stop();
    };
  }, []);

  // --- Handle Send ---
  const handleSendText = async () => {
    if (!userInput.trim()) return;
    
    const transcript = userInput.trim();
    console.log('✏️ User typed:', transcript);
    console.log('🔍 Resolver exists?', !!listenResolverRef.current);
    
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

    // Check if resolver exists
    if (listenResolverRef.current) {
      console.log('✅ Resolving promise with transcript');
      listenResolverRef.current(transcript);
      listenResolverRef.current = null;
      setIsListening(false);
    } else {
      console.warn('⚠️ No resolver found! Did the state machine call onListen?');
      setDebugInfo('⚠️ No resolver - tap "Force Advance"');
    }
  };

  // --- Force Advance (Emergency) ---
  const forceAdvance = () => {
    console.log('🦺 Force advancing...');
    if (listenResolverRef.current) {
      listenResolverRef.current('[FORCED] User tapped skip');
      listenResolverRef.current = null;
      setIsListening(false);
    } else {
      // Try to manually advance the state machine
      console.warn('No resolver to advance');
    }
  };

  const toggleTranscript = () => {
    setShowTranscript(!showTranscript);
  };

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

      {/* Main Content */}
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
            {engineState === 'IDLE' ? '👋' : 
             engineState === 'SPEAKING' ? '🔊' : 
             engineState === 'LISTENING' ? '🎤' : 
             engineState === 'PROCESSING' ? '⏳' : '✓'}
          </Text>
        </TouchableOpacity>

        {/* Status Text */}
        <Text style={{ marginTop: 20, fontSize: 14, color: '#888', textAlign: 'center' }}>
          {statusText}
        </Text>

        {/* Debug Info */}
        <Text style={{ marginTop: 8, fontSize: 10, color: '#444', textAlign: 'center' }}>
          {debugInfo}
        </Text>

        {/* Force Advance Button (Debug) */}
        {isListening && (
          <TouchableOpacity
            onPress={forceAdvance}
            style={{
              marginTop: 12,
              backgroundColor: '#ff4444',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
              ⚠️ Force Advance
            </Text>
          </TouchableOpacity>
        )}

        {/* Toggle Transcript */}
        <TouchableOpacity onPress={toggleTranscript} style={{ marginTop: 16 }}>
          <Text style={{ color: '#555', fontSize: 12 }}>
            {showTranscript ? 'Hide transcript' : 'Show transcript'}
          </Text>
        </TouchableOpacity>

        {/* Transcript Panel */}
        {showTranscript && (
          <View
            style={{
              width: '100%',
              maxHeight: 150,
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