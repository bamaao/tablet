/**
 * Audit Record Model
 *
 * Records inventory audit results (stocktaking)
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, relation} from '@nozbe/watermelondb/decorators';
import {Medicine} from './Medicine';

export class AuditRecord extends Model {
  static table = 'audit_records';
  static associations = {
    medicines: {type: 'belongs_to', key: 'medicine_id'},
  };

  // ========================================================================
  // FIELDS
  // ========================================================================

  @relation('medicines', 'medicine_id') medicine!: Medicine;

  @field('session_id') sessionId!: string; // Group records into audit sessions
  @field('medicine_id') medicineId!: string;

  @field('expected_stock') expectedStock!: number; // What system says (base units)
  @field('actual_stock') actualStock!: number; // What was counted (base units)

  @field('discrepancy') discrepancy!: number; // actual - expected (can be positive or negative)

  @field('unit') unit!: string; // Unit used during audit

  @date('audited_at') auditedAt!: Date;
  @field('audited_by') auditedBy!: string | null;

  @field('notes') notes!: string | null;
  @field('resolved') resolved!: boolean; // Whether discrepancy was fixed

  // ========================================================================
  // COMPUTED PROPERTIES
  // ========================================================================

  /**
   * Check if there's a discrepancy
   */
  get hasDiscrepancy(): boolean {
    return this.discrepancy !== 0;
  }

  /**
   * Check if stock is less than expected (loss)
   */
  get isLoss(): boolean {
    return this.discrepancy < 0;
  }

  /**
   * Check if stock is more than expected (gain)
   */
  get isGain(): boolean {
    return this.discrepancy > 0;
  }

  /**
   * Get the absolute discrepancy value
   */
  get absoluteDiscrepancy(): number {
    return Math.abs(this.discrepancy);
  }

  /**
   * Format the discrepancy for display
   * Example: "-50g (盘亏)" or "+20g (盘盈)"
   */
  get discrepancyDisplay(): string {
    const sign = this.discrepancy >= 0 ? '+' : '';
    const type = this.isLoss ? '盘亏' : '盘盈';
    return `${sign}${this.discrepancy}${this.unit} (${type})`;
  }

  /**
   * Get the percentage discrepancy
   */
  get discrepancyPercentage(): number {
    if (this.expectedStock === 0) {
      return this.actualStock > 0 ? 100 : 0;
    }
    return (this.discrepancy / this.expectedStock) * 100;
  }
}
