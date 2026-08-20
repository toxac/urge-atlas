import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface VoiceOrbProps {
  state: 'idle' | 'explainingTask' | 'listening' | 'evaluatingInput' | 'speakingFeedback';
  size?: number;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state, size = 180 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    let scaleLoop: Animated.CompositeAnimation | null = null;
    let pulseLoop: Animated.CompositeAnimation | null = null;

    if (state === 'speakingFeedback' || state === 'explainingTask') {
      // Breathing rhythm when Atlas speaks
      scaleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.45,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.15,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      scaleLoop.start();
      pulseLoop.start();
    } else if (state === 'listening') {
      // Pulse when user is speaking
      scaleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.25,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.2,
            duration: 350,
            useNativeDriver: true,
          }),
        ])
      );
      scaleLoop.start();
      pulseLoop.start();
    } else if (state === 'evaluatingInput') {
      // Rapid vibration when AI is thinking
      scaleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.08,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.98,
            duration: 250,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.2,
            duration: 250,
            useNativeDriver: true,
          }),
        ])
      );
      scaleLoop.start();
      pulseLoop.start();
    } else {
      // Idle static state
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(pulseAnim, {
        toValue: 0.15,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      scaleLoop?.stop();
      pulseLoop?.stop();
    };
  }, [state]);

  const getOrbColor = () => {
    switch (state) {
      case 'speakingFeedback':
      case 'explainingTask':
        return '#0066FF'; // Vibrant Blue
      case 'listening':
        return '#00FF88'; // Neon Emerald
      case 'evaluatingInput':
        return '#FFB700'; // Warm Amber
      default:
        return '#333333'; // Dark Gray
    }
  };

  const orbColor = getOrbColor();

  return (
    <View style={[styles.container, { width: size * 1.4, height: size * 1.4 }]}>
      {/* Outer Ambient Glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.35,
            height: size * 1.35,
            borderRadius: (size * 1.35) / 2,
            backgroundColor: orbColor,
            opacity: pulseAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
      {/* Inner Core Orb */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: orbColor,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
  },
  orb: {
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
});