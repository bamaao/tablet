/**
 * Prescription Slice
 *
 * Manages prescription templates and dispensing operations
 * Uses SQLite for data persistence
 */

import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {
  getAllPrescriptions,
  getPrescriptionById,
  getPrescriptionItems,
  createPrescription as createPrescriptionRepo,
  updatePrescription as updatePrescriptionRepo,
  deletePrescription as deletePrescriptionRepo,
  addPrescriptionItem,
  clearPrescriptionItems,
  PrescriptionRecord,
  PrescriptionItemRecord,
} from '@/database';
import {getMedicineById, MedicineRecord} from '@/database';
import {PrescriptionState, Prescription as PrescriptionType, Medicine, UnitType} from '@/types';

// ============================================================================
// TYPE CONVERTERS
// ============================================================================

function recordToPrescription(record: PrescriptionRecord): PrescriptionType {
  return {
    id: record.id,
    name: record.name,
    pinyin: record.pinyin ?? undefined,
    description: record.description ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function medicineRecordToMedicine(record: MedicineRecord): Medicine {
  return {
    id: record.id,
    name: record.name,
    pinyin: record.pinyin ?? undefined,
    category: record.category,
    baseUnit: record.base_unit as UnitType,
    packageUnit: record.package_unit,
    packageSize: record.package_size,
    currentStock: record.current_stock,
    looseStock: record.loose_stock,
    packagedStock: record.packaged_stock,
    minStock: record.min_stock,
    location: record.location ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

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
      const records = getAllPrescriptions();
      return records.map(recordToPrescription);
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
      const items = getPrescriptionItems(prescriptionId);
      const result = [];

      for (const item of items) {
        const medicine = getMedicineById(item.medicine_id);
        if (medicine) {
          result.push({
            id: item.id,
            prescriptionId: item.prescription_id,
            medicineId: item.medicine_id,
            quantity: item.quantity,
            unit: item.unit,
            medicine: medicineRecordToMedicine(medicine),
          });
        }
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
      const items = getPrescriptionItems(payload.prescriptionId);
      const availability = new Map<string, boolean>();

      for (const item of items) {
        const medicine = getMedicineById(item.medicine_id);
        if (!medicine) continue;

        const required = item.quantity * payload.dosageCount;
        const hasEnough = medicine.current_stock >= required;
        availability.set(medicine.id, hasEnough);

        if (!hasEnough) {
          return {
            available: false,
            insufficientMedicine: medicine.name,
            required,
            availableStock: medicine.current_stock,
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

/**
 * Create a new prescription
 */
export const createPrescription = createAsyncThunk(
  'prescription/create',
  async (payload: {
    name: string;
    pinyin?: string;
    description?: string;
    items: Array<{medicineId: string; quantity: number; unit: string}>;
  }, {rejectWithValue}) => {
    try {
      const prescription = createPrescriptionRepo({
        name: payload.name,
        pinyin: payload.pinyin,
        description: payload.description,
      });

      // Add items
      for (const item of payload.items) {
        addPrescriptionItem({
          prescriptionId: prescription.id,
          medicineId: item.medicineId,
          quantity: item.quantity,
          unit: item.unit,
        });
      }

      // Reload all prescriptions
      const allPrescriptions = getAllPrescriptions();
      return allPrescriptions.map(recordToPrescription);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

/**
 * Update an existing prescription
 */
export const updatePrescription = createAsyncThunk(
  'prescription/update',
  async (payload: {
    id: string;
    name: string;
    pinyin?: string;
    description?: string;
    items: Array<{medicineId: string; quantity: number; unit: string}>;
  }, {rejectWithValue}) => {
    try {
      updatePrescriptionRepo(payload.id, {
        name: payload.name,
        pinyin: payload.pinyin,
        description: payload.description,
      });

      // Clear old items and add new ones
      clearPrescriptionItems(payload.id);
      for (const item of payload.items) {
        addPrescriptionItem({
          prescriptionId: payload.id,
          medicineId: item.medicineId,
          quantity: item.quantity,
          unit: item.unit,
        });
      }

      // Reload all prescriptions
      const allPrescriptions = getAllPrescriptions();
      return allPrescriptions.map(recordToPrescription);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

/**
 * Delete a prescription
 */
export const deletePrescription = createAsyncThunk(
  'prescription/delete',
  async (prescriptionId: string, {rejectWithValue}) => {
    try {
      deletePrescriptionRepo(prescriptionId);

      // Reload all prescriptions
      const allPrescriptions = getAllPrescriptions();
      return allPrescriptions.map(recordToPrescription);
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
    selectPrescription: (state, action: PayloadAction<PrescriptionType>) => {
      state.selectedPrescription = action.payload;
      state.items = [];
      state.availabilityCheck = undefined;
    },

    setDosageCount: (state, action: PayloadAction<number>) => {
      state.dosageCount = Math.max(1, action.payload);
      state.availabilityCheck = undefined;
    },

    clearSelection: state => {
      state.selectedPrescription = undefined;
      state.items = [];
      state.dosageCount = 1;
      state.availabilityCheck = undefined;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadPrescriptions.fulfilled, (state, action) => {
        state.prescriptions = action.payload;
      })
      .addCase(loadPrescriptionItems.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(checkPrescriptionAvailability.fulfilled, (state, action) => {
        if (action.payload.availability) {
          state.availabilityCheck = action.payload.availability;
        }
      })
      .addCase(createPrescription.fulfilled, (state, action) => {
        state.prescriptions = action.payload;
      })
      .addCase(updatePrescription.fulfilled, (state, action) => {
        state.prescriptions = action.payload;
        if (state.selectedPrescription?.id === action.payload[0]?.id) {
          state.selectedPrescription = action.payload[0];
        }
      })
      .addCase(deletePrescription.fulfilled, (state, action) => {
        state.prescriptions = action.payload;
        if (state.selectedPrescription && !action.payload.find(p => p.id === state.selectedPrescription?.id)) {
          state.selectedPrescription = undefined;
          state.items = [];
          state.dosageCount = 1;
          state.availabilityCheck = undefined;
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

export const selectPrescriptions = (state: any) =>
  state?.prescription?.prescriptions || [];
export const selectSelectedPrescription = (state: any) =>
  state?.prescription?.selectedPrescription || null;
export const selectDosageCount = (state: any) =>
  state?.prescription?.dosageCount || 1;
export const selectPrescriptionItems = (state: any) =>
  state?.prescription?.items || [];
export const selectAvailabilityCheck = (state: any) =>
  state?.prescription?.availabilityCheck || null;

export const selectIsAvailable = (state: any) => {
  if (!state?.prescription?.availabilityCheck) return false;
  return Array.from(state.prescription.availabilityCheck.values()).every(v => v === true);
};

// ============================================================================
// REDUCER
// ============================================================================

export default prescriptionSlice.reducer;
