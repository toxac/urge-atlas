import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface VoiceOrbProps {
  state: 'idle' | 'explainingTask' | 'listening' | 'evaluatingInput' | 'speakingFeedback';
  size?: number;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state, size = 200 }) => {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(0);
  const colorProgress = useSharedValue(0);

  useEffect(() => {
    switch (state) {
      case 'speakingFeedback':
      case 'explainingTask':
        colorProgress.value = withTiming(0, { duration: 500 }); // Blue/Cyan
        scale.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.95, { duration: 600, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
        break;

      case 'listening':
        colorProgress.value = withTiming(1, { duration: 500 }); // Neon Emerald
        scale.value = withRepeat(
          withSequence(
            withTiming(1.25, { duration: 400 }),
            withTiming(1.0, { duration: 400 })
          ),
          -1,
          true
        );
        break;

      case 'evaluatingInput':
        colorProgress.value = withTiming(2, { duration: 500 }); // Amber/Gold
        scale.value = withRepeat(
          withTiming(1.05, { duration: 300 }),
          -1,
          true
        );
        break;

      case 'idle':
      default:
        colorProgress.value = withTiming(3, { duration: 500 }); // Dark Grey/Subtle Accent
        scale.value = withTiming(1, { duration: 500 });
        break;
    }
  }, [state]);

  const animatedOrbStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1, 2, 3],
      ['#0066FF', '#00FF88', '#FFB700', '#222222']
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
    };
  });

  const animatedGlowStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1, 2, 3],
      ['rgba(0,102,255,0.3)', 'rgba(0,255,136,0.3)', 'rgba(255,183,0,0.3)', 'rgba(255,255,255,0.05)']
    );

    return {
      transform: [{ scale: scale.value * 1.35 }],
      backgroundColor,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.glow,
          { width: size, height: size, borderRadius: size / 2 },
          animatedGlowStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          { width: size, height: size, borderRadius: size / 2 },
          animatedOrbStyle,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
});