/**
 * VoiceVisualizer Component
 *
 * Audio waveform animation for visual feedback during voice recording.
 * Provides a visual representation of audio input.
 */

import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import {useTheme} from 'react-native-paper';

interface VoiceVisualizerProps {
  /**
   * Is currently recording/listening
   */
  isActive: boolean;

  /**
   * Number of bars to display
   */
  barCount?: number;

  /**
   * Height of the tallest bar
   */
  maxHeight?: number;

  /**
   * Minimum height of bars
   */
  minHeight?: number;

  /**
   * Width of each bar
   */
  barWidth?: number;

  /**
   * Gap between bars
   */
  gap?: number;

  /**
   * Optional style override
   */
  style?: any;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isActive,
  barCount = 20,
  maxHeight = 40,
  minHeight = 4,
  barWidth = 4,
  gap = 4,
  style,
}) => {
  const theme = useTheme();
  const animations = useRef<Animated.Value[]>([]);

  // Initialize animations
  useEffect(() => {
    animations.current = Array.from({length: barCount}, () => new Animated.Value(minHeight));
  }, [barCount, minHeight]);

  // Animate bars when active
  useEffect(() => {
    if (!isActive) {
      // Reset all bars to minimum height
      animations.current.forEach(anim =>
        anim.setValue(minHeight),
      );
      return;
    }

    // Create random animation for each bar
    const animationsList = animations.current.map((anim, index) => {
      // Stagger animations for wave effect
      const delay = index * 50;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: minHeight + Math.random() * (maxHeight - minHeight),
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: minHeight + Math.random() * (maxHeight - minHeight * 2),
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
          }),
        ]),
      );
    });

    // Start all animations
    animationsList.forEach(anim => anim.start());

    // Cleanup
    return () => {
      animationsList.forEach(anim => anim.stop());
    };
  }, [isActive, barCount, maxHeight, minHeight]);

  return (
    <View style={[styles.container, style]}>
      {animations.current.map((animation, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              width: barWidth,
              height: animation,
              backgroundColor: isActive
                ? theme.colors.primary
                : theme.colors.surfaceVariant,
              borderRadius: barWidth / 2,
              marginHorizontal: gap / 2,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    paddingVertical: 8,
  },
  bar: {
    height: 4,
  },
});
