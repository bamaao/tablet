/**
 * SQLite Database Service
 *
 * Provides direct SQLite access using react-native-quick-sqlite
 */

import {open, QuickSQLiteConnection, ResultSet} from 'react-native-quick-sqlite';
import {UnitType, TransactionType} from '@/types';

// Database connection
let db: QuickSQLiteConnection | null = null;

/**
 * Get database connection (singleton)
 */
export function getDatabase(): QuickSQLiteConnection {
  if (!db) {
    db = open({name: 'medical_inventory.db'});
    initializeDatabase(db);
  }
  return db;
}

/**
 * Initialize database schema
 */
function initializeDatabase(database: QuickSQLiteConnection): void {
  // Create medicines table
  database.execute(`
    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pinyin TEXT,
      category TEXT NOT NULL,
      base_unit TEXT NOT NULL,
      package_unit TEXT NOT NULL,
      package_size REAL NOT NULL DEFAULT 500,
      current_stock REAL NOT NULL DEFAULT 0,
      loose_stock REAL NOT NULL DEFAULT 0,
      packaged_stock REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 0,
      location TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  database.execute(`CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name)`);
  database.execute(`CREATE INDEX IF NOT EXISTS idx_medicines_pinyin ON medicines(pinyin)`);

  // Create stock_transactions table
  database.execute(`
    CREATE TABLE IF NOT EXISTS stock_transactions (
      id TEXT PRIMARY KEY,
      medicine_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      package_size REAL,
      before_stock REAL NOT NULL,
      after_stock REAL NOT NULL,
      reference_id TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id)
    )
  `);

  database.execute(`CREATE INDEX IF NOT EXISTS idx_transactions_medicine_id ON stock_transactions(medicine_id)`);
  database.execute(`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON stock_transactions(created_at)`);

  // Create prescriptions table
  database.execute(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pinyin TEXT,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Create prescription_items table
  database.execute(`
    CREATE TABLE IF NOT EXISTS prescription_items (
      id TEXT PRIMARY KEY,
      prescription_id TEXT NOT NULL,
      medicine_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
      FOREIGN KEY (medicine_id) REFERENCES medicines(id)
    )
  `);

  database.execute(`CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON prescription_items(prescription_id)`);

  // Create audit_sessions table
  database.execute(`
    CREATE TABLE IF NOT EXISTS audit_sessions (
      id TEXT PRIMARY KEY,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      status TEXT NOT NULL,
      total_items INTEGER NOT NULL DEFAULT 0,
      completed_items INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Create audit_records table
  database.execute(`
    CREATE TABLE IF NOT EXISTS audit_records (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      medicine_id TEXT NOT NULL,
      expected_stock REAL NOT NULL,
      actual_stock REAL NOT NULL,
      discrepancy REAL NOT NULL,
      unit TEXT NOT NULL,
      audited_at INTEGER NOT NULL,
      audited_by TEXT,
      notes TEXT,
      resolved INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES audit_sessions(id),
      FOREIGN KEY (medicine_id) REFERENCES medicines(id)
    )
  `);

  database.execute(`CREATE INDEX IF NOT EXISTS idx_audit_records_session_id ON audit_records(session_id)`);

  console.log('SQLite database initialized');
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Run a SELECT query and return results
 */
export function query<T = any>(sql: string, params: any[] = []): T[] {
  const database = getDatabase();
  const result = database.execute(sql, params);
  if (result.error) {
    throw new Error(`Query error: ${result.error.message}`);
  }
  return (result as ResultSet).rows?._array || [];
}

/**
 * Run an INSERT, UPDATE, or DELETE query
 */
export function execute(sql: string, params: any[] = []): { insertId?: number; rowsAffected: number } {
  const database = getDatabase();
  const result = database.execute(sql, params);
  if (result.error) {
    throw new Error(`Execute error: ${result.error.message}`);
  }
  return {
    insertId: (result as ResultSet).insertId,
    rowsAffected: (result as ResultSet).rowsAffected,
  };
}

/**
 * Run multiple statements in a transaction
 */
export function runTransaction(callback: () => void): void {
  const database = getDatabase();
  database.transaction(() => {
    callback();
  });
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ============================================================================
// MEDICINE TYPES & REPOSITORY
// ============================================================================

export interface MedicineRecord {
  id: string;
  name: string;
  pinyin: string | null;
  category: string;
  base_unit: string;
  package_unit: string;
  package_size: number;
  current_stock: number;
  loose_stock: number;
  packaged_stock: number;
  min_stock: number;
  location: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateMedicineData {
  name: string;
  pinyin?: string;
  category: string;
  baseUnit: UnitType;
  packageUnit: string;
  packageSize: number;
  minStock: number;
  location?: string;
}

export interface UpdateMedicineData {
  name: string;
  pinyin?: string;
  category: string;
  baseUnit: UnitType;
  packageUnit: string;
  packageSize: number;
  minStock: number;
  location?: string;
}

export function getAllMedicines(): MedicineRecord[] {
  return query<MedicineRecord>('SELECT * FROM medicines ORDER BY name');
}

export function getMedicineById(id: string): MedicineRecord | null {
  const results = query<MedicineRecord>('SELECT * FROM medicines WHERE id = ?', [id]);
  return results.length > 0 ? results[0] : null;
}

export function searchMedicines(searchTerm: string): MedicineRecord[] {
  const term = `%${searchTerm.toLowerCase()}%`;
  return query<MedicineRecord>(
    `SELECT * FROM medicines
     WHERE LOWER(name) LIKE ? OR LOWER(pinyin) LIKE ? OR LOWER(COALESCE(pinyin, '')) LIKE ?
     ORDER BY name`,
    [term, term, term]
  );
}

export function createMedicine(data: CreateMedicineData): MedicineRecord {
  const id = generateId();
  const now = Date.now();

  execute(
    `INSERT INTO medicines (
      id, name, pinyin, category, base_unit, package_unit, package_size,
      current_stock, loose_stock, packaged_stock, min_stock, location,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.pinyin || null,
      data.category,
      data.baseUnit,
      data.packageUnit,
      data.packageSize,
      data.minStock,
      data.location || null,
      now,
      now,
    ]
  );

  return getMedicineById(id)!;
}

export function updateMedicine(id: string, data: UpdateMedicineData): MedicineRecord {
  const now = Date.now();

  execute(
    `UPDATE medicines SET
      name = ?, pinyin = ?, category = ?, base_unit = ?, package_unit = ?,
      package_size = ?, min_stock = ?, location = ?, updated_at = ?
    WHERE id = ?`,
    [
      data.name,
      data.pinyin || null,
      data.category,
      data.baseUnit,
      data.packageUnit,
      data.packageSize,
      data.minStock,
      data.location || null,
      now,
      id,
    ]
  );

  return getMedicineById(id)!;
}

export function updateMedicineStock(
  id: string,
  looseStock: number,
  packagedStock: number,
  packageSize: number
): MedicineRecord {
  const now = Date.now();
  const currentStock = looseStock + packagedStock * packageSize;

  execute(
    `UPDATE medicines SET
      loose_stock = ?, packaged_stock = ?, current_stock = ?, updated_at = ?
    WHERE id = ?`,
    [looseStock, packagedStock, currentStock, now, id]
  );

  return getMedicineById(id)!;
}

/**
 * Delete a medicine and its related transactions
 */
export function deleteMedicine(id: string): void {
  // Delete related transactions first
  execute('DELETE FROM stock_transactions WHERE medicine_id = ?', [id]);
  // Delete related prescription items
  execute('DELETE FROM prescription_items WHERE medicine_id = ?', [id]);
  // Delete related audit records
  execute('DELETE FROM audit_records WHERE medicine_id = ?', [id]);
  // Delete the medicine
  execute('DELETE FROM medicines WHERE id = ?', [id]);
}

// ============================================================================
// STOCK TRANSACTION TYPES & REPOSITORY
// ============================================================================

export interface StockTransactionRecord {
  id: string;
  medicine_id: string;
  type: string;
  quantity: number;
  unit: string;
  package_size: number | null;
  before_stock: number;
  after_stock: number;
  reference_id: string | null;
  notes: string | null;
  created_at: number;
  synced: number;
}

export function getTransactionsByMedicineId(medicineId: string, limit = 50): StockTransactionRecord[] {
  return query<StockTransactionRecord>(
    `SELECT * FROM stock_transactions
     WHERE medicine_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [medicineId, limit]
  );
}

export function executeStockTransaction(
  medicineId: string,
  type: TransactionType,
  quantity: number,
  unit: string,
  packageSize: number,
  currentLooseStock: number,
  currentPackagedStock: number,
  medicinePackageSize: number,
  referenceId?: string,
  notes?: string
): { newLooseStock: number; newPackagedStock: number; transaction: StockTransactionRecord } {
  const id = generateId();
  const now = Date.now();

  let newLooseStock = currentLooseStock;
  let newPackagedStock = currentPackagedStock;
  let finalQuantity = quantity;
  const isPackageUnit = ['包', '盒', '瓶'].includes(unit);

  const beforeStock = currentLooseStock + currentPackagedStock * medicinePackageSize;

  switch (type) {
    case TransactionType.INBOUND:
      if (isPackageUnit) {
        newPackagedStock = currentPackagedStock + quantity;
        finalQuantity = quantity * packageSize;
      } else {
        newLooseStock = currentLooseStock + quantity;
      }
      break;

    case TransactionType.OUTBOUND:
      if (isPackageUnit) {
        if (quantity > currentPackagedStock) {
          throw new Error(`包装库存不足。需要 ${quantity} 包，当前只有 ${currentPackagedStock} 包`);
        }
        newPackagedStock = currentPackagedStock - quantity;
        finalQuantity = quantity * packageSize;
      } else {
        if (quantity > currentLooseStock) {
          throw new Error(`散装库存不足。需要 ${quantity}，当前只有 ${currentLooseStock}`);
        }
        newLooseStock = currentLooseStock - quantity;
      }
      break;

    case TransactionType.UNPACK:
      const packagesToUnpack = Math.floor(quantity);
      if (packagesToUnpack > currentPackagedStock) {
        throw new Error('包装库存不足，无法拆包');
      }
      newPackagedStock = currentPackagedStock - packagesToUnpack;
      newLooseStock = currentLooseStock + packagesToUnpack * medicinePackageSize;
      finalQuantity = packagesToUnpack * medicinePackageSize;
      break;

    case TransactionType.AUDIT:
      newLooseStock = quantity;
      newPackagedStock = 0;
      finalQuantity = quantity - beforeStock;
      break;

    default:
      throw new Error('Unknown transaction type');
  }

  const afterStock = newLooseStock + newPackagedStock * medicinePackageSize;

  runTransaction(() => {
    execute(
      `INSERT INTO stock_transactions (
        id, medicine_id, type, quantity, unit, package_size,
        before_stock, after_stock, reference_id, notes, created_at, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id,
        medicineId,
        type,
        finalQuantity,
        unit,
        isPackageUnit ? packageSize : null,
        beforeStock,
        afterStock,
        referenceId || null,
        notes || null,
        now,
      ]
    );

    updateMedicineStock(medicineId, newLooseStock, newPackagedStock, medicinePackageSize);
  });

  const transactionRecord = query<StockTransactionRecord>(
    'SELECT * FROM stock_transactions WHERE id = ?',
    [id]
  )[0];

  return {
    newLooseStock,
    newPackagedStock,
    transaction: transactionRecord,
  };
}

// ============================================================================
// PRESCRIPTION TYPES & REPOSITORY
// ============================================================================

export interface PrescriptionRecord {
  id: string;
  name: string;
  pinyin: string | null;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export interface PrescriptionItemRecord {
  id: string;
  prescription_id: string;
  medicine_id: string;
  quantity: number;
  unit: string;
  created_at: number;
}

export function getAllPrescriptions(): PrescriptionRecord[] {
  return query<PrescriptionRecord>('SELECT * FROM prescriptions ORDER BY name');
}

export function getPrescriptionById(id: string): PrescriptionRecord | null {
  const results = query<PrescriptionRecord>('SELECT * FROM prescriptions WHERE id = ?', [id]);
  return results.length > 0 ? results[0] : null;
}

export function getPrescriptionItems(prescriptionId: string): PrescriptionItemRecord[] {
  return query<PrescriptionItemRecord>(
    'SELECT * FROM prescription_items WHERE prescription_id = ?',
    [prescriptionId]
  );
}

export function createPrescription(data: { name: string; pinyin?: string; description?: string }): PrescriptionRecord {
  const id = generateId();
  const now = Date.now();

  execute(
    `INSERT INTO prescriptions (id, name, pinyin, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.pinyin || null, data.description || null, now, now]
  );

  return getPrescriptionById(id)!;
}

export function updatePrescriptionRepo(
  id: string,
  data: { name?: string; pinyin?: string; description?: string }
): PrescriptionRecord {
  const now = Date.now();

  execute(
    `UPDATE prescriptions SET name = ?, pinyin = ?, description = ?, updated_at = ? WHERE id = ?`,
    [data.name || '', data.pinyin || null, data.description || null, now, id]
  );

  return getPrescriptionById(id)!;
}

export function deletePrescription(id: string): void {
  execute('DELETE FROM prescription_items WHERE prescription_id = ?', [id]);
  execute('DELETE FROM prescriptions WHERE id = ?', [id]);
}

export function addPrescriptionItem(data: { prescriptionId: string; medicineId: string; quantity: number; unit: string }): PrescriptionItemRecord {
  const id = generateId();
  const now = Date.now();

  execute(
    `INSERT INTO prescription_items (id, prescription_id, medicine_id, quantity, unit, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.prescriptionId, data.medicineId, data.quantity, data.unit, now]
  );

  return query<PrescriptionItemRecord>('SELECT * FROM prescription_items WHERE id = ?', [id])[0];
}

export function clearPrescriptionItems(prescriptionId: string): void {
  execute('DELETE FROM prescription_items WHERE prescription_id = ?', [prescriptionId]);
}

// ============================================================================
// AUDIT TYPES & REPOSITORY
// ============================================================================

export interface AuditSessionRecord {
  id: string;
  started_at: number;
  completed_at: number | null;
  status: string;
  total_items: number;
  completed_items: number;
}

export interface AuditRecordRecord {
  id: string;
  session_id: string;
  medicine_id: string;
  expected_stock: number;
  actual_stock: number;
  discrepancy: number;
  unit: string;
  audited_at: number;
  audited_by: string | null;
  notes: string | null;
  resolved: number;
}

export function createAuditSessionRepo(totalItems: number): AuditSessionRecord {
  const id = generateId();
  const now = Date.now();

  execute(
    `INSERT INTO audit_sessions (id, started_at, completed_at, status, total_items, completed_items)
     VALUES (?, ?, NULL, 'IN_PROGRESS', ?, 0)`,
    [id, now, totalItems]
  );

  return query<AuditSessionRecord>('SELECT * FROM audit_sessions WHERE id = ?', [id])[0];
}

export function getAuditSessionById(id: string): AuditSessionRecord | null {
  const results = query<AuditSessionRecord>('SELECT * FROM audit_sessions WHERE id = ?', [id]);
  return results.length > 0 ? results[0] : null;
}

export function updateAuditSessionProgress(id: string, completedItems: number): AuditSessionRecord {
  execute(
    'UPDATE audit_sessions SET completed_items = ? WHERE id = ?',
    [completedItems, id]
  );
  return getAuditSessionById(id)!;
}

export function completeAuditSession(id: string): AuditSessionRecord {
  const now = Date.now();
  execute(
    "UPDATE audit_sessions SET completed_at = ?, status = 'COMPLETED' WHERE id = ?",
    [now, id]
  );
  return getAuditSessionById(id)!;
}

export function getAuditRecordsBySessionId(sessionId: string): AuditRecordRecord[] {
  return query<AuditRecordRecord>(
    'SELECT * FROM audit_records WHERE session_id = ? ORDER BY audited_at',
    [sessionId]
  );
}

export function createAuditRecord(data: {
  sessionId: string;
  medicineId: string;
  expectedStock: number;
  actualStock: number;
  unit: string;
  auditedBy?: string;
  notes?: string;
}): AuditRecordRecord {
  const id = generateId();
  const now = Date.now();
  const discrepancy = data.actualStock - data.expectedStock;

  execute(
    `INSERT INTO audit_records (
      id, session_id, medicine_id, expected_stock, actual_stock, discrepancy,
      unit, audited_at, audited_by, notes, resolved
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      data.sessionId,
      data.medicineId,
      data.expectedStock,
      data.actualStock,
      discrepancy,
      data.unit,
      now,
      data.auditedBy || null,
      data.notes || null,
    ]
  );

  return query<AuditRecordRecord>('SELECT * FROM audit_records WHERE id = ?', [id])[0];
}

// ============================================================================
// SEED DATABASE
// ============================================================================

export async function seedDatabase(): Promise<void> {
  const existingMedicines = query<any>('SELECT COUNT(*) as count FROM medicines');
  if (existingMedicines[0]?.count > 0) {
    console.log('Database already seeded');
    return;
  }

  console.log('Seeding database with sample data...');
  const now = Date.now();

  const medicines = [
    { name: '当归', pinyin: 'dang gui', category: 'CHINESE_HERB', base_unit: 'g', package_unit: '包', package_size: 500, loose_stock: 1500, packaged_stock: 5, min_stock: 1000, location: 'A1-01' },
    { name: '黄芪', pinyin: 'huang qi', category: 'CHINESE_HERB', base_unit: 'g', package_unit: '包', package_size: 500, loose_stock: 2000, packaged_stock: 3, min_stock: 1500, location: 'A1-02' },
    { name: '甘草', pinyin: 'gan cao', category: 'CHINESE_HERB', base_unit: 'g', package_unit: '包', package_size: 500, loose_stock: 800, packaged_stock: 2, min_stock: 1000, location: 'A1-03' },
    { name: '党参', pinyin: 'dang shen', category: 'CHINESE_HERB', base_unit: 'g', package_unit: '包', package_size: 500, loose_stock: 500, packaged_stock: 4, min_stock: 1000, location: 'A1-04' },
    { name: '白术', pinyin: 'bai zhu', category: 'CHINESE_HERB', base_unit: 'g', package_unit: '包', package_size: 500, loose_stock: 1200, packaged_stock: 2, min_stock: 1000, location: 'A1-05' },
  ];

  for (const med of medicines) {
    const id = generateId();
    const currentStock = med.loose_stock + med.packaged_stock * med.package_size;
    execute(
      `INSERT INTO medicines (id, name, pinyin, category, base_unit, package_unit, package_size, current_stock, loose_stock, packaged_stock, min_stock, location, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, med.name, med.pinyin, med.category, med.base_unit, med.package_unit, med.package_size, currentStock, med.loose_stock, med.packaged_stock, med.min_stock, med.location, now, now]
    );
  }

  const prescriptionId = generateId();
  execute(
    `INSERT INTO prescriptions (id, name, pinyin, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [prescriptionId, '补中益气汤', 'bu zhong yi qi tang', '补中益气，升阳举陷', now, now]
  );

  console.log('Database seeded successfully');
}
