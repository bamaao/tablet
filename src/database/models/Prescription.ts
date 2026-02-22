/**
 * Prescription Model
 *
 * Represents a traditional Chinese medicine prescription/formula (方剂)
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, children} from '@nozbe/watermelondb/decorators';
import {PrescriptionItem} from './PrescriptionItem';

export class Prescription extends Model {
  static table = 'prescriptions';

  // ========================================================================
  // FIELDS
  // ========================================================================

  @field('name') name!: string; // e.g., "补中益气汤"
  @field('pinyin') pinyin!: string | null;
  @field('description') description!: string | null;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // ========================================================================
  // RELATIONS
  // ========================================================================

  @children('prescription_items') items!: PrescriptionItem[];

  // ========================================================================
  // COMPUTED PROPERTIES
  // ========================================================================

  /**
   * Get the number of ingredients in this prescription
   */
  get ingredientCount(): number {
    return this.items.length;
  }

  /**
   * Check if this prescription can be prepared for a given dosage count
   * This requires checking each ingredient's stock
   */
  async canPrepare(dosageCount: number): Promise<boolean> {
    const items = await this.items.fetch();

    for (const item of items) {
      const medicine = await item.medicine.fetch();
      const required = item.quantity * dosageCount;

      if (medicine.currentStock < required) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the ingredient that has insufficient stock (if any)
   */
  async getInsufficientIngredient(dosageCount: number): Promise<PrescriptionItem | null> {
    const items = await this.items.fetch();

    for (const item of items) {
      const medicine = await item.medicine.fetch();
      const required = item.quantity * dosageCount;

      if (medicine.currentStock < required) {
        return item;
      }
    }

    return null;
  }
}
