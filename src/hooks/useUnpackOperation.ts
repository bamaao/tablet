/**
 * useUnpackOperation Hook
 *
 * Handles atomic unpack transaction logic with validation.
 */

import {useCallback, useState} from 'react';
import {useAppDispatch} from '@/store/hooks';
import {executeTransaction} from '@/store/slices/inventorySlice';
import {TransactionType, UnitType} from '@/types';
import {
  calculateUnpack,
  canUnpack,
  convertToBaseUnits,
} from '@/utils/conversion/UnitConverter';
import {showToast, showError as showErrorAction} from '@/store/slices/uiSlice';

export interface UnpackPlan {
  medicineId: string;
  medicineName: string;
  packagesToUnpack: number;
  packageSize: number;
  beforeStock: {
    packaged: number;
    loose: number;
    total: number;
  };
  afterStock: {
    packaged: number;
    loose: number;
    total: number;
  };
  unpackedAmount: number;
  isValid: boolean;
  errorMessage?: string;
}

export interface UseUnpackOperationReturn {
  /**
   * Calculate unpack plan for validation
   */
  calculatePlan: (
    medicineId: string,
    medicineName: string,
    packagedStock: number,
    looseStock: number,
    packageSize: number,
    packagesToUnpack: number,
  ) => UnpackPlan;

  /**
   * Execute unpack operation
   */
  executeUnpack: (plan: UnpackPlan, notes?: string) => Promise<boolean>;

  /**
   * Currently executing
   */
  isExecuting: boolean;

  /**
   * Error message
   */
  error: string | null;
}

export function useUnpackOperation(): UseUnpackOperationReturn {
  const dispatch = useAppDispatch();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate unpack plan with validation
   */
  const calculatePlan = useCallback(
    (
      medicineId: string,
      medicineName: string,
      packagedStock: number,
      looseStock: number,
      packageSize: number,
      packagesToUnpack: number,
    ): UnpackPlan => {
      // Validate inputs
      if (packagesToUnpack <= 0) {
        return {
          medicineId,
          medicineName,
          packagesToUnpack,
          packageSize,
          beforeStock: {
            packaged: packagedStock,
            loose: looseStock,
            total: looseStock + packagedStock * packageSize,
          },
          afterStock: {
            packaged: packagedStock,
            loose: looseStock,
            total: looseStock + packagedStock * packageSize,
          },
          unpackedAmount: 0,
          isValid: false,
          errorMessage: '拆包数量必须大于0',
        };
      }

      if (!canUnpack(packagedStock, packagesToUnpack)) {
        return {
          medicineId,
          medicineName,
          packagesToUnpack,
          packageSize,
          beforeStock: {
            packaged: packagedStock,
            loose: looseStock,
            total: looseStock + packagedStock * packageSize,
          },
          afterStock: {
            packaged: packagedStock,
            loose: looseStock,
            total: looseStock + packagedStock * packageSize,
          },
          unpackedAmount: 0,
          isValid: false,
          errorMessage: `包装库存不足，当前只有${packagedStock}包`,
        };
      }

      // Calculate result
      const result = calculateUnpack(packagedStock, packagesToUnpack, packageSize, looseStock);

      return {
        medicineId,
        medicineName,
        packagesToUnpack,
        packageSize,
        beforeStock: {
          packaged: packagedStock,
          loose: looseStock,
          total: looseStock + packagedStock * packageSize,
        },
        afterStock: {
          packaged: result.packagedStock,
          loose: result.looseStock,
          total: result.looseStock + result.packagedStock * packageSize,
        },
        unpackedAmount: result.unpackedAmount,
        isValid: true,
      };
    },
    [],
  );

  /**
   * Execute unpack operation atomically
   */
  const executeUnpack = useCallback(
    async (plan: UnpackPlan, notes?: string): Promise<boolean> => {
      if (!plan.isValid) {
        setError(plan.errorMessage || '无效的拆包计划');
        dispatch(showErrorAction(plan.errorMessage || '无效的拆包计划'));
        return false;
      }

      setIsExecuting(true);
      setError(null);

      try {
        await dispatch(
          executeTransaction({
            medicineId: plan.medicineId,
            type: TransactionType.UNPACK,
            quantity: plan.packagesToUnpack,
            unit: '包',
            notes: notes || `拆包 ${plan.packagesToUnpack}包 → +${plan.unpackedAmount}`,
          }),
        ).unwrap();

        dispatch(
          showToast(`已拆包${plan.medicineName}${plan.packagesToUnpack}包`),
        );

        return true;
      } catch (err) {
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        dispatch(showErrorAction(errorMessage));
        return false;
      } finally {
        setIsExecuting(false);
      }
    },
    [dispatch],
  );

  return {
    calculatePlan,
    executeUnpack,
    isExecuting,
    error,
  };
}
