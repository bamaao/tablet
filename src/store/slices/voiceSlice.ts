/**
 * Voice Slice
 *
 * Manages voice recognition state and parsed commands
 */

import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {VoiceState, VoiceCommand} from '@/types';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: VoiceState = {
  isListening: false,
  transcript: '',
  lastCommand: undefined,
  error: undefined,
  permissionGranted: false,
};

// ============================================================================
// SLICE
// ============================================================================

const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    /**
     * Start listening
     */
    startListening: state => {
      state.isListening = true;
      state.transcript = '';
      state.error = undefined;
    },

    /**
     * Stop listening
     */
    stopListening: state => {
      state.isListening = false;
    },

    /**
     * Update transcript during recognition
     */
    updateTranscript: (state, action: PayloadAction<string>) => {
      state.transcript = action.payload;
    },

    /**
     * Set a recognized command
     */
    setCommand: (state, action: PayloadAction<VoiceCommand>) => {
      state.lastCommand = action.payload;
      state.transcript = action.payload.rawText;
    },

    /**
     * Clear the current command
     */
    clearCommand: state => {
      state.lastCommand = undefined;
    },

    /**
     * Set voice permission status
     */
    setPermissionGranted: (state, action: PayloadAction<boolean>) => {
      state.permissionGranted = action.payload;
    },

    /**
     * Set error message
     */
    setError: (state, action: PayloadAction<string | undefined>) => {
      state.error = action.payload;
    },

    /**
     * Reset voice state
     */
    reset: state => {
      state.isListening = false;
      state.transcript = '';
      state.lastCommand = undefined;
      state.error = undefined;
    },
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

export const {
  startListening,
  stopListening,
  updateTranscript,
  setCommand,
  clearCommand,
  setPermissionGranted,
  setError,
  reset,
} = voiceSlice.actions;

// ============================================================================
// SELECTORS
// ============================================================================

export const selectIsListening = (state: {voice: VoiceState}) => state.voice.isListening;
export const selectTranscript = (state: {voice: VoiceState}) => state.voice.transcript;
export const selectLastCommand = (state: {voice: VoiceState}) => state.voice.lastCommand;
export const selectVoiceError = (state: {voice: VoiceState}) => state.voice.error;
export const selectPermissionGranted = (state: {voice: VoiceState}) => state.voice.permissionGranted;

// ============================================================================
// REDUCER
// ============================================================================

export default voiceSlice.reducer;
