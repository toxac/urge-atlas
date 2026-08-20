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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StateMachine } from '../lib/conversation/engine/StateMachine';
import { StorageService } from '../lib/conversation/services/StorageService';

const { width } = Dimensions.get('window');
const ORB_SIZE = width * 0.5;
const RING_WIDTH = 4; // thinner ring for a modern look

type Message = {
  id: string;
  sender: 'atlas' | 'user';
  text: string;
  timestamp: string;
};

export default function App() {
  // --- State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [engineState, setEngineState] = useState<string>('IDLE');
  const [isListening, setIsListening] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [taskTitle, setTaskTitle] = useState('Why Start?');
  const [showTranscript, setShowTranscript] = useState(true);
  const [statusText, setStatusText] = useState('Tap to start');
  const [statusSubtext, setStatusSubtext] = useState('');

  // --- Animation refs ---
  const rotation1 = useRef(new Animated.Value(0)).current;
  const rotation2 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const spin1 = rotation1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const spin2 = rotation2.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  // --- Engine refs ---
  const machineRef = useRef<StateMachine | null>(null);
  const listenResolverRef = useRef<((value: string) => void) | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isProcessingRef = useRef(false);

  // --- Orb Animation ---
  useEffect(() => {
    const rotate1 = Animated.loop(
      Animated.timing(rotation1, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const rotate2 = Animated.loop(
      Animated.timing(rotation2, {
        toValue: 1,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
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
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const isActive = engineState === 'SPEAKING' || engineState === 'LISTENING' || engineState === 'PROCESSING';
    if (isActive) {
      rotate1.start();
      rotate2.start();
      pulse.start();
      glow.start();
    } else {
      rotate1.stop();
      rotate2.stop();
      pulse.stop();
      glow.stop();
      rotation1.setValue(0);
      rotation2.setValue(0);
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }

    return () => {
      rotate1.stop();
      rotate2.stop();
      pulse.stop();
      glow.stop();
    };
  }, [engineState]);

  // --- Helper: Reset App ---
  const resetApp = async () => {
    console.log('🔄 Resetting app...');
    Speech.stop();
    await StorageService.clearSession('mission1_quest1');
    console.log('🗑️ Session cleared');

    setMessages([]);
    setUserInput('');
    setEngineState('IDLE');
    setIsListening(false);
    setIsThinking(false);
    setStatusText('Starting fresh...');
    setStatusSubtext('');
    listenResolverRef.current = null;
    isProcessingRef.current = false;

    const machine = new StateMachine();
    machineRef.current = machine;

    machine.onStateChangeListener((state, data) => {
      console.log('🔔 Reset machine state:', state);
      setEngineState(state);
      switch (state) {
        case 'PROCESSING':
          setIsThinking(true);
          setStatusText('✨ Thinking...');
          setStatusSubtext('Atlas is crafting your insight');
          setIsListening(false);
          break;
        case 'LISTENING':
          setIsListening(true);
          setStatusText('🎤 Your turn');
          setStatusSubtext('Type your answer or speak');
          setIsThinking(false);
          break;
        case 'SPEAKING':
          setStatusText('🔊 Atlas is speaking');
          setStatusSubtext('');
          setIsListening(false);
          setIsThinking(false);
          break;
        case 'COMPLETE':
          setStatusText('✅ Task complete!');
          setStatusSubtext('Moving to next task...');
          setIsListening(false);
          setIsThinking(false);
          break;
        case 'IDLE':
        default:
          setStatusText('👋 Ready');
          setStatusSubtext('');
          setIsListening(false);
          setIsThinking(false);
          break;
      }
    });

    machine.initialize(
      (text) => {
        console.log('🗣️ Reset TTS:', text.substring(0, 50));
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'atlas',
            text: text,
            timestamp: new Date().toISOString(),
          },
        ]);
        Speech.speak(text, {
          language: 'en-US',
          pitch: 1.0,
          rate: 0.9,
        });
      },
      async () => {
        console.log('🎤 Reset listen callback');
        return new Promise<string>((resolve) => {
          listenResolverRef.current = resolve;
        });
      }
    );

    console.log('🚀 Starting fresh session...');
    await machine.startOrResume();
    console.log('✅ Reset complete');
  };

  // --- Init ---
  useEffect(() => {
    const init = async () => {
      try {
        await StorageService.init();
        console.log('📦 Storage initialized');

        const machine = new StateMachine();
        machineRef.current = machine;

        machine.onStateChangeListener((state, data) => {
          console.log('🔔 State change:', state);
          setEngineState(state);
          switch (state) {
            case 'PROCESSING':
              setIsThinking(true);
              setStatusText('✨ Thinking...');
              setStatusSubtext('Atlas is crafting your insight');
              setIsListening(false);
              break;
            case 'LISTENING':
              setIsListening(true);
              setStatusText('🎤 Your turn');
              setStatusSubtext('Type your answer or speak');
              setIsThinking(false);
              break;
            case 'SPEAKING':
              setStatusText('🔊 Atlas is speaking');
              setStatusSubtext('');
              setIsListening(false);
              setIsThinking(false);
              break;
            case 'COMPLETE':
              setStatusText('✅ Task complete!');
              setStatusSubtext('Moving to next task...');
              setIsListening(false);
              setIsThinking(false);
              break;
            case 'IDLE':
            default:
              setStatusText('👋 Ready');
              setStatusSubtext('');
              setIsListening(false);
              setIsThinking(false);
              break;
          }
        });

        machine.initialize(
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
            Speech.speak(text, {
              language: 'en-US',
              pitch: 1.0,
              rate: 0.9,
            });
          },
          async () => {
            return new Promise<string>((resolve) => {
              listenResolverRef.current = resolve;
            });
          }
        );

        await machine.startOrResume();
        console.log('🚀 Session started');
      } catch (error) {
        console.error('Init error:', error);
        setStatusText('❌ Error');
        setStatusSubtext(String(error));
      }
    };

    init();

    return () => {
      Speech.stop();
    };
  }, []);

  // --- Handlers ---
  const handleSendText = async () => {
    if (!userInput.trim() || isProcessingRef.current) return;

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
      isProcessingRef.current = true;
      listenResolverRef.current(transcript);
      listenResolverRef.current = null;
      setIsListening(false);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    } else {
      console.warn('⚠️ No resolver - not in listening state');
      setStatusSubtext('⚠️ Tap the orb to continue');
    }
  };

  const toggleTranscript = () => {
    setShowTranscript(!showTranscript);
  };

  // --- Orb helpers ---
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

  const getStatusLabel = () => {
    switch (engineState) {
      case 'IDLE':
        return 'Ready';
      case 'SPEAKING':
        return 'Atlas is speaking';
      case 'LISTENING':
        return 'Your turn to speak';
      case 'PROCESSING':
        return 'Atlas is thinking';
      case 'COMPLETE':
        return 'Task complete!';
      default:
        return '';
    }
  };

  const getCornerIndicator = () => {
    if (isListening) return '🎤 Your turn';
    if (isThinking) return '⏳ Thinking...';
    if (engineState === 'SPEAKING') return '🔊 Speaking';
    return '⚡';
  };

  // --- Render ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar style="light" />

      {/* Header */}
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={resetApp}
            style={{
              marginRight: 12,
              padding: 6,
              borderRadius: 20,
              backgroundColor: '#1a1a1a',
              borderWidth: 1,
              borderColor: '#333',
            }}
          >
            <Text style={{ color: '#888', fontSize: 18 }}>⟳</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>
            Urge
          </Text>
          <Text style={{ fontSize: 12, color: '#555', marginLeft: 6 }}>
            with Atlas
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              backgroundColor: isListening ? '#1a2a1a' : '#1a1a1a',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              borderWidth: isListening ? 1 : 0,
              borderColor: isListening ? '#00ff88' : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: isListening ? '#00ff88' : '#666',
                fontWeight: isListening ? '600' : '400',
              }}
            >
              {getCornerIndicator()}
            </Text>
          </View>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: getOrbColor(),
              opacity: engineState === 'IDLE' ? 0.3 : 1,
            }}
          />
          <Text style={{ fontSize: 11, color: '#666' }}>{taskTitle}</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        {/* Custom Orb – with two counter‑rotating rings and a pulsing dot */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={toggleTranscript}
          disabled={engineState === 'PROCESSING'}
          style={{
            width: ORB_SIZE,
            height: ORB_SIZE,
            borderRadius: ORB_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Glow */}
          <Animated.View
            style={{
              position: 'absolute',
              width: ORB_SIZE * 1.4,
              height: ORB_SIZE * 1.4,
              borderRadius: ORB_SIZE * 0.7,
              backgroundColor: getOrbColor(),
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.05, 0.2],
              }),
              transform: [{ scale: pulseAnim }],
            }}
          />

          {/* Background track */}
          <View
            style={{
              position: 'absolute',
              width: ORB_SIZE,
              height: ORB_SIZE,
              borderRadius: ORB_SIZE / 2,
              borderWidth: RING_WIDTH,
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          />

          {/* Rotating ring 1 (clockwise) */}
          <Animated.View
            style={{
              position: 'absolute',
              width: ORB_SIZE,
              height: ORB_SIZE,
              borderRadius: ORB_SIZE / 2,
              borderWidth: RING_WIDTH,
              borderColor: getOrbColor(),
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              transform: [{ rotate: spin1 }],
              opacity: engineState === 'IDLE' ? 0.2 : 1,
            }}
          />

          {/* Rotating ring 2 (counter‑clockwise) */}
          <Animated.View
            style={{
              position: 'absolute',
              width: ORB_SIZE * 0.8,
              height: ORB_SIZE * 0.8,
              borderRadius: ORB_SIZE * 0.4,
              borderWidth: RING_WIDTH * 0.8,
              borderColor: getOrbColor(),
              borderLeftColor: 'transparent',
              borderBottomColor: 'transparent',
              borderRightColor: 'transparent',
              transform: [{ rotate: spin2 }],
              opacity: engineState === 'IDLE' ? 0.15 : 0.8,
            }}
          />

          {/* Pulsing inner dot */}
          <Animated.View
            style={{
              width: ORB_SIZE * 0.1,
              height: ORB_SIZE * 0.1,
              borderRadius: ORB_SIZE * 0.05,
              backgroundColor: getOrbColor(),
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.08],
                outputRange: [0.6, 1],
              }),
              transform: [{ scale: pulseAnim }],
            }}
          />
        </TouchableOpacity>

        <Text style={{ marginTop: 40, fontSize: 18, fontWeight: '600', color: '#fff' }}>
          {getStatusLabel()}
        </Text>
        {statusSubtext !== '' && (
          <Text style={{ marginTop: 6, fontSize: 14, color: '#666' }}>
            {statusSubtext}
          </Text>
        )}

        {isListening && (
          <Text style={{ marginTop: 16, fontSize: 12, color: '#444' }}>
            💡 Type below or tap the orb for options
          </Text>
        )}

        {/* Media framing placeholder */}
        <TouchableOpacity
          style={{
            marginTop: 20,
            backgroundColor: '#1a1a1a',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: '#333',
          }}
          onPress={() => {
            console.log('🎬 Play framing media');
            setStatusSubtext('🎬 Playing intro...');
            setTimeout(() => setStatusSubtext(''), 2000);
          }}
        >
          <Text style={{ color: '#888', fontSize: 12 }}>▶️</Text>
          <Text style={{ color: '#888', fontSize: 12 }}>Watch intro</Text>
        </TouchableOpacity>

        {/* Start Over button */}
        <TouchableOpacity
          onPress={resetApp}
          style={{
            marginTop: 16,
            backgroundColor: '#ff4444',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#ff6666',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
            🔄 Start Over
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleTranscript} style={{ marginTop: 16 }}>
          <Text style={{ color: '#555', fontSize: 12 }}>
            {showTranscript ? '📄 Hide transcript' : '📄 Show transcript'}
          </Text>
        </TouchableOpacity>

        {showTranscript && (
          <View
            style={{
              width: '100%',
              maxHeight: 150,
              backgroundColor: '#111',
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
            }}
          >
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 && (
                <Text style={{ color: '#444', fontSize: 12, textAlign: 'center' }}>
                  Conversation will appear here
                </Text>
              )}
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: 6,
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      color: msg.sender === 'atlas' ? '#0066ff' : '#00ff88',
                      fontWeight: '700',
                      fontSize: 12,
                    }}
                  >
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
                backgroundColor: isListening ? '#1a2a1a' : '#1a1a1a',
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: '#fff',
                fontSize: 16,
                minHeight: 48,
                borderWidth: isListening ? 1 : 0,
                borderColor: isListening ? '#00ff88' : 'transparent',
              }}
              placeholder={
                isListening
                  ? '🎤 Type your answer here...'
                  : isThinking
                  ? '⏳ Atlas is thinking...'
                  : 'Waiting for Atlas...'
              }
              placeholderTextColor="#666"
              value={userInput}
              onChangeText={setUserInput}
              onSubmitEditing={handleSendText}
              editable={!isThinking}
            />
            <TouchableOpacity
              onPress={handleSendText}
              style={{
                backgroundColor:
                  isThinking ? '#333' :
                  isListening ? '#00ff88' :
                  '#0066ff',
                borderRadius: 30,
                padding: 12,
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                opacity: !userInput.trim() ? 0.5 : 1,
              }}
              disabled={isThinking || !userInput.trim()}
            >
              <Text style={{ color: isListening ? '#000' : '#fff', fontSize: 20, fontWeight: '700' }}>
                {isListening ? '✓' : '➤'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 10, color: '#444' }}>
              {isListening ? '🟢 Listening for your response' :
               isThinking ? '🟡 Processing...' :
               engineState === 'SPEAKING' ? '🔵 Atlas is speaking' :
               '⚪ Ready'}
            </Text>
            <Text style={{ fontSize: 10, color: '#333' }}>
              {messages.length > 0 ? `${messages.length} messages` : ''}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}