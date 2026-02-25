/**
 * Prescription Slice
 *
 * Manages prescription templates and dispensing operations
 */

import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {getDatabase} from '@/database';
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
      const database = getDatabase();
      const prescriptionsCollection = database.get<any>('prescriptions');
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
      const database = getDatabase();
      const itemsCollection = database.get<any>('prescription_items');
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
      const database = getDatabase();
      const itemsCollection = database.get<any>('prescription_items');
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
      const database = getDatabase();
      const prescriptionsCollection = database.get<any>('prescriptions');

      const prescription = await prescriptionsCollection.create(presc => {
        presp.name = payload.name;
        presp.pinyin = payload.pinyin || null;
        presp.description = payload.description || null;
      });

      // Add items
      const itemsCollection = database.get<any>('prescription_items');
      const batch = [];

      for (const item of payload.items) {
        batch.push(
          itemsCollection.prepareCreate(prepItem => {
            prepItem.prescription.set(prescription);
            prepItem.medicineId = item.medicineId;
            prepItem.quantity = item.quantity;
            prepItem.unit = item.unit;
          })
        );
      }

      await database.batch(...batch);

      // Reload all prescriptions
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
      const database = getDatabase();
      const prescriptionsCollection = database.get<any>('prescriptions');
      const prescription = await prescriptionsCollection.find(payload.id);

      if (!prescription) {
        throw new Error('处方不存在');
      }

      await database.batch(
        // Update prescription
        prescriptionsCollection.prepareUpdate(presp => {
          presp.id = payload.id;
          presp.name = payload.name;
          presp.pinyin = payload.pinyin || null;
          presp.description = payload.description || null;
        }),
        // Delete old items
        database.get<any>('prescription_items')
          .query(Q.where('prescription_id', payload.id))
          .fetch()
          .then(items => items.map(item => item.markAsDeleted())),
      );

      // Add new items
      const itemsCollection = database.get<any>('prescription_items');
      const batch = [];

      for (const item of payload.items) {
        batch.push(
          itemsCollection.prepareCreate(prepItem => {
            prepItem.prescription.set(prescription);
            prepItem.medicineId = item.medicineId;
            prepItem.quantity = item.quantity;
            prepItem.unit = item.unit;
          })
        );
      }

      await database.batch(...batch);

      // Reload all prescriptions
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
 * Delete a prescription
 */
export const deletePrescription = createAsyncThunk(
  'prescription/delete',
  async (prescriptionId: string, {rejectWithValue}) => {
    try {
      const database = getDatabase();
      const prescriptionsCollection = database.get<any>('prescriptions');
      const prescription = await prescriptionsCollection.find(prescriptionId);

      if (!prescription) {
        throw new Error('处方不存在');
      }

      // Delete prescription and its items (cascade)
      await prescription.markAsDeleted();

      // Reload all prescriptions
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
      })

      // createPrescription
      .addCase(createPrescription.fulfilled, (state, action) => {
        state.prescriptions = action.payload;
      })

      // updatePrescription
      .addCase(updatePrescription.fulfilled, (state, action) => {
        state.prescriptions = action.payload;
        if (state.selectedPrescription?.id === action.payload[0]?.id) {
          state.selectedPrescription = action.payload[0];
        }
      })

      // deletePrescription
      .addCase(deletePrescription.fulfilled, (state, action) => {
        state.prescriptions = action.payload;
        if (state.selectedPrescription && !action.payload.find(p => p.id === state.selectedPrescription.id)) {
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
