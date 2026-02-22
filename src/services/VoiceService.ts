/**
 * Voice Service
 *
 * Wrapper around react-native-voice for speech-to-text functionality.
 * Manages the STT lifecycle and emits events for recognized speech.
 *
 * @module services/VoiceService
 */

import Voice from 'react-native-voice';
import {EventEmitter} from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type VoiceServiceEvent = 'start' | 'end' | 'recognized' | 'partial' | 'error';

export interface VoiceServiceEvents {
  start: () => void;
  end: () => void;
  recognized: (text: string) => void;
  partial: (text: string) => void;
  error: (error: Error) => void;
}

// ============================================================================
// VOICE SERVICE CLASS
// ============================================================================

class VoiceServiceClass extends EventEmitter {
  private isInitialized = false;
  private isListening = false;

  constructor() {
    super();
    this.setupVoice();
  }

  /**
   * Initialize Voice SDK
   */
  private setupVoice(): void {
    if (this.isInitialized) {
      return;
    }

    Voice.onSpeechStart = this.onSpeechStart.bind(this);
    Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
    Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
    Voice.onSpeechError = this.onSpeechError.bind(this);

    this.isInitialized = true;
  }

  // ========================================================================
  // VOICE EVENT HANDLERS
  // ========================================================================

  private onSpeechStart(e: any): void {
    this.isListening = true;
    this.emit('start', e);
  }

  private onSpeechEnd(e: any): void {
    this.isListening = false;
    this.emit('end', e);
  }

  private onSpeechResults(e: any): void {
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      this.emit('recognized', text);
    }
  }

  private onSpeechPartialResults(e: any): void {
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      this.emit('partial', text);
    }
  }

  private onSpeechError(e: any): void {
    this.isListening = false;
    const error = new Error(e.error?.message || 'Voice recognition error');
    this.emit('error', error);
  }

  // ========================================================================
  // PUBLIC METHODS
  // ========================================================================

  /**
   * Start speech recognition
   *
   * @param options - Optional recognition options
   * @returns Promise that resolves when recognition starts
   */
  async start(options?: {
    language?: string;
    maxAttempts?: number;
    pauses?: boolean;
  }): Promise<void> {
    try {
      const opts = {
        language: 'zh-CN', // Default to Chinese
        maxAttempts: 5,
        pauses: true,
        ...options,
      };

      await Voice.start(opts.language);
      this.isListening = true;
    } catch (error) {
      this.isListening = false;
      throw error;
    }
  }

  /**
   * Stop speech recognition
   *
   * @returns Promise that resolves when recognition stops
   */
  async stop(): Promise<void> {
    try {
      await Voice.stop();
      this.isListening = false;
    } catch (error) {
      this.isListening = false;
      throw error;
    }
  }

  /**
   * Cancel speech recognition immediately
   *
   * @returns Promise that resolves when recognition is cancelled
   */
  async cancel(): Promise<void> {
    try {
      await Voice.cancel();
      this.isListening = false;
    } catch (error) {
      this.isListening = false;
      throw error;
    }
  }

  /**
   * Destroy voice recognition and release resources
   *
   * @returns Promise that resolves when destruction is complete
   */
  async destroy(): Promise<void> {
    try {
      await Voice.destroy();
      this.isListening = false;
      this.isInitialized = false;
      this.removeAllListeners();
    } catch (error) {
      this.isListening = false;
      throw error;
    }
  }

  /**
   * Check if speech recognition is available on this device
   *
   * @returns true if available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      const isRecognizing = await Voice.isAvailable();
      return isRecognizing;
    } catch {
      return false;
    }
  }

  /**
   * Check if microphone permission is granted
   *
   * @returns true if permission granted, false otherwise
   */
  async hasPermission(): Promise<boolean> {
    try {
      // Note: react-native-voice doesn't have a built-in permission check
      // This would need to be implemented using react-native-permissions
      // For now, we'll assume permission is granted
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Request microphone permission
   *
   * @returns true if permission granted, false otherwise
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Note: react-native-voice doesn't handle permissions directly
      // This would need to be implemented using react-native-permissions
      // For now, we'll return true
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if currently listening
   */
  get listening(): boolean {
    return this.isListening;
  }

  // ========================================================================
  // EVENT LISTENER HELPERS
  // ========================================================================

  /**
   * Register an event listener
   */
  on<E extends VoiceServiceEvent>(
    event: E,
    listener: VoiceServiceEvents[E],
  ): this {
    return super.on(event, listener);
  }

  /**
   * Unregister an event listener
   */
  off<E extends VoiceServiceEvent>(
    event: E,
    listener: VoiceServiceEvents[E],
  ): this {
    return super.off(event, listener);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const VoiceService = new VoiceServiceClass();

// ============================================================================
// REACT HOOK
// ============================================================================

import {useEffect, useState, useCallback} from 'react';

export interface UseVoiceReturn {
  isListening: boolean;
  transcript: string;
  partialTranscript: string;
  error: Error | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  resetTranscript: () => void;
}

export function useVoice(options?: {
  language?: string;
  continuous?: boolean;
}): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<Error | null>(null);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setPartialTranscript('');
      await VoiceService.start(options);
      setIsListening(true);
    } catch (err) {
      setError(err as Error);
      setIsListening(false);
    }
  }, [options]);

  const stopListening = useCallback(async () => {
    try {
      await VoiceService.stop();
      setIsListening(false);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setPartialTranscript('');
    setError(null);
  }, []);

  useEffect(() => {
    const handleStart = () => {
      setIsListening(true);
    };

    const handleEnd = () => {
      setIsListening(false);
    };

    const handleRecognized = (text: string) => {
      setTranscript(text);
      setPartialTranscript('');
      setIsListening(false);
    };

    const handlePartial = (text: string) => {
      setPartialTranscript(text);
    };

    const handleError = (err: Error) => {
      setError(err);
      setIsListening(false);
    };

    VoiceService.on('start', handleStart);
    VoiceService.on('end', handleEnd);
    VoiceService.on('recognized', handleRecognized);
    VoiceService.on('partial', handlePartial);
    VoiceService.on('error', handleError);

    return () => {
      VoiceService.off('start', handleStart);
      VoiceService.off('end', handleEnd);
      VoiceService.off('recognized', handleRecognized);
      VoiceService.off('partial', handlePartial);
      VoiceService.off('error', handleError);
    };
  }, []);

  return {
    isListening,
    transcript,
    partialTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
