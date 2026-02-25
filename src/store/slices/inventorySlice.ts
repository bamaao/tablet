/**
 * Inventory Slice
 *
 * Manages medicine inventory, stock transactions, and operation modes.
 * This is the primary state management for all inventory operations.
 */

import {createSlice, createAsyncThunk, PayloadAction, createSelector} from '@reduxjs/toolkit';
import {getDatabase} from '@/database';
import {
  InventoryMode,
  InventoryState,
  TransactionType,
  UnitType,
  Medicine as MedicineType,
} from '@/types';
import {RootState} from '@/store';
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
      const database = getDatabase();
      const medicinesCollection = database.get<any>('medicines');
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
      const database = getDatabase();
      const medicinesCollection = database.get<any>('medicines');

      // Fetch all medicines and filter in-memory
      // This avoids WatermelonDB query issues with NULL values
      const allMedicines = await medicinesCollection.query().fetch();

      const lowerQuery = query.toLowerCase();
      const results = allMedicines.filter(m =>
        m.name.toLowerCase().includes(lowerQuery) ||
        (m.pinyin && m.pinyin.toLowerCase().includes(lowerQuery))
      );

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
      console.error('Search medicines error:', error);
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
      packageSize?: number; // Package size for this transaction (optional)
      referenceId?: string;
      notes?: string;
    },
    {rejectWithValue},
  ) => {
    try {
      const database = getDatabase();
      const medicinesCollection = database.get<any>('medicines');
      const transactionsCollection = database.get<any>('stock_transactions');

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

      // Check if unit is a package unit
      const isPackageUnit = ['包', '盒', '瓶'].includes(payload.unit);

      // Calculate new stock based on transaction type
      switch (payload.type) {
        case TransactionType.INBOUND:
          // Add stock based on unit type
          if (isPackageUnit) {
            // Package inbound: increase packaged stock
            newPackagedStock = medicine.packagedStock + payload.quantity;
            // Use provided packageSize or fall back to medicine's default
            const currentPackageSize = payload.packageSize || medicine.packageSize;
            finalQuantity = payload.quantity * currentPackageSize; // In base units
          } else {
            // Loose inbound: increase loose stock
            newLooseStock = medicine.looseStock + quantityInBaseUnits;
          }
          break;

        case TransactionType.OUTBOUND:
          // Deduct stock based on unit type
          if (isPackageUnit) {
            // Package outbound: decrease packaged stock
            if (payload.quantity > medicine.packagedStock) {
              return rejectWithValue(
                `包装库存不足。需要 ${payload.quantity} 包，当前只有 ${medicine.packagedStock} 包`
              );
            }
            newPackagedStock = medicine.packagedStock - payload.quantity;
            // Use provided packageSize or fall back to medicine's default
            const currentPackageSize = payload.packageSize || medicine.packageSize;
            finalQuantity = payload.quantity * currentPackageSize;
          } else {
            // Loose outbound: decrease loose stock
            if (quantityInBaseUnits > medicine.looseStock) {
              return rejectWithValue(
                `散装库存不足。需要 ${quantityInBaseUnits} ${medicine.baseUnit}，当前只有 ${medicine.looseStock} ${medicine.baseUnit}`
              );
            }
            newLooseStock = medicine.looseStock - quantityInBaseUnits;
          }
          break;

        case TransactionType.UNPACK:
          // Convert packages to loose (unpack operation)
          const packagesToUnpack = Math.floor(payload.quantity);
          const unpackedAmount = packagesToUnpack * medicine.packageSize;

          if (packagesToUnpack > medicine.packagedStock) {
            return rejectWithValue('包装库存不足，无法拆包');
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
          // Store packageSize for package units, null for loose units
          transaction.packageSize = isPackageUnit
            ? (payload.packageSize ?? medicine.packageSize)
            : null;
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
 * Create a new medicine
 */
export const createMedicine = createAsyncThunk(
  'inventory/createMedicine',
  async (
    payload: {
      name: string;
      pinyin?: string;
      category: string;
      baseUnit: UnitType;
      packageUnit: string;
      packageSize: number;
      minStock: number;
      location?: string;
    },
    {rejectWithValue},
  ) => {
    try {
      const database = getDatabase();
      const medicinesCollection = database.get<any>('medicines');

      const medicine = await medicinesCollection.create(m => {
        m.name = payload.name;
        m.pinyin = payload.pinyin || null;
        m.category = payload.category;
        m.baseUnit = payload.baseUnit;
        m.packageUnit = payload.packageUnit;
        m.packageSize = payload.packageSize;
        m.currentStock = 0;
        m.looseStock = 0;
        m.packagedStock = 0;
        m.minStock = payload.minStock;
        m.location = payload.location || null;
      });

      // Reload all medicines
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
 * Update an existing medicine
 */
export const updateMedicine = createAsyncThunk(
  'inventory/updateMedicine',
  async (
    payload: {
      id: string;
      name: string;
      pinyin?: string;
      category: string;
      baseUnit: UnitType;
      packageUnit: string;
      packageSize: number;
      minStock: number;
      location?: string;
    },
    {rejectWithValue},
  ) => {
    try {
      const database = getDatabase();
      const medicinesCollection = database.get<any>('medicines');
      const medicine = await medicinesCollection.find(payload.id);

      await medicine.update(m => {
        m.name = payload.name;
        m.pinyin = payload.pinyin || null;
        m.category = payload.category;
        m.baseUnit = payload.baseUnit;
        m.packageUnit = payload.packageUnit;
        m.packageSize = payload.packageSize;
        m.minStock = payload.minStock;
        m.location = payload.location || null;
      });

      // Reload all medicines
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
 * Load transaction history for a medicine
 */
export const loadTransactionHistory = createAsyncThunk(
  'inventory/loadTransactionHistory',
  async (medicineId: string, {rejectWithValue}) => {
    try {
      const database = getDatabase();
      const transactionsCollection = database.get<any>('stock_transactions');

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
        packageSize: t.packageSize,
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

    // createMedicine
    builder
      .addCase(createMedicine.pending, state => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(createMedicine.fulfilled, (state, action) => {
        state.loading = false;
        state.medicines = action.payload;
      })
      .addCase(createMedicine.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // updateMedicine
    builder
      .addCase(updateMedicine.pending, state => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(updateMedicine.fulfilled, (state, action) => {
        state.loading = false;
        state.medicines = action.payload;
        // Update selected medicine if it's the same one
        if (state.selectedMedicine) {
          const updated = action.payload.find(m => m.id === state.selectedMedicine?.id);
          if (updated) {
            state.selectedMedicine = updated;
          }
        }
      })
      .addCase(updateMedicine.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
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

export const selectMedicines = (state: any) => state?.inventory?.medicines || [];
export const selectSelectedMedicine = (state: any) =>
  state?.inventory?.selectedMedicine || null;
export const selectCurrentMode = (state: any) => state?.inventory?.currentMode || InventoryMode.INBOUND;
export const selectInventoryLoading = (state: any) => state?.inventory?.loading || false;
export const selectInventoryError = (state: any) => state?.inventory?.error || undefined;
export const selectTransactions = (state: any) => state?.inventory?.transactions || [];

// Get low stock medicines
export const selectLowStockMedicines = (state: any) =>
  state?.inventory?.medicines?.filter(m => m.currentStock < m.minStock) || [];

// Get medicines sorted by name
export const selectMedicinesSorted = (state: any) =>
  [...(state?.inventory?.medicines || [])].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

/**
 * Type for packaged stock grouped by size
 */
export interface PackagedStockBySize {
  packageSize: number;
  count: number;
}

/**
 * Calculate packaged stock grouped by package size for a specific medicine
 *
 * Returns an array of {packageSize, count} objects representing
 * how many packages of each specification are in stock.
 *
 * For example: [{ packageSize: 500, count: 3 }, { packageSize: 250, count: 2 }]
 * means: 3 packages of 500g each, and 2 packages of 250g each
 */
export const selectPackagedStockBySize = createSelector(
  [
    (state: RootState) => state.inventory.transactions,
    (state: RootState, medicineId: string) => medicineId,
    (state: RootState, medicineId: string) => {
      const medicine = state.inventory.medicines.find(m => m.id === medicineId);
      return medicine?.packageSize || 500; // Default package size
    },
  ],
  (transactions, medicineId, defaultPackageSize) => {
    // Group stock by package size
    const stockBySize = new Map<number, number>();

    // Process all transactions for this medicine
    transactions
      .filter(t => t.medicineId === medicineId)
      .forEach(t => {
        const isPackageUnit = ['包', '盒', '瓶'].includes(t.unit);

        if (!isPackageUnit || t.packageSize === null) {
          return; // Skip loose units and transactions without package size
        }

        const size = t.packageSize;
        const quantity = Math.abs(t.quantity); // Get absolute quantity
        const packageCount = quantity / size; // Calculate number of packages

        // Update stock based on transaction type
        switch (t.type) {
          case TransactionType.INBOUND:
            stockBySize.set(size, (stockBySize.get(size) || 0) + packageCount);
            break;
          case TransactionType.OUTBOUND:
            stockBySize.set(size, (stockBySize.get(size) || 0) - packageCount);
            break;
          case TransactionType.UNPACK:
            // Unpack converts packages to loose, so decrease packaged count
            stockBySize.set(size, (stockBySize.get(size) || 0) - packageCount);
            break;
          case TransactionType.AUDIT:
            // Audits typically result in loose stock, ignore for packaged
            break;
        }
      });

    // Convert map to array and filter out zero/negative stock
    return Array.from(stockBySize.entries())
      .map(([packageSize, count]) => ({ packageSize, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.packageSize - a.packageSize); // Sort by package size descending
  }
);

// Note: RootState is imported from @/store/index.ts

// ============================================================================
// REDUCER
// ============================================================================

export default inventorySlice.reducer;
