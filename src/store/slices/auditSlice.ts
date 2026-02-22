/**
 * Audit Slice
 *
 * Manages inventory audit sessions and discrepancy tracking
 */

import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {database} from '@/database';
import {AuditRecord} from '@/database/models/AuditRecord';
import {AuditSession as AuditSessionModel} from '@/database/models/AuditSession';
import {AuditState, AuditRecord as AuditRecordType, AuditSession as AuditSessionType} from '@/types';
import Q from '@nozbe/watermelondb/Query';

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
      const sessionsCollection = database.get<AuditSessionModel>('audit_sessions');

      const session = await sessionsCollection.create(s => {
        s.startedAt = new Date();
        s.status = 'IN_PROGRESS';
        s.totalItems = medicineIds.length;
        s.completedItems = 0;
      });

      return {
        id: session.id,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        status: session.status,
        totalItems: session.totalItems,
        completedItems: session.completedItems,
        items: [],
      } as AuditSessionType;
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
      const recordsCollection = database.get<AuditRecord>('audit_records');
      const medicinesCollection = database.get('medicines');

      const medicine = await medicinesCollection.find(payload.medicineId);

      const discrepancy = payload.actualStock - payload.expectedStock;

      const record = await recordsCollection.create(r => {
        r.sessionId = payload.sessionId;
        r.medicineId = payload.medicineId;
        r.expectedStock = payload.expectedStock;
        r.actualStock = payload.actualStock;
        r.discrepancy = discrepancy;
        r.unit = payload.unit;
        r.auditedAt = new Date();
        r.notes = payload.notes;
        r.resolved = false;
      });

      return {
        id: record.id,
        sessionId: record.sessionId,
        medicineId: record.medicineId,
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
        expectedStock: record.expectedStock,
        actualStock: record.actualStock,
        discrepancy: record.discrepancy,
        unit: record.unit,
        auditedAt: record.auditedAt,
        auditedBy: record.auditedBy,
        notes: record.notes,
        resolved: record.resolved,
      } as AuditRecordType;
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
      const recordsCollection = database.get<AuditRecord>('audit_records');
      const records = await recordsCollection
        .query(Q.where('session_id', sessionId))
        .fetch();

      return records.map(r => ({
        id: r.id,
        sessionId: r.sessionId,
        medicineId: r.medicineId,
        expectedStock: r.expectedStock,
        actualStock: r.actualStock,
        discrepancy: r.discrepancy,
        unit: r.unit,
        auditedAt: r.auditedAt,
        auditedBy: r.auditedBy,
        notes: r.notes,
        resolved: r.resolved,
      })) as AuditRecordType[];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

/**
 * Complete audit session
 */
export const completeAuditSession = createAsyncThunk(
  'audit/completeSession',
  async (sessionId: string, {rejectWithValue}) => {
    try {
      const sessionsCollection = database.get<AuditSessionModel>('audit_sessions');
      const session = await sessionsCollection.find(sessionId);

      await session.update(s => {
        s.completedAt = new Date();
        s.status = 'COMPLETED';
      });

      return {
        id: session.id,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        status: session.status,
        totalItems: session.totalItems,
        completedItems: session.completedItems,
      };
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
    /**
     * Set current record for editing
     */
    setCurrentRecord: (state, action: PayloadAction<AuditRecordType | undefined>) => {
      state.currentRecord = action.payload;
    },

    /**
     * Clear current session
     */
    clearSession: state => {
      state.currentSession = undefined;
      state.currentRecord = undefined;
      state.discrepancies = [];
    },
  },
  extraReducers: builder => {
    builder
      // startAuditSession
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

      // recordAuditEntry
      .addCase(recordAuditEntry.pending, state => {
        state.loading = true;
      })
      .addCase(recordAuditEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRecord = action.payload;

        // Add to discrepancies if there's a discrepancy
        if (action.payload.discrepancy !== 0) {
          state.discrepancies.push(action.payload);
        }

        // Update session progress
        if (state.currentSession) {
          state.currentSession.completedItems += 1;
        }
      })
      .addCase(recordAuditEntry.rejected, state => {
        state.loading = false;
      })

      // loadAuditRecords
      .addCase(loadAuditRecords.fulfilled, (state, action) => {
        state.discrepancies = action.payload.filter(r => r.discrepancy !== 0);
      })

      // completeAuditSession
      .addCase(completeAuditSession.fulfilled, (state, action) => {
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

// ============================================================================
// SELECTORS
// ============================================================================

export const selectCurrentSession = (state: {audit: AuditState}) => state.audit.currentSession;
export const selectCurrentRecord = (state: {audit: AuditState}) => state.audit.currentRecord;
export const selectDiscrepancies = (state: {audit: AuditState}) => state.audit.discrepancies;
export const selectAuditLoading = (state: {audit: AuditState}) => state.audit.loading;

export const selectTotalDiscrepancy = (state: {audit: AuditState}) =>
  state.audit.discrepancies.reduce((sum, r) => sum + r.discrepancy, 0);

// ============================================================================
// REDUCER
// ============================================================================

export default auditSlice.reducer;
