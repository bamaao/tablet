/**
 * Prescription Slice
 *
 * Manages prescription templates and dispensing operations
 */

import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {database} from '@/database';
import {Prescription} from '@/database/models/Prescription';
import {PrescriptionItem} from '@/database/models/PrescriptionItem';
import {Medicine} from '@/database/models/Medicine';
import {PrescriptionState, Prescription as PrescriptionType} from '@/types';
import Q from '@nozbe/watermelondb/Query';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: PrescriptionState = {
  prescriptions: [],
  selectedPrescription: undefined,
  dosageCount: 1,
  items: [],
  availabilityCheck: undefined,
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Load all prescriptions
 */
export const loadPrescriptions = createAsyncThunk(
  'prescription/loadPrescriptions',
  async (_, {rejectWithValue}) => {
    try {
      const prescriptionsCollection = database.get<Prescription>('prescriptions');
      const allPrescriptions = await prescriptionsCollection.query().fetch();

      return allPrescriptions.map(p => ({
        id: p.id,
        name: p.name,
        pinyin: p.pinyin ?? undefined,
        description: p.description ?? undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })) as PrescriptionType[];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

/**
 * Load prescription items
 */
export const loadPrescriptionItems = createAsyncThunk(
  'prescription/loadItems',
  async (prescriptionId: string, {rejectWithValue}) => {
    try {
      const itemsCollection = database.get<PrescriptionItem>('prescription_items');
      const items = await itemsCollection
        .query(Q.where('prescription_id', prescriptionId))
        .fetch();

      const result = [];

      for (const item of items) {
        const medicine = await item.medicine.fetch();

        result.push({
          id: item.id,
          prescriptionId: item.prescriptionId,
          medicineId: item.medicineId,
          quantity: item.quantity,
          unit: item.unit,
          medicine: {
            id: medicine.id,
            name: medicine.name,
            pinyin: medicine.pinyin ?? undefined,
            category: medicine.category,
            baseUnit: medicine.baseUnit,
            packageUnit: medicine.packageUnit,
            packageSize: medicine.packageSize,
            currentStock: medicine.currentStock,
            looseStock: medicine.looseStock,
            packagedStock: medicine.packagedStock,
            minStock: medicine.minStock,
            location: medicine.location ?? undefined,
            createdAt: medicine.createdAt,
            updatedAt: medicine.updatedAt,
          },
        });
      }

      return result;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

/**
 * Check stock availability for a prescription
 */
export const checkPrescriptionAvailability = createAsyncThunk(
  'prescription/checkAvailability',
  async (
    payload: {prescriptionId: string; dosageCount: number},
    {rejectWithValue},
  ) => {
    try {
      const itemsCollection = database.get<PrescriptionItem>('prescription_items');
      const items = await itemsCollection
        .query(Q.where('prescription_id', payload.prescriptionId))
        .fetch();

      const availability = new Map<string, boolean>();

      for (const item of items) {
        const medicine = await item.medicine.fetch();
        const required = item.quantity * payload.dosageCount;
        const hasEnough = medicine.currentStock >= required;
        availability.set(medicine.id, hasEnough);

        if (!hasEnough) {
          // Return early with first failure
          return {
            available: false,
            insufficientMedicine: medicine.name,
            required,
            available: medicine.currentStock,
            availability,
          };
        }
      }

      return {
        available: true,
        availability,
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

// ============================================================================
// SLICE
// ============================================================================

const prescriptionSlice = createSlice({
  name: 'prescription',
  initialState,
  reducers: {
    /**
     * Select a prescription
     */
    selectPrescription: (state, action: PayloadAction<PrescriptionType>) => {
      state.selectedPrescription = action.payload;
      state.items = [];
      state.availabilityCheck = undefined;
    },

    /**
     * Set dosage count (付数)
     */
    setDosageCount: (state, action: PayloadAction<number>) => {
      state.dosageCount = Math.max(1, action.payload);
      state.availabilityCheck = undefined; // Reset check
    },

    /**
     * Clear selection
     */
    clearSelection: state => {
      state.selectedPrescription = undefined;
      state.items = [];
      state.dosageCount = 1;
      state.availabilityCheck = undefined;
    },
  },
  extraReducers: builder => {
    builder
      // loadPrescriptions
      .addCase(loadPrescriptions.fulfilled, (state, action) => {
        state.prescriptions = action.payload;
      })

      // loadPrescriptionItems
      .addCase(loadPrescriptionItems.fulfilled, (state, action) => {
        state.items = action.payload;
      })

      // checkPrescriptionAvailability
      .addCase(checkPrescriptionAvailability.fulfilled, (state, action) => {
        if (action.payload.availability) {
          state.availabilityCheck = action.payload.availability;
        }
      });
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

export const {
  selectPrescription,
  setDosageCount,
  clearSelection,
} = prescriptionSlice.actions;

// ============================================================================
// SELECTORS
// ============================================================================

export const selectPrescriptions = (state: {prescription: PrescriptionState}) =>
  state.prescription.prescriptions;
export const selectSelectedPrescription = (state: {prescription: PrescriptionState}) =>
  state.prescription.selectedPrescription;
export const selectDosageCount = (state: {prescription: PrescriptionState}) =>
  state.prescription.dosageCount;
export const selectPrescriptionItems = (state: {prescription: PrescriptionState}) =>
  state.prescription.items;
export const selectAvailabilityCheck = (state: {prescription: PrescriptionState}) =>
  state.prescription.availabilityCheck;

export const selectIsAvailable = (state: {prescription: PrescriptionState}) => {
  if (!state.prescription.availabilityCheck) return undefined;
  return Array.from(state.prescription.availabilityCheck.values()).every(v => v === true);
};

// ============================================================================
// REDUCER
// ============================================================================

export default prescriptionSlice.reducer;
