import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface VoiceOrbProps {
  state: 'idle' | 'explainingTask' | 'listening' | 'evaluatingInput' | 'speakingFeedback';
  size?: number;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state, size = 180 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.2)).current;
  const rotation1 = useRef(new Animated.Value(0)).current;
  const rotation2 = useRef(new Animated.Value(0)).current;

  // Intercepted rotation interpolations for native driver
  const spin1 = rotation1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spin2 = rotation2.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  useEffect(() => {
    // 1. Continuous Rotation Loops
    const rotateLoop1 = Animated.loop(
      Animated.timing(rotation1, {
        toValue: 1,
        duration: state === 'listening' ? 3000 : 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const rotateLoop2 = Animated.loop(
      Animated.timing(rotation2, {
        toValue: 1,
        duration: state === 'listening' ? 4000 : 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    rotateLoop1.start();
    rotateLoop2.start();

    // 2. Pulse / Breathing Loops
    let scaleLoop: Animated.CompositeAnimation | null = null;
    let glowLoop: Animated.CompositeAnimation | null = null;

    if (state === 'speakingFeedback' || state === 'explainingTask') {
      // Atlas Speaking - Smooth rhythmic wave
      scaleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.12,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.96,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        ])
      );
    } else if (state === 'listening') {
      // User Speaking - Active neon pulse
      scaleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.18,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.65, duration: 400, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    } else if (state === 'evaluatingInput') {
      // AI Processing - Fast vibrant shimmer
      scaleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.06, duration: 250, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 0.98, duration: 250, useNativeDriver: true }),
        ])
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.55, duration: 250, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.25, duration: 250, useNativeDriver: true }),
        ])
      );
    } else {
      // Idle Rest State
      Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      Animated.timing(glowAnim, { toValue: 0.15, duration: 400, useNativeDriver: true }).start();
    }

    scaleLoop?.start();
    glowLoop?.start();

    return () => {
      rotateLoop1.stop();
      rotateLoop2.stop();
      scaleLoop?.stop();
      glowLoop?.stop();
    };
  }, [state]);

  // Dynamic Color Palette mapping state to neon ring accents
  const getThemeColors = () => {
    switch (state) {
      case 'speakingFeedback':
      case 'explainingTask':
        return {
          primary: '#0066FF',   // Electric Cyan / Blue
          secondary: '#A020F0', // Vibrant Purple
          glow: '#00D2FF',
        };
      case 'listening':
        return {
          primary: '#00FF88',   // Neon Emerald
          secondary: '#00E5FF', // Cyan Accent
          glow: '#00FF88',
        };
      case 'evaluatingInput':
        return {
          primary: '#FF9900',   // Warm Amber
          secondary: '#FF007F', // Neon Magenta
          glow: '#FF9900',
        };
      default:
        return {
          primary: '#475569',   // Slate Blue
          secondary: '#1E293B', // Dark Slate
          glow: '#334155',
        };
    }
  };

  const theme = getThemeColors();
  const RING_WIDTH = 3.5;

  return (
    <View style={[styles.container, { width: size * 1.3, height: size * 1.3 }]}>
      {/* 1. Deep Ambient Glow Halo */}
      <Animated.View
        style={[
          styles.glowHalo,
          {
            width: size * 1.25,
            height: size * 1.25,
            borderRadius: (size * 1.25) / 2,
            backgroundColor: theme.glow,
            opacity: glowAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />

      {/* 2. Outer Thin Static Track */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      />

      {/* 3. Primary Clockwise Rotating Arc Ring */}
      <Animated.View
        style={[
          styles.ringArc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: RING_WIDTH,
            borderColor: theme.primary,
            borderTopColor: 'transparent',
            borderLeftColor: 'transparent',
            transform: [{ scale: scaleAnim }, { rotate: spin1 }],
          },
        ]}
      />

      {/* 4. Secondary Counter-Clockwise Accent Arc Ring */}
      <Animated.View
        style={[
          styles.ringArc,
          {
            width: size * 0.88,
            height: size * 0.88,
            borderRadius: (size * 0.88) / 2,
            borderWidth: RING_WIDTH * 0.8,
            borderColor: theme.secondary,
            borderBottomColor: 'transparent',
            borderRightColor: 'transparent',
            transform: [{ scale: scaleAnim }, { rotate: spin2 }],
            opacity: 0.85,
          },
        ]}
      />

      {/* 5. Inner Core Dark Void */}
      <View
        style={{
          width: size * 0.82,
          height: size * 0.82,
          borderRadius: (size * 0.82) / 2,
          backgroundColor: '#0A0A0A',
          position: 'absolute',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowHalo: {
    position: 'absolute',
  },
  ringArc: {
    position: 'absolute',
  },
});