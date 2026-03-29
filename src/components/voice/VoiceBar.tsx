/**
 * VoiceBar Component
 *
 * Bottom voice interaction bar with microphone button and transcript display.
 * Always visible at the bottom of the screen for voice-first interaction.
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {
  startListening,
  stopListening,
  updateTranscript,
  setCommand,
  setError,
  selectIsListening,
  selectTranscript,
} from '@/store/slices/voiceSlice';
import {parseVoiceCommand} from '@/utils/voice/CommandParser';
import {VoiceService} from '@/services/VoiceService';
import {TTSService} from '@/services/TTSService';
import {selectCurrentMode} from '@/store/slices/inventorySlice';
import {BRAND_TEAL, MODE_ACCENT, VOICE_HINT_BY_MODE} from '@/theme/inventoryDesign';

export type VoiceBarContext = 'inventory' | 'audit' | 'prescription';

export interface VoiceBarProps {
  /** Inventory tab uses Redux operation mode; other tabs use fixed hint/accent. */
  voiceContext?: VoiceBarContext;
}

export const VoiceBar: React.FC<VoiceBarProps> = ({voiceContext = 'inventory'}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const isListening = useAppSelector(selectIsListening);
  const transcript = useAppSelector(selectTranscript);
  const currentMode = useAppSelector(selectCurrentMode);

  const {modeAccent, voiceHint} = useMemo(() => {
    if (voiceContext === 'audit') {
      return {
        modeAccent: BRAND_TEAL,
        voiceHint: '说「盘点当归实盘 500 克」开始操作',
      };
    }
    if (voiceContext === 'prescription') {
      return {
        modeAccent: '#6A1B9A',
        voiceHint: '说「按补中益气汤抓 7 付」开始操作',
      };
    }
    return {
      modeAccent: MODE_ACCENT[currentMode],
      voiceHint: VOICE_HINT_BY_MODE[currentMode],
    };
  }, [voiceContext, currentMode]);

  const [pulseAnim] = useState(new Animated.Value(1));

  // Handle microphone button press
  const handleMicPress = useCallback(async () => {
    if (isListening) {
      // Stop listening
      await VoiceService.stop();
      dispatch(stopListening());
    } else {
      // Check permission first
      const hasPermission = await VoiceService.hasPermission();
      if (!hasPermission) {
        const granted = await VoiceService.requestPermission();
        if (!granted) {
          dispatch(setError('需要麦克风权限才能使用语音功能'));
          return;
        }
      }

      // Start listening
      try {
        await VoiceService.start();
        dispatch(startListening());
      } catch (error) {
        dispatch(setError((error as Error).message));
      }
    }
  }, [isListening, dispatch]);

  // Animate pulse when listening
  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();

      return () => {
        pulse.stop();
      };
    }
  }, [isListening, pulseAnim]);

  // Listen to voice service events
  useEffect(() => {
    const handlePartial = (text: string) => {
      dispatch(updateTranscript(text));
    };

    const handleRecognized = async (text: string) => {
      dispatch(updateTranscript(text));
      dispatch(stopListening());

      // Parse the command
      const result = parseVoiceCommand(text);

      if (result.success && result.command) {
        dispatch(setCommand(result.command));

        // Speak confirmation
        try {
          await TTSService.speak(`已识别：${text}`);
        } catch (error) {
          console.error('TTS error:', error);
        }
      } else {
        dispatch(setError(result.error || '无法识别命令'));
      }
    };

    const handleError = (error: Error) => {
      dispatch(setError(error.message));
      dispatch(stopListening());
    };

    VoiceService.on('partial', handlePartial);
    VoiceService.on('recognized', handleRecognized);
    VoiceService.on('error', handleError);

    return () => {
      VoiceService.off('partial', handlePartial);
      VoiceService.off('recognized', handleRecognized);
      VoiceService.off('error', handleError);
    };
  }, [dispatch]);

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.surface}]}>
      {/* Transcript Display */}
      <View style={styles.transcriptContainer}>
        {!transcript && !isListening ? (
          <>
            <Text variant="labelLarge" style={[styles.readyLabel, {color: modeAccent}]}>
              语音控制已就绪
            </Text>
            <Text variant="bodyMedium" style={styles.placeholder}>
              {voiceHint}
            </Text>
          </>
        ) : transcript ? (
          <Text variant="bodyLarge" style={styles.transcript}>
            {transcript}
          </Text>
        ) : (
          <Text variant="bodyMedium" style={styles.placeholder}>
            等待语音指令…
          </Text>
        )}
      </View>

      {/* Mic Button */}
      <View style={styles.buttonContainer}>
        {isListening && (
          <>
            {/* Pulsing background */}
            <Animated.View
              style={[
                styles.pulseBackground,
                {
                  backgroundColor: `${modeAccent}40`,
                  transform: [{scale: pulseAnim}],
                },
              ]}
            />

            {/* Ripple effects */}
            <View style={styles.ripple} />
            <View style={[styles.ripple, styles.ripple2]} />
          </>
        )}

        <Pressable
          onPress={handleMicPress}
          style={({pressed}) => [
            styles.micButton,
            {
              backgroundColor: isListening ? theme.colors.error : modeAccent,
            },
            pressed && styles.pressed,
          ]}
          accessibilityLabel={isListening ? '停止录音' : '开始录音'}
          accessibilityRole="button">
          <Icon
            name={isListening ? 'stop-circle' : 'microphone'}
            size={32}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {/* Status indicator */}
      {isListening && (
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, {backgroundColor: theme.colors.error}]} />
          <Text variant="labelSmall" style={styles.statusText}>
            正在录音...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  transcriptContainer: {
    flex: 1,
    marginRight: 16,
    justifyContent: 'center',
    minHeight: 40,
  },
  transcript: {
    color: '#000',
  },
  placeholder: {
    color: '#999',
    marginTop: 4,
  },
  readyLabel: {
    fontWeight: '600',
  },
  buttonContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseBackground: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  ripple: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  ripple2: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.2)',
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{scale: 0.95}],
  },
  statusContainer: {
    position: 'absolute',
    top: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#666',
  },
});
