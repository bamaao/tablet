/**
 * Stock Transaction Model
 *
 * Records all inventory movements (in/out/unpack/audit)
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, readonly, relation} from '@nozbe/watermelondb/decorators';
import {Medicine} from './Medicine';
import {TransactionType} from '@/types';

export class StockTransaction extends Model {
  static table = 'stock_transactions';
  static associations = {
    medicines: {type: 'belongs_to', key: 'medicine_id'},
  };

  // ========================================================================
  // FIELDS
  // ========================================================================

  @relation('medicines', 'medicine_id') medicine!: Medicine;

  @field('medicine_id') medicineId!: string;
  @field('type') type!: TransactionType;

  @field('quantity') quantity!: number; // In base units
  @field('unit') unit!: string; // Original unit for display
  @field('package_size') packageSize!: number | null; // Package size for multi-spec support

  @readonly @field('before_stock') beforeStock!: number;
  @readonly @field('after_stock') afterStock!: number;

  @field('reference_id') referenceId!: string | null;
  @field('notes') notes!: string | null;

  @date('created_at') createdAt!: Date;
  @field('synced') synced!: boolean;

  // ========================================================================
  // COMPUTED PROPERTIES
  // ========================================================================

  /**
   * Get the stock change amount (positive or negative)
   */
  get stockChange(): number {
    switch (this.type) {
      case TransactionType.INBOUND:
        return Math.abs(this.quantity);
      case TransactionType.OUTBOUND:
        return -Math.abs(this.quantity);
      case TransactionType.UNPACK:
        return 0; // Unpack doesn't change total stock
      case TransactionType.AUDIT:
        return this.afterStock - this.beforeStock;
      default:
        return 0;
    }
  }

  /**
   * Human-readable description of the transaction
   */
  get description(): string {
    const typeLabels: Record<TransactionType, string> = {
      INBOUND: '入库',
      OUTBOUND: '出库',
      UNPACK: '拆包',
      AUDIT: '盘点',
    };

    const sign = this.quantity >= 0 ? '+' : '';
    return `${typeLabels[this.type]}: ${sign}${this.quantity}${this.unit}`;
  }

  /**
   * Check if this is a system-generated transaction (vs manual entry)
   */
  get isSystemGenerated(): boolean {
    return (
      this.type === TransactionType.UNPACK ||
      this.type === TransactionType.AUDIT
    );
  }
}
