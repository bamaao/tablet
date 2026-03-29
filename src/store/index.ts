/**
 * Redux Store Configuration
 *
 * Centralizes Redux state management with typed hooks
 */

import {configureStore} from '@reduxjs/toolkit';
import inventoryReducer from './slices/inventorySlice';
import prescriptionReducer from './slices/prescriptionSlice';
import auditReducer from './slices/auditSlice';
import voiceReducer from './slices/voiceSlice';
import uiReducer from './slices/uiSlice';

// ============================================================================
// STORE CONFIGURATION
// ============================================================================

export const store = configureStore({
  reducer: {
    inventory: inventoryReducer,
    prescription: prescriptionReducer,
    audit: auditReducer,
    voice: voiceReducer,
    ui: uiReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable serializable check for performance
      immutableCheck: false, // Disable immutable check for performance
    }),
});

// ============================================================================
// TYPES
// ============================================================================

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ============================================================================
// RE-EXPORT ACTIONS
// ============================================================================

export {loadMedicines} from './slices/inventorySlice';
export {
  loadPrescriptions,
  selectPrescriptions,
  selectPrescription,
  setDosageCount,
  clearSelection,
  selectPrescriptionItems,
  loadPrescriptionItems,
  checkPrescriptionAvailability,
} from './slices/prescriptionSlice';
