/**
 * UI Slice
 *
 * Manages global UI state (loading, toasts, dialogs)
 */

import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {UIState} from '@/types';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: UIState = {
  loading: false,
  toastMessage: undefined,
  errorDialog: undefined,
};

// ============================================================================
// SLICE
// ============================================================================

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Set global loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    /**
     * Show a toast message
     */
    showToast: (state, action: PayloadAction<string | undefined>) => {
      state.toastMessage = action.payload;
    },

    /**
     * Show error dialog
     */
    showError: (state, action: PayloadAction<{title: string; message: string} | undefined>) => {
      state.errorDialog = action.payload;
    },

    /**
     * Clear all UI messages
     */
    clearMessages: state => {
      state.toastMessage = undefined;
      state.errorDialog = undefined;
    },
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

export const {
  setLoading,
  showToast,
  showError,
  clearMessages,
} = uiSlice.actions;

// ============================================================================
// SELECTORS
// ============================================================================

export const selectUILoading = (state: {ui: UIState}) => state.ui.loading;
export const selectToastMessage = (state: {ui: UIState}) => state.ui.toastMessage;
export const selectErrorDialog = (state: {ui: UIState}) => state.ui.errorDialog;

// ============================================================================
// REDUCER
// ============================================================================

export default uiSlice.reducer;
