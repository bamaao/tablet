/**
 * useInventoryCalculation Hook
 *
 * Stock computation utilities for inventory operations.
 */

import {useMemo, useCallback} from 'react';
import {Medicine, UnitType} from '@/types';
import {
  convertToBaseUnits,
  convertFromBaseUnits,
  calculateTotalStock,
  hasEnoughStock,
  calculateRemainingStock,
  compareQuantities,
} from '@/utils/conversion/UnitConverter';

export interface StockCalculationOptions {
  medicine?: Medicine;
  packageSize?: number;
  baseUnit?: UnitType;
}

export interface UseInventoryCalculationReturn {
  /**
   * Calculate total stock in base units
   */
  calculateTotalStock: (looseStock: number, packagedStock: number, packageSize: number) => number;

  /**
   * Check if there's enough stock for an operation
   */
  hasEnoughStock: (currentStock: number, required: number) => boolean;

  /**
   * Calculate remaining stock after deduction
   */
  calculateRemaining: (currentStock: number, toDeduct: number) => number;

  /**
   * Convert quantity to base units
   */
  toBaseUnits: (quantity: number, unit: UnitType, packageSize?: number) => number;

  /**
   * Convert from base units to display unit
   */
  fromBaseUnits: (baseQuantity: number, unit: UnitType, packageSize?: number) => number;

  /**
   * Compare two quantities (returns -1, 0, or 1)
   */
  compareQuantities: (a: number, b: number) => number;

  /**
   * Calculate stock percentage
   */
  calculateStockPercentage: (current: number, max: number) => number;

  /**
   * Calculate average stock usage
   */
  calculateAverageUsage: (transactions: {quantity: number}[], period: number) => number;

  /**
   * Predict stock depletion date
   */
  predictDepletion: (currentStock: number, dailyUsage: number) => Date | null;

  /**
   * Calculate reorder point
   */
  calculateReorderPoint: (dailyUsage: number, leadTimeDays: number, safetyStock: number) => number;
}

export function useInventoryCalculation(
  options: StockCalculationOptions = {},
): UseInventoryCalculationReturn {
  const {medicine} = options;

  /**
   * Calculate stock percentage
   */
  const calculateStockPercentage = useCallback((current: number, max: number): number => {
    if (max === 0) return 0;
    return (current / max) * 100;
  }, []);

  /**
   * Calculate average daily usage from transactions
   */
  const calculateAverageUsage = useCallback(
    (transactions: {quantity: number}[], period: number): number => {
      if (!transactions.length || period === 0) return 0;

      const totalUsage = transactions.reduce((sum, t) => sum + Math.abs(t.quantity), 0);
      return totalUsage / period;
    },
    [],
  );

  /**
   * Predict when stock will be depleted
   */
  const predictDepletion = useCallback(
    (currentStock: number, dailyUsage: number): Date | null => {
      if (dailyUsage <= 0 || currentStock <= 0) return null;

      const daysUntilDepletion = Math.floor(currentStock / dailyUsage);
      const depletionDate = new Date();
      depletionDate.setDate(depletionDate.getDate() + daysUntilDepletion);

      return depletionDate;
    },
    [],
  );

  /**
   * Calculate reorder point
   * Formula: (Average Daily Usage × Lead Time) + Safety Stock
   */
  const calculateReorderPoint = useCallback(
    (dailyUsage: number, leadTimeDays: number, safetyStock: number): number => {
      return dailyUsage * leadTimeDays + safetyStock;
    },
    [],
  );

  return {
    calculateTotalStock,
    hasEnoughStock,
    calculateRemaining,
    toBaseUnits: convertToBaseUnits,
    fromBaseUnits: convertFromBaseUnits,
    compareQuantities,
    calculateStockPercentage,
    calculateAverageUsage,
    predictDepletion,
    calculateReorderPoint,
  };
}

export default useInventoryCalculation;
