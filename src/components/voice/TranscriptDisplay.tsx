/**
 * TranscriptDisplay Component
 *
 * Real-time speech-to-text transcript display.
 * Shows the recognized text as the user speaks.
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Card, useTheme} from 'react-native-paper';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

interface TranscriptDisplayProps {
  /**
   * The transcript text to display
   */
  transcript: string;

  /**
   * Is currently listening
   */
  isListening: boolean;

  /**
   * Show/hide the component
   */
  visible?: boolean;

  /**
   * Optional style override
   */
  style?: any;

  /**
   * Maximum number of lines to display
   */
  maxLines?: number;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcript,
  isListening,
  visible = true,
  style,
  maxLines = 3,
}) => {
  const theme = useTheme();

  if (!visible || (!transcript && !isListening)) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={[styles.container, style]}>
      <Card
        mode={isListening ? 'contained' : 'outlined'}
        style={[
          styles.card,
          {
            backgroundColor: isListening
              ? theme.colors.primaryContainer + '20'
              : theme.colors.surface,
            borderColor: isListening ? theme.colors.primary : theme.colors.outline,
          },
        ]}>
        <Card.Content style={styles.content}>
          {isListening && !transcript && (
            <Text variant="bodyLarge" style={styles.listening}>
              正在聆听...
            </Text>
          )}

          {transcript && (
            <Text
              variant="headlineSmall"
              numberOfLines={maxLines}
              style={[
                styles.transcript,
                isListening && styles.activeTranscript,
              ]}>
              {transcript}
            </Text>
          )}

          {isListening && (
            <View style={styles.indicatorRow}>
              <View
                style={[
                  styles.dot,
                  {backgroundColor: theme.colors.primary},
                ]}
              />
              <View
                style={[
                  styles.dot,
                  {backgroundColor: theme.colors.primary},
                ]}
              />
              <View
                style={[
                  styles.dot,
                  {backgroundColor: theme.colors.primary},
                ]}
              />
            </View>
          )}
        </Card.Content>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    borderWidth: 2,
  },
  content: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  listening: {
    color: '#666',
    fontStyle: 'italic',
  },
  transcript: {
    textAlign: 'center',
    fontWeight: '600',
  },
  activeTranscript: {
    color: '#00695C',
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
