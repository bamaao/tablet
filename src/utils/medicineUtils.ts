/**
 * Fix for Medicine type displayStock property
 * Extends the Medicine interface with computed property
 */

import {Medicine} from '@/types';

/**
 * Get display string for stock
 * This is a utility function for components
 */
export function getMedicineDisplayStock(medicine: {
  looseStock: number;
  packagedStock: number;
  packageUnit: string;
  baseUnit: string;
}): string {
  const parts: string[] = [];

  if (medicine.packagedStock > 0) {
    parts.push(`${medicine.packagedStock}${medicine.packageUnit}`);
  }

  if (medicine.looseStock > 0) {
    parts.push(`${medicine.looseStock}${medicine.baseUnit}`);
  }

  if (parts.length === 0) {
    return `0${medicine.baseUnit}`;
  }

  return parts.join(' + ');
}
