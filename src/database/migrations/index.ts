/**
 * Database Migrations
 *
 * Handles schema upgrades and data migration between versions.
 */

import {MigrationContext} from '@nozbe/watermelondb/Model';

/**
 * Migration from version 1 to version 2
 *
 * Changes:
 * - Add package_size column to stock_transactions table
 * - Migrate existing data by setting package_size from medicine.packageSize
 */
export const migration1To2 = async (context: MigrationContext) => {
  const { database } = context;

  // Add the package_size column to stock_transactions
  await (database as any).adapter.exec(
    'ALTER TABLE stock_transactions ADD COLUMN package_size NUMBER;'
  );

  // Migrate existing data: set package_size from medicine.packageSize
  // For all packaged inbound/outbound transactions
  const transactions = await (database as any).get('stock_transactions').query().fetch();

  for (const transaction of transactions) {
    // Only update transactions for package units (包, 盒, 瓶)
    if (['包', '盒', '瓶'].includes((transaction as any).unit)) {
      try {
        const medicine = await (database as any).get('medicines').find((transaction as any).medicineId);

        await database.batch(
          (transaction as any).prepareUpdate((t: any) => {
            t.packageSize = (medicine as any).packageSize;
          })
        );
      } catch (error) {
        // If medicine not found, set to null (will use medicine.packageSize as default)
        console.warn(`Could not find medicine for transaction ${(transaction as any).id}, setting packageSize to null`);
        await database.batch(
          (transaction as any).prepareUpdate((t: any) => {
            t.packageSize = null;
          })
        );
      }
    }
  }
};

/**
 * Migration from version 2 to version 1 (downgrade)
 *
 * Remove package_size column from stock_transactions
 */
export const migration2To1 = async (context: MigrationContext) => {
  const { database } = context;

  // WatermelonDB doesn't support dropping columns directly
  // For SQLite, we need to recreate the table
  const tableName = 'stock_transactions';

  // Create a new table without the package_size column
  await (database as any).adapter.exec(`
    CREATE TABLE stock_transactions_new (
      id TEXT PRIMARY KEY NOT NULL,
      medicine_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity NUMBER NOT NULL,
      unit TEXT NOT NULL,
      before_stock NUMBER NOT NULL,
      after_stock NUMBER NOT NULL,
      reference_id TEXT,
      notes TEXT,
      created_at NUMBER NOT NULL,
      synced NUMBER NOT NULL,
      _status TEXT NOT NULL,
      _changed TEXT
    );
  `);

  // Copy data from old table to new table
  await (database as any).adapter.exec(`
    INSERT INTO stock_transactions_new (
      id, medicine_id, type, quantity, unit, before_stock, after_stock,
      reference_id, notes, created_at, synced, _status, _changed
    )
    SELECT
      id, medicine_id, type, quantity, unit, before_stock, after_stock,
      reference_id, notes, created_at, synced, _status, _changed
    FROM stock_transactions;
  `);

  // Drop old table
  await (database as any).adapter.exec(`DROP TABLE stock_transactions;`);

  // Rename new table
  await (database as any).adapter.exec(`ALTER TABLE stock_transactions_new RENAME TO stock_transactions;`);

  // Recreate indexes
  await (database as any).adapter.exec(
    `CREATE INDEX index_stock_transactions_on_medicine_id ON stock_transactions(medicine_id);`
  );
};

// Export all migrations
export const migrationsSet = [
  migration1To2,
  migration2To1,
];
