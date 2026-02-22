/**
 * Inventory Slice
 *
 * Manages medicine inventory, stock transactions, and operation modes.
 * This is the primary state management for all inventory operations.
 */

import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {database} from '@/database';
import {Medicine} from '@/database/models/Medicine';
import {StockTransaction} from '@/database/models/StockTransaction';
import {
  InventoryMode,
  InventoryState,
  TransactionType,
  UnitType,
  Medicine as MedicineType,
} from '@/types';
import Q from '@nozbe/watermelondb/Query';
import {convertToBaseUnits, convertFromBaseUnits} from '@/utils/conversion/UnitConverter';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: InventoryState = {
  medicines: [],
  transactions: [],
  currentMode: InventoryMode.INBOUND,
  selectedMedicine: undefined,
  loading: false,
  error: undefined,
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Load all medicines from the database
 */
export const loadMedicines = createAsyncThunk(
  'inventory/loadMedicines',
  async (_, {rejectWithValue}) => {
    try {
      const medicinesCollection = database.get<Medicine>('medicines');
      const allMedicines = await medicinesCollection.query().fetch();

      return allMedicines.map(m => ({
        id: m.id,
        name: m.name,
        pinyin: m.pinyin ?? undefined,
        category: m.category,
        baseUnit: m.baseUnit,
        packageUnit: m.packageUnit,
        packageSize: m.packageSize,
        currentStock: m.currentStock,
        looseStock: m.looseStock,
        packagedStock: m.packagedStock,
        minStock: m.minStock,
        location: m.location ?? undefined,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }));
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

/**
 * Search medicines by name or pinyin
 */
export const searchMedicines = createAsyncThunk(
  'inventory/searchMedicines',
  async (query: string, {rejectWithValue}) => {
    try {
      const medicinesCollection = database.get<Medicine>('medicines');

      // Search by name or pinyin
      const results = await medicinesCollection
        .query(
          Q.or(
            Q.where('name', Q.like(`%${query}%`)),
            Q.where('pinyin', Q.like(`%${query.toLowerCase()}%`)),
          ),
        )
        .fetch();

      return results.map(m => ({
        id: m.id,
        name: m.name,
        pinyin: m.pinyin ?? undefined,
        category: m.category,
        baseUnit: m.baseUnit,
        packageUnit: m.packageUnit,
        packageSize: m.packageSize,
        currentStock: m.currentStock,
        looseStock: m.looseStock,
        packagedStock: m.packagedStock,
        minStock: m.minStock,
        location: m.location ?? undefined,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }));
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

/**
 * Execute a stock transaction (inbound, outbound, unpack)
 * This is the core operation that modifies stock atomically
 */
export const executeTransaction = createAsyncThunk(
  'inventory/executeTransaction',
  async (
    payload: {
      medicineId: string;
      type: TransactionType;
      quantity: number;
      unit: UnitType;
      referenceId?: string;
      notes?: string;
    },
    {rejectWithValue},
  ) => {
    try {
      const medicinesCollection = database.get<Medicine>('medicines');
      const transactionsCollection = database.get<StockTransaction>('stock_transactions');

      const medicine = await medicinesCollection.find(payload.medicineId);

      // Get current stock
      const beforeStock = medicine.currentStock;

      // Convert quantity to base units
      const quantityInBaseUnits = convertToBaseUnits(
        payload.quantity,
        payload.unit,
        medicine.packageSize,
      );

      let newLooseStock = medicine.looseStock;
      let newPackagedStock = medicine.packagedStock;
      let finalQuantity = quantityInBaseUnits;

      // Calculate new stock based on transaction type
      switch (payload.type) {
        case TransactionType.INBOUND:
          // Add to loose stock by default (can be modified for package inbound)
          newLooseStock = medicine.looseStock + quantityInBaseUnits;
          break;

        case TransactionType.OUTBOUND:
          // Deduct from loose stock first, then from packaged if needed
          if (medicine.looseStock >= quantityInBaseUnits) {
            newLooseStock = medicine.looseStock - quantityInBaseUnits;
          } else {
            const remaining = quantityInBaseUnits - medicine.looseStock;
            const packagesToUse = Math.ceil(remaining / medicine.packageSize);
            newPackagedStock = Math.max(0, medicine.packagedStock - packagesToUse);
            newLooseStock = 0;
            finalQuantity = quantityInBaseUnits; // Actual deducted amount
          }
          break;

        case TransactionType.UNPACK:
          // Convert packages to loose
          const packagesToUnpack = Math.floor(payload.quantity);
          const unpackedAmount = packagesToUnpack * medicine.packageSize;

          if (packagesToUnpack > medicine.packagedStock) {
            return rejectWithValue('Not enough packaged stock to unpack');
          }

          newPackagedStock = medicine.packagedStock - packagesToUnpack;
          newLooseStock = medicine.looseStock + unpackedAmount;
          finalQuantity = unpackedAmount;
          break;

        case TransactionType.AUDIT:
          // Adjust stock to match actual
          newLooseStock = quantityInBaseUnits;
          newPackagedStock = 0; // Audits typically result in loose stock
          finalQuantity = quantityInBaseUnits - beforeStock;
          break;

        default:
          return rejectWithValue('Unknown transaction type');
      }

      const afterStock = newLooseStock + newPackagedStock * medicine.packageSize;

      // Create transaction record
      await database.batch(
        // Update medicine stock
        medicine.prepareUpdate(m => {
          m.looseStock = newLooseStock;
          m.packagedStock = newPackagedStock;
          m.currentStock = afterStock;
          m.updatedAt = new Date();
        }),

        // Create transaction record
        transactionsCollection.prepareCreate(transaction => {
          transaction.medicineId = payload.medicineId;
          transaction.type = payload.type;
          transaction.quantity = finalQuantity;
          transaction.unit = payload.unit;
          transaction.beforeStock = beforeStock;
          transaction.afterStock = afterStock;
          transaction.referenceId = payload.referenceId;
          transaction.notes = payload.notes;
          transaction.createdAt = new Date();
          transaction.synced = false;
        }),
      );

      // Return updated medicine
      return {
        medicine: {
          id: medicine.id,
          name: medicine.name,
          pinyin: medicine.pinyin ?? undefined,
          category: medicine.category,
          baseUnit: medicine.baseUnit,
          packageUnit: medicine.packageUnit,
          packageSize: medicine.packageSize,
          currentStock: afterStock,
          looseStock: newLooseStock,
          packagedStock: newPackagedStock,
          minStock: medicine.minStock,
          location: medicine.location ?? undefined,
          createdAt: medicine.createdAt,
          updatedAt: new Date(),
        },
        transaction: {
          id: '',
          medicineId: payload.medicineId,
          type: payload.type,
          quantity: finalQuantity,
          unit: payload.unit,
          beforeStock,
          afterStock,
          createdAt: new Date(),
          synced: false,
        },
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

/**
 * Load transaction history for a medicine
 */
export const loadTransactionHistory = createAsyncThunk(
  'inventory/loadTransactionHistory',
  async (medicineId: string, {rejectWithValue}) => {
    try {
      const transactionsCollection = database.get<StockTransaction>('stock_transactions');

      const transactions = await transactionsCollection
        .query(Q.where('medicine_id', medicineId), Q.sortBy('created_at', Q.desc))
        .take(50)
        .fetch();

      return transactions.map(t => ({
        id: t.id,
        medicineId: t.medicineId,
        type: t.type,
        quantity: t.quantity,
        unit: t.unit,
        beforeStock: t.beforeStock,
        afterStock: t.afterStock,
        referenceId: t.referenceId ?? undefined,
        notes: t.notes ?? undefined,
        createdAt: t.createdAt,
        synced: t.synced,
      }));
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

// ============================================================================
// SLICE
// ============================================================================

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    /**
     * Set the current operation mode
     */
    setMode: (state, action: PayloadAction<InventoryMode>) => {
      state.currentMode = action.payload;
      state.selectedMedicine = undefined;
    },

    /**
     * Select a medicine for operation
     */
    selectMedicine: (state, action: PayloadAction<MedicineType>) => {
      state.selectedMedicine = action.payload;
    },

    /**
     * Clear the selected medicine
     */
    clearSelectedMedicine: state => {
      state.selectedMedicine = undefined;
    },

    /**
     * Clear error message
     */
    clearError: state => {
      state.error = undefined;
    },
  },
  extraReducers: builder => {
    // loadMedicines
    builder
      .addCase(loadMedicines.pending, state => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadMedicines.fulfilled, (state, action) => {
        state.loading = false;
        state.medicines = action.payload;
      })
      .addCase(loadMedicines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // searchMedicines
    builder
      .addCase(searchMedicines.fulfilled, (state, action) => {
        state.medicines = action.payload;
      });

    // executeTransaction
    builder
      .addCase(executeTransaction.pending, state => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(executeTransaction.fulfilled, (state, action) => {
        state.loading = false;

        // Update the medicine in the list
        const index = state.medicines.findIndex(m => m.id === action.payload.medicine.id);
        if (index !== -1) {
          state.medicines[index] = action.payload.medicine;
        }

        // Update selected medicine if it's the same one
        if (state.selectedMedicine?.id === action.payload.medicine.id) {
          state.selectedMedicine = action.payload.medicine;
        }

        // Add to transaction history
        state.transactions.unshift(action.payload.transaction);
      })
      .addCase(executeTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // loadTransactionHistory
    builder
      .addCase(loadTransactionHistory.fulfilled, (state, action) => {
        state.transactions = action.payload;
      });
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

export const {
  setMode,
  selectMedicine,
  clearSelectedMedicine,
  clearError,
} = inventorySlice.actions;

// ============================================================================
// SELECTORS
// ============================================================================

export const selectMedicines = (state: {inventory: InventoryState}) => state.inventory.medicines;
export const selectSelectedMedicine = (state: {inventory: InventoryState}) =>
  state.inventory.selectedMedicine;
export const selectCurrentMode = (state: {inventory: InventoryState}) => state.inventory.currentMode;
export const selectInventoryLoading = (state: {inventory: InventoryState}) => state.inventory.loading;
export const selectInventoryError = (state: {inventory: InventoryState}) => state.inventory.error;
export const selectTransactions = (state: {inventory: InventoryState}) => state.inventory.transactions;

// Get low stock medicines
export const selectLowStockMedicines = (state: {inventory: InventoryState}) =>
  state.inventory.medicines.filter(m => m.currentStock < m.minStock);

// Get medicines sorted by name
export const selectMedicinesSorted = (state: {inventory: InventoryState}) =>
  [...state.inventory.medicines].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

// ============================================================================
// REDUCER
// ============================================================================

export default inventorySlice.reducer;
