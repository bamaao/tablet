/**
 * TTS (Text-to-Speech) Service
 *
 * Wrapper around react-native-tts for voice feedback.
 * Provides Chinese language support for medical inventory operations.
 *
 * @module services/TTSService
 */

import Tts from 'react-native-tts';
import {Platform} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export interface TTSOptions {
  language?: string;
  rate?: number;
  pitch?: number;
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
}

// ============================================================================
// TTS SERVICE CLASS
// ============================================================================

class TTSServiceClass {
  private isInitialized = false;
  private currentLanguage = 'zh-CN';
  private currentRate = 0.8; // Slightly slower for clarity
  private currentPitch = 1.0;

  /**
   * Initialize TTS engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Configure default settings
    await this.setDefaultLanguage();
    await this.setDefaultRate();
    await this.setDefaultPitch();

    // Set up event listeners
    Tts.setDucking(true); // Lower audio volume when speaking

    this.isInitialized = true;
  }

  /**
   * Set default language (Chinese for this app)
   */
  private async setDefaultLanguage(): Promise<void> {
    try {
      // Try Chinese Simplified first
      await Tts.setDefaultLanguage('zh-CN');
      this.currentLanguage = 'zh-CN';
    } catch (error) {
      console.warn('zh-CN not available, trying alternative:', error);
      try {
        // Fallback to Chinese Traditional
        await Tts.setDefaultLanguage('zh-TW');
        this.currentLanguage = 'zh-TW';
      } catch {
        // Final fallback to device default
        console.warn('Chinese languages not available, using device default');
      }
    }
  }

  /**
   * Set default speech rate
   */
  private async setDefaultRate(): Promise<void> {
    try {
      await Tts.setDefaultRate(this.currentRate);
    } catch (error) {
      console.warn('Failed to set default rate:', error);
    }
  }

  /**
   * Set default pitch
   */
  private async setDefaultPitch(): Promise<void> {
    try {
      await Tts.setDefaultPitch(this.currentPitch);
    } catch (error) {
      console.warn('Failed to set default pitch:', error);
    }
  }

  // ========================================================================
  // PUBLIC METHODS
  // ========================================================================

