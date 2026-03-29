/**
 * Audit Slice
 *
 * Manages inventory audit sessions and discrepancy tracking
 * Uses SQLite for data persistence
 */

import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {
  createAuditSessionRepo,
  createAuditRecord,
  getAuditSessionById,
  getAuditRecordsBySessionId,
  completeAuditSession,
  updateAuditSessionProgress,
  AuditSessionRecord,
  AuditRecordRecord,
} from '@/database';
import {getMedicineById, MedicineRecord} from '@/database';
import {AuditState, AuditRecord as AuditRecordType, AuditSession as AuditSessionType, Medicine, UnitType} from '@/types';

// ============================================================================
// TYPE CONVERTERS
// ============================================================================

function sessionRecordToSession(record: AuditSessionRecord): AuditSessionType {
  return {
    id: record.id,
    startedAt: record.started_at,
    completedAt: record.completed_at ?? undefined,
    status: record.status as 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    totalItems: record.total_items,
    completedItems: record.completed_items,
    items: [],
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

function auditRecordToType(record: AuditRecordRecord, medicine?: Medicine): AuditRecordType {
  return {
    id: record.id,
    sessionId: record.session_id,
    medicineId: record.medicine_id,
    medicine: medicine,
    expectedStock: record.expected_stock,
    actualStock: record.actual_stock,
    discrepancy: record.discrepancy,
    unit: record.unit,
    auditedAt: record.audited_at,
    auditedBy: record.audited_by ?? undefined,
    notes: record.notes ?? undefined,
    resolved: record.resolved === 1,
  };
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: AuditState = {
  currentSession: undefined,
  currentRecord: undefined,
  discrepancies: [],
  loading: false,
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Start a new audit session
 */
export const startAuditSession = createAsyncThunk(
  'audit/startSession',
  async (medicineIds: string[], {rejectWithValue}) => {
    try {
      const session = createAuditSessionRepo(medicineIds.length);
      return sessionRecordToSession(session);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

/**
 * Record an audit entry
 */
export const recordAuditEntry = createAsyncThunk(
  'audit/recordEntry',
  async (
    payload: {
      sessionId: string;
      medicineId: string;
      expectedStock: number;
      actualStock: number;
      unit: string;
      notes?: string;
    },
    {rejectWithValue},
  ) => {
    try {
      const medicine = getMedicineById(payload.medicineId);
      if (!medicine) {
        throw new Error('药品不存在');
      }

      const record = createAuditRecord({
        sessionId: payload.sessionId,
        medicineId: payload.medicineId,
        expectedStock: payload.expectedStock,
        actualStock: payload.actualStock,
        unit: payload.unit,
        notes: payload.notes,
      });

      // Update session progress
      const session = getAuditSessionById(payload.sessionId);
      if (session) {
        updateAuditSessionProgress(payload.sessionId, session.completed_items + 1);
      }

      return auditRecordToType(record, medicineRecordToMedicine(medicine));
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

/**
 * Load audit records for a session
 */
export const loadAuditRecords = createAsyncThunk(
  'audit/loadRecords',
  async (sessionId: string, {rejectWithValue}) => {
    try {
      const records = getAuditRecordsBySessionId(sessionId);
      const result: AuditRecordType[] = [];

      for (const record of records) {
        const medicine = getMedicineById(record.medicine_id);
        result.push(auditRecordToType(record, medicine ? medicineRecordToMedicine(medicine) : undefined));
      }

      return result;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

/**
 * Complete audit session
 */
export const completeAuditSessionThunk = createAsyncThunk(
  'audit/completeSession',
  async (sessionId: string, {rejectWithValue}) => {
    try {
      const session = completeAuditSessionRepo(sessionId);
      return sessionRecordToSession(session);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

// ============================================================================
// SLICE
// ============================================================================

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    setCurrentRecord: (state, action: PayloadAction<AuditRecordType | undefined>) => {
      state.currentRecord = action.payload;
    },

    clearSession: state => {
      state.currentSession = undefined;
      state.currentRecord = undefined;
      state.discrepancies = [];
    },
  },
  extraReducers: builder => {
    builder
      .addCase(startAuditSession.pending, state => {
        state.loading = true;
      })
      .addCase(startAuditSession.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload;
      })
      .addCase(startAuditSession.rejected, state => {
        state.loading = false;
      })

      .addCase(recordAuditEntry.pending, state => {
        state.loading = true;
      })
      .addCase(recordAuditEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRecord = action.payload;

        if (action.payload.discrepancy !== 0) {
          state.discrepancies.push(action.payload);
        }

        if (state.currentSession) {
          state.currentSession.completedItems += 1;
        }
      })
      .addCase(recordAuditEntry.rejected, state => {
        state.loading = false;
      })

      .addCase(loadAuditRecords.fulfilled, (state, action) => {
        state.discrepancies = action.payload.filter(r => r.discrepancy !== 0);
      })

      .addCase(completeAuditSessionThunk.fulfilled, (state, action) => {
        if (state.currentSession?.id === action.payload.id) {
          state.currentSession = {
            ...state.currentSession,
            ...action.payload,
          };
        }
      });
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

export const {setCurrentRecord, clearSession} = auditSlice.actions;

// Export for backward compatibility
export { completeAuditSessionThunk as completeAuditSession };

// ============================================================================
// SELECTORS
// ============================================================================

export const selectCurrentSession = (state: any) => state?.audit?.currentSession || null;
export const selectCurrentRecord = (state: any) => state?.audit?.currentRecord || null;
export const selectDiscrepancies = (state: any) => state?.audit?.discrepancies || [];
export const selectAuditLoading = (state: any) => state?.audit?.loading || false;

export const selectTotalDiscrepancy = (state: any) =>
  (state?.audit?.discrepancies || []).reduce((sum, r) => sum + r.discrepancy, 0);

// ============================================================================
// REDUCER
// ============================================================================

export default auditSlice.reducer;
