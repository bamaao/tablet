/**
 * Database Initialization
 *
 * Creates and exports the WatermelonDB instance
 */

import WatermelonDB from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {schema} from './schema';
import {Medicine} from './models/Medicine';
import {StockTransaction} from './models/StockTransaction';
import {Prescription} from './models/Prescription';
import {PrescriptionItem} from './models/PrescriptionItem';
import {AuditRecord} from './models/AuditRecord';
import {AuditSession} from './models/AuditSession';

// Create SQLite adapter
const adapter = new SQLiteAdapter({
  schema,
  // Use WebSQL for better debugging on development
  // (optional) useJSI: true, // Enable JSI for better performance
  // (optional) onSetUpError: (error) => console.error('Database setup error:', error),
});

// Create database instance
export const database = new WatermelonDB({
  adapter,
  modelClasses: [
    Medicine,
    StockTransaction,
    Prescription,
    PrescriptionItem,
    AuditRecord,
    AuditSession,
  ],
});

/**
 * Initialize database with seed data (for development)
 */
export async function seedDatabase(): Promise<void> {
  // Check if already seeded
  const medicinesCollection = database.get<Medicine>('medicines');
  const existingCount = await medicinesCollection.query().fetchCount();

  if (existingCount > 0) {
    console.log('Database already seeded');
    return;
  }

  console.log('Seeding database with sample data...');

  await database.batch(
    // Sample medicines
    medicinesCollection.prepareCreate(medicine => {
      medicine.name = '当归';
      medicine.pinyin = 'dang gui';
      medicine.category = 'CHINESE_HERB';
      medicine.baseUnit = 'g';
      medicine.packageUnit = '包';
      medicine.packageSize = 500; // 500g per package
      medicine.looseStock = 1500; // 1500g loose
      medicine.packagedStock = 5; // 5 packages
      medicine.currentStock = 1500 + 5 * 500; // 4000g total
      medicine.minStock = 1000;
      medicine.location = 'A1-01';
    }),

    medicinesCollection.prepareCreate(medicine => {
      medicine.name = '黄芪';
      medicine.pinyin = 'huang qi';
      medicine.category = 'CHINESE_HERB';
      medicine.baseUnit = 'g';
      medicine.packageUnit = '包';
      medicine.packageSize = 500;
      medicine.looseStock = 2000;
      medicine.packagedStock = 3;
      medicine.currentStock = 2000 + 3 * 500; // 3500g
      medicine.minStock = 1500;
      medicine.location = 'A1-02';
    }),

    medicinesCollection.prepareCreate(medicine => {
      medicine.name = '甘草';
      medicine.pinyin = 'gan cao';
      medicine.category = 'CHINESE_HERB';
      medicine.baseUnit = 'g';
      medicine.packageUnit = '包';
      medicine.packageSize = 500;
      medicine.looseStock = 800;
      medicine.packagedStock = 2;
      medicine.currentStock = 800 + 2 * 500; // 1800g
      medicine.minStock = 1000;
      medicine.location = 'A1-03';
    }),

    medicinesCollection.prepareCreate(medicine => {
      medicine.name = '党参';
      medicine.pinyin = 'dang shen';
      medicine.category = 'CHINESE_HERB';
      medicine.baseUnit = 'g';
      medicine.packageUnit = '包';
      medicine.packageSize = 500;
      medicine.looseStock = 500;
      medicine.packagedStock = 4;
      medicine.currentStock = 500 + 4 * 500; // 2500g
      medicine.minStock = 1000;
      medicine.location = 'A1-04';
    }),

    medicinesCollection.prepareCreate(medicine => {
      medicine.name = '白术';
      medicine.pinyin = 'bai zhu';
      medicine.category = 'CHINESE_HERB';
      medicine.baseUnit = 'g';
      medicine.packageUnit = '包';
      medicine.packageSize = 500;
      medicine.looseStock = 1200;
      medicine.packagedStock = 2;
      medicine.currentStock = 1200 + 2 * 500; // 2200g
      medicine.minStock = 1000;
      medicine.location = 'A1-05';
    }),
  );

  // Create sample prescription
  const prescriptionsCollection = database.get<Prescription>('prescriptions');
  const buzhongYiqiTang = await prescriptionsCollection.create(prescription => {
    prescription.name = '补中益气汤';
    prescription.pinyin = 'bu zhong yi qi tang';
    prescription.description = '补中益气，升阳举陷';
  });

  const prescriptionItemsCollection = database.get<PrescriptionItem>('prescription_items');
  await database.batch(
    prescriptionItemsCollection.prepareCreate(item => {
      item.prescription.set(buzhongYiqiTang);
      item.medicineId = (await medicinesCollection.find(q => q.name === '当归')).id;
      item.quantity = 15;
      item.unit = 'g';
    }),

    prescriptionItemsCollection.prepareCreate(item => {
      item.prescription.set(buzhongYiqiTang);
      item.medicineId = (await medicinesCollection.find(q => q.name === '黄芪')).id;
      item.quantity = 20;
      item.unit = 'g';
    }),

    prescriptionItemsCollection.prepareCreate(item => {
      item.prescription.set(buzhongYiqiTang);
      item.medicineId = (await medicinesCollection.find(q => q.name === '甘草')).id;
      item.quantity = 10;
      item.unit = 'g';
    }),

    prescriptionItemsCollection.prepareCreate(item => {
      item.prescription.set(buzhongYiqiTang);
      item.medicineId = (await medicinesCollection.find(q => q.name === '党参')).id;
      item.quantity = 15;
      item.unit = 'g';
    }),

    prescriptionItemsCollection.prepareCreate(item => {
      item.prescription.set(buzhongYiqiTang);
      item.medicineId = (await medicinesCollection.find(q => q.name === '白术')).id;
      item.quantity = 15;
      item.unit = 'g';
    }),
  );

  console.log('Database seeded successfully');
}
