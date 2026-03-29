/**
 * Inventory Slice
 *
 * Manages medicine inventory, stock transactions, and operation modes.
 * Uses SQLite for data persistence.
 */

import {createSlice, createAsyncThunk, PayloadAction, createSelector} from '@reduxjs/toolkit';
import {
  getAllMedicines,
  getMedicineById,
  searchMedicines as searchMedicinesRepo,
  createMedicine as createMedicineRepo,
  updateMedicine as updateMedicineRepo,
  MedicineRecord,
  CreateMedicineData,
  UpdateMedicineData,
  getTransactionsByMedicineId,
  executeStockTransaction,
  StockTransactionRecord,
} from '@/database';
import {
  InventoryMode,
  InventoryState,
  TransactionType,
  UnitType,
  Medicine as MedicineType,
} from '@/types';
import {RootState} from '@/store';

// ============================================================================
// TYPE CONVERTERS
// ============================================================================

function recordToMedicine(record: MedicineRecord): MedicineType {
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

function recordToTransaction(record: StockTransactionRecord) {
  return {
    id: record.id,
    medicineId: record.medicine_id,
    type: record.type as TransactionType,
    quantity: record.quantity,
    unit: record.unit,
    packageSize: record.package_size ?? undefined,
    beforeStock: record.before_stock,
    afterStock: record.after_stock,
    referenceId: record.reference_id ?? undefined,
    notes: record.notes ?? undefined,
    createdAt: record.created_at,
    synced: record.synced === 1,
  };
}

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

export const loadMedicines = createAsyncThunk(
  'inventory/loadMedicines',
  async (_, {rejectWithValue}) => {
    try {
      const records = getAllMedicines();
      return records.map(recordToMedicine);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const searchMedicines = createAsyncThunk(
  'inventory/searchMedicines',
  async (query: string, {rejectWithValue}) => {
    try {
      const records = searchMedicinesRepo(query);
      return records.map(recordToMedicine);
    } catch (error) {
      console.error('Search medicines error:', error);
      return rejectWithValue((error as Error).message);
    }
  },
);

export const executeTransaction = createAsyncThunk(
  'inventory/executeTransaction',
  async (
    payload: {
      medicineId: string;
      type: TransactionType;
      quantity: number;
      unit: UnitType;
      packageSize?: number;
      referenceId?: string;
      notes?: string;
    },
    {rejectWithValue},
  ) => {
    try {
      const medicineRecord = getMedicineById(payload.medicineId);
      if (!medicineRecord) {
        return rejectWithValue('药品不存在');
      }

      const result = executeStockTransaction(
        payload.medicineId,
        payload.type,
        payload.quantity,
        payload.unit,
        payload.packageSize ?? medicineRecord.package_size,
        medicineRecord.loose_stock,
        medicineRecord.packaged_stock,
        medicineRecord.package_size,
        payload.referenceId,
        payload.notes,
      );

      const updatedMedicine = getMedicineById(payload.medicineId)!;

      return {
        medicine: recordToMedicine(updatedMedicine),
        transaction: recordToTransaction(result.transaction),
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const createMedicineThunk = createAsyncThunk(
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
      // Check if medicine with same name already exists
      const existingMedicines = searchMedicinesRepo(payload.name);
      const exactMatch = existingMedicines.find(
        m => m.name.toLowerCase() === payload.name.toLowerCase()
      );
      if (exactMatch) {
        return rejectWithValue(`药品 "${payload.name}" 已存在`);
      }

      const data: CreateMedicineData = {
        name: payload.name,
        pinyin: payload.pinyin,
        category: payload.category,
        baseUnit: payload.baseUnit,
        packageUnit: payload.packageUnit,
        packageSize: payload.packageSize,
        minStock: payload.minStock,
        location: payload.location,
      };

      createMedicineRepo(data);
      const allMedicines = getAllMedicines();
      return allMedicines.map(recordToMedicine);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const updateMedicineThunk = createAsyncThunk(
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
      const data: UpdateMedicineData = {
        name: payload.name,
        pinyin: payload.pinyin,
        category: payload.category,
        baseUnit: payload.baseUnit,
        packageUnit: payload.packageUnit,
        packageSize: payload.packageSize,
        minStock: payload.minStock,
        location: payload.location,
      };

      updateMedicineRepo(payload.id, data);
      const allMedicines = getAllMedicines();
      return allMedicines.map(recordToMedicine);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const loadTransactionHistory = createAsyncThunk(
  'inventory/loadTransactionHistory',
  async (medicineId: string, {rejectWithValue}) => {
    try {
      const records = getTransactionsByMedicineId(medicineId, 50);
      return records.map(recordToTransaction);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const deleteMedicineThunk = createAsyncThunk(
  'inventory/deleteMedicine',
  async (medicineId: string, {rejectWithValue}) => {
    try {
      const {deleteMedicine} = await import('@/database');
      deleteMedicine(medicineId);
      const allMedicines = getAllMedicines();
      return allMedicines.map(recordToMedicine);
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
    setMode: (state, action: PayloadAction<InventoryMode>) => {
      state.currentMode = action.payload;
      state.selectedMedicine = undefined;
    },
    selectMedicine: (state, action: PayloadAction<MedicineType>) => {
      state.selectedMedicine = action.payload;
    },
    clearSelectedMedicine: state => {
      state.selectedMedicine = undefined;
    },
    clearError: state => {
      state.error = undefined;
    },
  },
  extraReducers: builder => {
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
      })
      .addCase(searchMedicines.fulfilled, (state, action) => {
        state.medicines = action.payload;
      })
      .addCase(executeTransaction.pending, state => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(executeTransaction.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.medicines.findIndex(m => m.id === action.payload.medicine.id);
        if (index !== -1) {
          state.medicines[index] = action.payload.medicine;
        }
        if (state.selectedMedicine?.id === action.payload.medicine.id) {
          state.selectedMedicine = action.payload.medicine;
        }
        state.transactions.unshift(action.payload.transaction);
      })
      .addCase(executeTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createMedicineThunk.pending, state => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(createMedicineThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.medicines = action.payload;
      })
      .addCase(createMedicineThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateMedicineThunk.pending, state => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(updateMedicineThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.medicines = action.payload;
        if (state.selectedMedicine) {
          const updated = action.payload.find(m => m.id === state.selectedMedicine?.id);
          if (updated) {
            state.selectedMedicine = updated;
          }
        }
      })
      .addCase(updateMedicineThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadTransactionHistory.fulfilled, (state, action) => {
        state.transactions = action.payload;
      })
      .addCase(deleteMedicineThunk.pending, state => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(deleteMedicineThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.medicines = action.payload;
        state.selectedMedicine = undefined;
      })
      .addCase(deleteMedicineThunk.rejected, (state, action) => {
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

export { createMedicineThunk as createMedicine, updateMedicineThunk as updateMedicine, deleteMedicineThunk as deleteMedicine };

// ============================================================================
// SELECTORS
// ============================================================================

export const selectMedicines = (state: RootState) => state.inventory.medicines;
export const selectSelectedMedicine = (state: RootState) => state.inventory.selectedMedicine;
export const selectCurrentMode = (state: RootState) => state.inventory.currentMode;
export const selectInventoryLoading = (state: RootState) => state.inventory.loading;
export const selectInventoryError = (state: RootState) => state.inventory.error;
export const selectTransactions = (state: RootState) => state.inventory.transactions;

export const selectLowStockMedicines = (state: RootState) =>
  state.inventory.medicines.filter(m => m.currentStock < m.minStock);

export const selectMedicinesSorted = (state: RootState) =>
  [...state.inventory.medicines].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

export interface PackagedStockBySize {
  packageSize: number;
  count: number;
}

export const selectPackagedStockBySize = createSelector(
  [
    (state: RootState) => state.inventory.transactions,
    (_state: RootState, medicineId: string) => medicineId,
  ],
  (transactions, medicineId) => {
    if (!medicineId) return [];

    const medicineTransactions = transactions.filter(t => t.medicineId === medicineId);
    if (medicineTransactions.length === 0) return [];

    const stockBySize = new Map<number, number>();

    medicineTransactions.forEach(t => {
      const isPackageUnit = ['包', '盒', '瓶'].includes(t.unit);
      if (!isPackageUnit || t.packageSize == null) return;

      const size = t.packageSize;
      const quantity = Math.abs(t.quantity);
      const packageCount = quantity / size;

      switch (t.type) {
        case TransactionType.INBOUND:
          stockBySize.set(size, (stockBySize.get(size) || 0) + packageCount);
          break;
        case TransactionType.OUTBOUND:
          stockBySize.set(size, (stockBySize.get(size) || 0) - packageCount);
          break;
        case TransactionType.UNPACK:
          stockBySize.set(size, (stockBySize.get(size) || 0) - packageCount);
          break;
      }
    });

    return Array.from(stockBySize.entries())
      .map(([packageSize, count]) => ({ packageSize, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.packageSize - a.packageSize);
  }
);

// ============================================================================
// REDUCER
// ============================================================================

export default inventorySlice.reducer;
