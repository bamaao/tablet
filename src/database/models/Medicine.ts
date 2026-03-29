/**
 * Medicine Model
 *
 * Represents a drug/herb in inventory with unit conversion capabilities
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, children, readonly} from '@nozbe/watermelondb/decorators';
import {StockTransaction} from './StockTransaction';
import {AuditRecord} from './AuditRecord';
import {UnitType} from '@/types';

// Convert enum values to string constants for the model
const MEDICINE_CATEGORIES = {
  CHINESE_HERB: 'CHINESE_HERB',
  CHINESE_PATENT: 'CHINESE_PATENT',
  WESTERN_MEDICINE: 'WESTERN_MEDICINE',
  SUPPLIES: 'SUPPLIES',
} as const;

export class Medicine extends Model {
  static table = 'medicines';

  // ========================================================================
  // FIELDS
  // ========================================================================

  @field('name') name!: string;
  @field('pinyin') pinyin!: string | null;

  @field('category') category!: keyof typeof MEDICINE_CATEGORIES;

  @field('base_unit') baseUnit!: UnitType; // 'g' or 'ml'
  @field('package_unit') packageUnit!: UnitType; // '包', '盒', etc.

  @field('package_size') packageSize!: number; // Size in base units per package

  // Denormalized stock fields for performance
  @readonly @field('current_stock') currentStock!: number; // Total in base units
  @readonly @field('loose_stock') looseStock!: number; // Loose in base units
  @readonly @field('packaged_stock') packagedStock!: number; // Package count

  @field('min_stock') minStock!: number;
  @field('location') location!: string | null;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // ========================================================================
  // RELATIONS
  // ========================================================================

  @children('stock_transactions') transactions!: StockTransaction[];
  @children('audit_records') auditRecords!: AuditRecord[];

  // ========================================================================
  // COMPUTED PROPERTIES
  // ========================================================================

  /**
   * Check if medicine is low on stock
   */
  get isLowStock(): boolean {
    return this.currentStock < this.minStock;
  }

  /**
   * Get stock shortage amount
   */
  get stockShortage(): number {
    return Math.max(0, this.minStock - this.currentStock);
  }

  /**
   * Display string for stock with proper unit formatting
   * Example: "2包 + 350g" or "500g"
   */
  get displayStock(): string {
    const parts: string[] = [];

    if (this.packagedStock > 0) {
      parts.push(`${this.packagedStock}${this.packageUnit}`);
    }

    if (this.looseStock > 0) {
      parts.push(`${this.looseStock}${this.baseUnit}`);
    }

    if (parts.length === 0) {
      return `0${this.baseUnit}`;
    }

    return parts.join(' + ');
  }

  /**
   * Get packaged stock in base units
   */
  get packagedStockInBaseUnits(): number {
    return this.packagedStock * this.packageSize;
  }

  /**
   * Display string for the package specification
   * Example: "500g/包"
   */
  get packageSpec(): string {
    return `${this.packageSize}${this.baseUnit}/${this.packageUnit}`;
  }

  /**
   * Check if medicine can be unpacked (has packaged stock)
   */
  get canUnpack(): boolean {
    return this.packagedStock > 0;
  }

  /**
   * Check if medicine has any stock
   */
  get inStock(): boolean {
    return this.currentStock > 0;
  }

  // ========================================================================
  // ACTIONS
  // ========================================================================

  /**
   * Update stock atomically within a database batch
   * NOTE: This should only be called within a database.batch() operation
   */
  updateStock(newLoose: number, newPackaged: number) {
    return this.update(medicine => {
      medicine.looseStock = newLoose;
      medicine.packagedStock = newPackaged;
      medicine.currentStock = newLoose + newPackaged * this.packageSize;
      medicine.updatedAt = new Date();
    });
  }
}