  /**
   * Speak text aloud
   *
   * @param text - The text to speak
   * @param options - Optional TTS options
   * @returns Promise that resolves when speaking starts
   */
  async speak(text: string, options?: TTSOptions): Promise<void> {
    if (!text || text.trim().length === 0) {
      return;
    }

    // Ensure initialization
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Apply options if provided
      if (options?.language && options.language !== this.currentLanguage) {
        await Tts.setDefaultLanguage(options.language);
        this.currentLanguage = options.language;
      }

      if (options?.rate !== undefined && options.rate !== this.currentRate) {
        await Tts.setDefaultRate(options.rate);
        this.currentRate = options.rate;
      }

      if (options?.pitch !== undefined && options.pitch !== this.currentPitch) {
        await Tts.setDefaultPitch(options.pitch);
        this.currentPitch = options.pitch;
      }

      // Speak the text
      await Tts.speak(text);
    } catch (error) {
      console.error('TTS speak error:', error);
      throw error;
    }
  }

  /**
   * Stop current speech
   *
   * @returns Promise that resolves when speech stops
   */
  async stop(): Promise<void> {
    try {
      await Tts.stop();
    } catch (error) {
      console.error('TTS stop error:', error);
      throw error;
    }
  }

  /**
   * Get available voices
   *
   * @returns Array of available voices
   */
  async getVoices(): Promise<TTSVoice[]> {
    try {
      const voices = await Tts.voices();
      return voices.map(voice => ({
        id: voice.id,
        name: voice.name,
        language: voice.language,
      }));
    } catch (error) {
      console.error('Failed to get voices:', error);
      return [];
    }
  }

  /**
   * Set language for speech
   *
   * @param language - Language code (e.g., 'zh-CN', 'en-US')
   */
  async setLanguage(language: string): Promise<void> {
    try {
      await Tts.setDefaultLanguage(language);
      this.currentLanguage = language;
    } catch (error) {
      console.error('Failed to set language:', error);
      throw error;
    }
  }

  /**
   * Set speech rate
   *
   * @param rate - Speech rate (0.5 = slow, 1.0 = normal, 1.5 = fast)
   */
  async setRate(rate: number): Promise<void> {
    try {
      await Tts.setDefaultRate(rate);
      this.currentRate = rate;
    } catch (error) {
      console.error('Failed to set rate:', error);
      throw error;
    }
  }

  /**
   * Set speech pitch
   *
   * @param pitch - Pitch multiplier (0.5 = low, 1.0 = normal, 1.5 = high)
   */
  async setPitch(pitch: number): Promise<void> {
    try {
      await Tts.setDefaultPitch(pitch);
      this.currentPitch = pitch;
    } catch (error) {
      console.error('Failed to set pitch:', error);
      throw error;
    }
  }

  // ========================================================================
  // PRESET MESSAGES FOR MEDICAL INVENTORY
  // ========================================================================

  /**
   * Speak inbound confirmation
   *
   * @param medicineName - Name of the medicine
   * @param quantity - Quantity added
   * @param unit - Unit of measurement
   */
  async speakInboundConfirmation(
    medicineName: string,
    quantity: number,
    unit: string,
  ): Promise<void> {
    const message = `已入库${medicineName}${quantity}${unit}，请确认`;
    await this.speak(message);
  }

  /**
   * Speak outbound confirmation
   *
   * @param medicineName - Name of the medicine
   * @param quantity - Quantity removed
   * @param unit - Unit of measurement
   */
  async speakOutboundConfirmation(
    medicineName: string,
    quantity: number,
    unit: string,
  ): Promise<void> {
    const message = `已出库${medicineName}${quantity}${unit}，请确认`;
    await this.speak(message);
  }

  /**
   * Speak unpack confirmation
   *
   * @param medicineName - Name of the medicine
   * @param packages - Number of packages unpacked
   * @param resultingLoose - Resulting loose quantity
   * @param unit - Unit of measurement
   */
  async speakUnpackConfirmation(
    medicineName: string,
    packages: number,
    resultingLoose: number,
    unit: string,
  ): Promise<void> {
    const message = `已拆包${medicineName}${packages}包，增加散装${resultingLoose}${unit}`;
    await this.speak(message);
  }

  /**
   * Speak audit result
   *
   * @param medicineName - Name of the medicine
   * @param discrepancy - Discrepancy amount (can be negative)
   * @param unit - Unit of measurement
   */
  async speakAuditResult(
    medicineName: string,
    discrepancy: number,
    unit: string,
  ): Promise<void> {
    let message: string;

    if (discrepancy === 0) {
      message = `${medicineName}盘点无差异`;
    } else if (discrepancy > 0) {
      message = `${medicineName}盘点盘盈${discrepancy}${unit}`;
    } else {
      message = `${medicineName}盘点盘亏${Math.abs(discrepancy)}${unit}`;
    }

    await this.speak(message);
  }

  /**
   * Speak prescription confirmation
   *
   * @param prescriptionName - Name of the prescription
   * @param dosageCount - Number of doses
   */
  async speakPrescriptionConfirmation(
    prescriptionName: string,
    dosageCount: number,
  ): Promise<void> {
    const message = `已抓${prescriptionName}${dosageCount}付，请确认`;
    await this.speak(message);
  }

  /**
   * Speak error message
   *
   * @param errorMessage - Error message to speak
   */
  async speakError(errorMessage: string): Promise<void> {
    const message = `操作失败，${errorMessage}`;
    await this.speak(message);
  }

  /**
   * Speak low stock warning
   *
   * @param medicineName - Name of the medicine
   * @param currentStock - Current stock level
   * @param minStock - Minimum stock threshold
   * @param unit - Unit of measurement
   */
  async speakLowStockWarning(
    medicineName: string,
    currentStock: number,
    minStock: number,
    unit: string,
  ): Promise<void> {
    const message = `${medicineName}库存不足，当前${currentStock}${unit}，最低${minStock}${unit}`;
    await this.speak(message);
  }

  /**
   * Speak operation success
   *
   * @param operation - Type of operation
   */
  async speakSuccess(operation: string): Promise<void> {
    const message = `${operation}成功`;
    await this.speak(message);
  }

  /**
   * Speak instruction
   *
   * @param instruction - Instruction text
   */
  async speakInstruction(instruction: string): Promise<void> {
    await this.speak(instruction);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const TTSService = new TTSServiceClass();

// ============================================================================
// REACT HOOK
// ============================================================================

import {useEffect, useState, useCallback} from 'react';

export interface UseTTSReturn {
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  stop: () => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
  setRate: (rate: number) => Promise<void>;
  setPitch: (pitch: number) => Promise<void>;
  isSpeaking: boolean;
  error: Error | null;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const speak = useCallback(async (text: string, options?: TTSOptions) => {
    try {
      setError(null);
      setIsSpeaking(true);
      await TTSService.speak(text, options);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await TTSService.stop();
      setIsSpeaking(false);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const setLanguage = useCallback(async (language: string) => {
    try {
      await TTSService.setLanguage(language);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const setRate = useCallback(async (rate: number) => {
    try {
      await TTSService.setRate(rate);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const setPitch = useCallback(async (pitch: number) => {
    try {
      await TTSService.setPitch(pitch);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  return {
    speak,
    stop,
    setLanguage,
    setRate,
    setPitch,
    isSpeaking,
    error,
  };
}
