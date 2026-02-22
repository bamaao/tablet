/**
 * useMedicineUnit Hook
 *
 * Provides unit conversion helpers for medicine components.
 */

import {useMemo} from 'react';
import {Medicine, UnitType} from '@/types';
import {
  convertToBaseUnits,
  convertFromBaseUnits,
  formatForDisplay,
  calculateTotalStock,
  distributeToPackages,
} from '@/utils/conversion/UnitConverter';

export interface UseMedicineUnitReturn {
  /**
   * Convert quantity to base units (g or ml)
   */
  toBaseUnits: (quantity: number, unit: UnitType) => number;

  /**
   * Convert from base units to specified unit
   */
  fromBaseUnits: (baseQuantity: number, unit: UnitType) => number;

  /**
   * Format stock for display
   */
  formatStock: (
    looseStock: number,
    packagedStock: number,
    packageSize: number,
    options?: {preferPackages?: boolean; precision?: number},
  ) => string;

  /**
   * Calculate total stock from loose and packaged components
   */
  getTotalStock: (looseStock: number, packagedStock: number, packageSize: number) => number;

  /**
   * Distribute total quantity into packages and loose units
   */
  distributeToPackages: (totalQuantity: number, packageSize: number) => {
    packages: number;
    loose: number;
  };

  /**
   * Format quantity with unit for display
   */
  formatQuantity: (quantity: number, unit: UnitType) => string;

  /**
   * Get the display unit for a medicine
   */
  getDisplayUnit: () => UnitType;

  /**
   * Check if a unit is a package unit
   */
  isPackageUnit: (unit: UnitType) => boolean;
}

export function useMedicineUnit(medicine?: Medicine): UseMedicineUnitReturn {
  const packageSize = medicine?.packageSize || 500;
  const baseUnit = medicine?.baseUnit || 'g';
  const packageUnit = medicine?.packageUnit || '包';

  const toBaseUnits = (quantity: number, unit: UnitType): number => {
    return convertToBaseUnits(quantity, unit, packageSize);
  };

  const fromBaseUnits = (baseQuantity: number, unit: UnitType): number => {
    return convertFromBaseUnits(baseQuantity, unit, packageSize);
  };

  const formatStock = (
    looseStock: number,
    packagedStock: number,
    pkgSize: number,
    options?: {preferPackages?: boolean; precision?: number},
  ): string => {
    const total = looseStock + packagedStock * pkgSize;

    if (options?.preferPackages && packagedStock > 0) {
      const remaining = total % pkgSize;
      const packages = Math.floor(total / pkgSize);

      if (packages > 0 && remaining > 0) {
        return `${packages}${packageUnit} + ${remaining.toFixed(options.precision || 0)}${baseUnit}`;
      } else if (packages > 0) {
        return `${packages}${packageUnit}`;
      } else {
        return `${remaining.toFixed(options.precision || 0)}${baseUnit}`;
      }
    }

    return `${total.toFixed(options.precision || 0)}${baseUnit}`;
  };

  const getTotalStock = (looseStock: number, packagedStock: number, pkgSize: number): number => {
    return calculateTotalStock(looseStock, packagedStock, pkgSize);
  };

  const formatQuantity = (quantity: number, unit: UnitType): string => {
    return `${quantity}${unit}`;
  };

  const getDisplayUnit = (): UnitType => {
    return baseUnit;
  };

  const isPackageUnit = (unit: UnitType): boolean => {
    return ['包', '盒', '瓶'].includes(unit);
  };

  return useMemo(
    () => ({
      toBaseUnits,
      fromBaseUnits,
      formatStock,
      getTotalStock,
      distributeToPackages,
      formatQuantity,
      getDisplayUnit,
      isPackageUnit,
    }),
    [packageSize, baseUnit, packageUnit],
  );
}
