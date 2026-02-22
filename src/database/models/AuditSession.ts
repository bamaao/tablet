/**
 * Audit Session Model
 *
 * Represents a complete stocktaking session
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, children} from '@nozbe/watermelondb/decorators';
import {AuditRecord} from './AuditRecord';

export type AuditSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export class AuditSession extends Model {
  static table = 'audit_sessions';

  // ========================================================================
  // FIELDS
  // ========================================================================

  @date('started_at') startedAt!: Date;
  @date('completed_at') completedAt!: Date | null;

  @field('status') status!: AuditSessionStatus;

  @field('total_items') totalItems!: number;
  @field('completed_items') completedItems!: number;

  // ========================================================================
  // RELATIONS
  // ========================================================================

  // Note: We'll use a lazy relation for audit records since they reference session_id
  async getRecords(): Promise<AuditRecord[]> {
    const recordsCollection = this.collections.get<AuditRecord>('audit_records');
    return recordsCollection.query(Q.where('session_id', this.id)).fetch();
  }

  // ========================================================================
  // COMPUTED PROPERTIES
  // ========================================================================

  /**
   * Get completion percentage
   */
  get completionPercentage(): number {
    if (this.totalItems === 0) return 0;
    return (this.completedItems / this.totalItems) * 100;
  }

  /**
   * Check if session is active
   */
  get isActive(): boolean {
    return this.status === 'IN_PROGRESS';
  }

  /**
   * Check if session is completed
   */
  get isCompleted(): boolean {
    return this.status === 'COMPLETED';
  }

  /**
   * Get session duration in minutes
   */
  get durationMinutes(): number | null {
    if (!this.completedAt) return null;
    const diff = this.completedAt.getTime() - this.startedAt.getTime();
    return Math.floor(diff / 60000);
  }
}
