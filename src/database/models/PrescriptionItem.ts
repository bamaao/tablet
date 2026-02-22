/**
 * Prescription Item Model
 *
 * Represents a single ingredient (medicine) in a prescription
 */

import {Model} from '@nozbe/watermelondb';
import {field, readonly, relation, date} from '@nozbe/watermelondb/decorators';
import {Prescription} from './Prescription';
import {Medicine} from './Medicine';
import {UnitType} from '@/types';

export class PrescriptionItem extends Model {
  static table = 'prescription_items';
  static associations = {
    prescriptions: {type: 'belongs_to', key: 'prescription_id'},
    medicines: {type: 'belongs_to', key: 'medicine_id'},
  };

  // ========================================================================
  // FIELDS
  // ========================================================================

  @relation('prescriptions', 'prescription_id') prescription!: Prescription;
  @relation('medicines', 'medicine_id') medicine!: Medicine;

  @field('prescription_id') prescriptionId!: string;
  @field('medicine_id') medicineId!: string;

  @field('quantity') quantity!: number; // Per-dose quantity in base units
  @field('unit') unit!: UnitType; // Display unit for this ingredient

  @date('created_at') createdAt!: Date;

  // ========================================================================
  // COMPUTED PROPERTIES
  // ========================================================================

  /**
   * Get the required quantity for a given number of doses
   */
  getRequiredQuantity(dosageCount: number): number {
    return this.quantity * dosageCount;
  }

  /**
   * Format the quantity for display
   * Example: "15g" or "1包"
   */
  get displayQuantity(): string {
    return `${this.quantity}${this.unit}`;
  }
}
