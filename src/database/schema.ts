/**
 * WatermelonDB Schema Definition
 *
 * This schema defines all database tables and their relationships.
 * All data persistence depends on this schema being correct.
 *
 * @see https://watermelondb.dev/docs/Schema
 */

import {appSchema, tableSchema} from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // ========================================================================
    // MEDICINES TABLE
    // ========================================================================
    tableSchema({
      name: 'medicines',
      columns: [
        {name: 'name', type: 'string'},
        {name: 'pinyin', type: 'string', isOptional: true},
        {name: 'category', type: 'string'}, // CHINESE_HERB, CHINESE_PATENT, WESTERN_MEDICINE, SUPPLIES
        {name: 'base_unit', type: 'string'}, // g or ml (base measurement unit)
        {name: 'package_unit', type: 'string'}, // 包, 盒, etc.
        {name: 'package_size', type: 'number'}, // Size of one package in base units
        {name: 'current_stock', type: 'number'}, // Total stock in base units (denormalized for performance)
        {name: 'loose_stock', type: 'number'}, // Loose/unpackaged stock in base units
        {name: 'packaged_stock', type: 'number'}, // Packaged stock (count of packages, not base units)
        {name: 'min_stock', type: 'number'}, // Minimum stock threshold in base units
        {name: 'location', type: 'string', isOptional: true},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),

    // ========================================================================
    // STOCK TRANSACTIONS TABLE
    // ========================================================================
    tableSchema({
      name: 'stock_transactions',
      columns: [
        {name: 'medicine_id', type: 'string', isIndexed: true},
        {name: 'type', type: 'string'}, // INBOUND, OUTBOUND, UNPACK, AUDIT
        {name: 'quantity', type: 'number'}, // Quantity in base units
        {name: 'unit', type: 'string'}, // Original unit for display
        {name: 'before_stock', type: 'number'}, // Stock before transaction
        {name: 'after_stock', type: 'number'}, // Stock after transaction
        {name: 'reference_id', type: 'string', isOptional: true}, // prescription_id, audit_id, etc.
        {name: 'notes', type: 'string', isOptional: true},
        {name: 'created_at', type: 'number'},
        {name: 'synced', type: 'boolean'}, // Sync status for server sync
      ],
    }),

    // ========================================================================
    // PRESCRIPTIONS TABLE
    // ========================================================================
    tableSchema({
      name: 'prescriptions',
      columns: [
        {name: 'name', type: 'string'},
        {name: 'pinyin', type: 'string', isOptional: true},
        {name: 'description', type: 'string', isOptional: true},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),

    // ========================================================================
    // PRESCRIPTION ITEMS TABLE
    // ========================================================================
    tableSchema({
      name: 'prescription_items',
      columns: [
        {name: 'prescription_id', type: 'string', isIndexed: true},
        {name: 'medicine_id', type: 'string', isIndexed: true},
        {name: 'quantity', type: 'number'}, // Per-dose quantity in base units
        {name: 'unit', type: 'string'}, // Unit for this ingredient
        {name: 'created_at', type: 'number'},
      ],
    }),

    // ========================================================================
    // AUDIT RECORDS TABLE
    // ========================================================================
    tableSchema({
      name: 'audit_records',
      columns: [
        {name: 'session_id', type: 'string', isIndexed: true}, // Group audits into sessions
        {name: 'medicine_id', type: 'string', isIndexed: true},
        {name: 'expected_stock', type: 'number'}, // Expected stock in base units
        {name: 'actual_stock', type: 'number'}, // Actual counted stock in base units
        {name: 'discrepancy', type: 'number'}, // Difference (actual - expected)
        {name: 'unit', type: 'string'}, // Unit used for audit
        {name: 'audited_at', type: 'number'},
        {name: 'audited_by', type: 'string', isOptional: true},
        {name: 'notes', type: 'string', isOptional: true},
        {name: 'resolved', type: 'boolean'}, // Whether discrepancy has been addressed
      ],
    }),

    // ========================================================================
    // AUDIT SESSIONS TABLE
    // ========================================================================
    tableSchema({
      name: 'audit_sessions',
      columns: [
        {name: 'started_at', type: 'number'},
        {name: 'completed_at', type: 'number', isOptional: true},
        {name: 'status', type: 'string'}, // IN_PROGRESS, COMPLETED, CANCELLED
        {name: 'total_items', type: 'number'}, // Total items to audit
        {name: 'completed_items', type: 'number'}, // Items audited so far
      ],
    }),
  ],
});
