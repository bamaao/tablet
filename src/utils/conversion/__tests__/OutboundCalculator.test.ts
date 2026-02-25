/**
 * Unit tests for OutboundCalculator
 */

import {
  calculateOptimalOutboundPlan,
  formatOutboundPlan,
  validateOutboundPlan,
  getOutboundPlanSummary,
} from '../OutboundCalculator';
import {PackagedStockBySize} from '@/store/slices/inventorySlice';

describe('OutboundCalculator', () => {
  describe('calculateOptimalOutboundPlan', () => {
    const packagedStockBySize: PackagedStockBySize[] = [
      {packageSize: 500, count: 2},
      {packageSize: 250, count: 3},
    ];
    const looseStock = 100;

    it('should calculate optimal plan for mixed packages (750g request)', () => {
      const plan = calculateOptimalOutboundPlan(
        packagedStockBySize,
        looseStock,
        750,
        'optimal',
      );

      expect(plan.isFeasible).toBe(true);
      expect(plan.items.length).toBe(2);
      expect(plan.items[0].packageSize).toBe(500);
      expect(plan.items[0].quantity).toBe(1);
      expect(plan.items[1].packageSize).toBe(250);
      expect(plan.items[1].quantity).toBe(1);
      expect(plan.items.reduce((sum, i) => sum + i.quantityInBaseUnits, 0)).toBe(
        750,
      );
    });

    it('should use large packages first (1250g request)', () => {
      const plan = calculateOptimalOutboundPlan(
        packagedStockBySize,
        looseStock,
        1250,
        'optimal',
      );

      expect(plan.isFeasible).toBe(true);
      expect(plan.items[0].packageSize).toBe(500);
      expect(plan.items[0].quantity).toBe(2);
      expect(plan.items[1].packageSize).toBe(250);
      expect(plan.items[1].quantity).toBe(1);
    });

    it('should fall back to loose stock when needed (600g request)', () => {
      const plan = calculateOptimalOutboundPlan(
        [{packageSize: 500, count: 1}],
        300,
        600,
        'optimal',
      );

      expect(plan.isFeasible).toBe(true);
      expect(plan.items.length).toBe(2);
      expect(plan.items[0].packageSize).toBe(500);
      expect(plan.items[0].quantity).toBe(1);
      expect(plan.items[1].packageSize).toBeNull();
      expect(plan.items[1].quantity).toBe(100);
    });

    it('should handle requests that only need loose stock (200g request)', () => {
      const plan = calculateOptimalOutboundPlan(
        packagedStockBySize,
        looseStock,
        200,
        'optimal',
      );

      expect(plan.isFeasible).toBe(true);
      // Should use packages first in optimal mode
      expect(plan.items.length).toBeGreaterThan(0);
    });

    it('should return infeasible plan when stock is insufficient', () => {
      const plan = calculateOptimalOutboundPlan(
        [{packageSize: 250, count: 2}],
        100,
        700,
        'optimal',
      );

      expect(plan.isFeasible).toBe(false);
      expect(plan.reason).toContain('库存不足');
      expect(plan.items.length).toBe(0);
    });

    it('should handle exact package matches (500g request)', () => {
      const plan = calculateOptimalOutboundPlan(
        packagedStockBySize,
        looseStock,
        500,
        'optimal',
      );

      expect(plan.isFeasible).toBe(true);
      expect(plan.items.length).toBe(1);
      expect(plan.items[0].packageSize).toBe(500);
      expect(plan.items[0].quantity).toBe(1);
    });

    it('should handle zero quantity request', () => {
      const plan = calculateOptimalOutboundPlan(
        packagedStockBySize,
        looseStock,
        0,
        'optimal',
      );

      expect(plan.isFeasible).toBe(true);
      expect(plan.items.length).toBe(0);
    });

    it('should support loose_first strategy', () => {
      const plan = calculateOptimalOutboundPlan(
        packagedStockBySize,
        looseStock,
        750,
        'loose_first',
      );

      expect(plan.isFeasible).toBe(true);
      // Should use loose stock first
      expect(plan.items.some(item => item.packageSize === null)).toBe(true);
    });

    it('should support package_only strategy', () => {
      const plan = calculateOptimalOutboundPlan(
        packagedStockBySize,
        looseStock,
        750,
        'package_only',
      );

      expect(plan.isFeasible).toBe(true);
      // Should not use loose stock
      expect(plan.items.every(item => item.packageSize !== null)).toBe(true);
    });

    it('should fail package_only when not enough packaged stock', () => {
      const plan = calculateOptimalOutboundPlan(
        [{packageSize: 500, count: 1}],
        500,
        750,
        'package_only',
      );

      expect(plan.isFeasible).toBe(false);
    });

    it('should calculate total available correctly', () => {
      const plan = calculateOptimalOutboundPlan(
        packagedStockBySize,
        looseStock,
        1000,
        'optimal',
      );

      // 2 * 500 + 3 * 250 + 100 = 1850
      expect(plan.totalAvailable).toBe(1850);
    });
  });

  describe('formatOutboundPlan', () => {
    it('should format feasible plan correctly', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 750,
        totalAvailable: 1850,
        items: [
          {
            packageSize: 500,
            quantity: 1,
            unit: '包' as const,
            quantityInBaseUnits: 500,
          },
          {
            packageSize: 250,
            quantity: 1,
            unit: '包' as const,
            quantityInBaseUnits: 250,
          },
        ],
        isFeasible: true,
      };

      const formatted = formatOutboundPlan(plan);
      expect(formatted).toContain('1包500g');
      expect(formatted).toContain('1包250g');
      expect(formatted).toContain('总计');
      expect(formatted).toContain('750g');
    });

    it('should format loose stock correctly', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 100,
        totalAvailable: 200,
        items: [
          {
            packageSize: null,
            quantity: 100,
            unit: 'g' as const,
            quantityInBaseUnits: 100,
          },
        ],
        isFeasible: true,
      };

      const formatted = formatOutboundPlan(plan);
      expect(formatted).toContain('100g散装');
    });

    it('should format infeasible plan with reason', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 1000,
        totalAvailable: 500,
        items: [],
        isFeasible: false,
        reason: '库存不足：需要 1000，可用 500',
      };

      const formatted = formatOutboundPlan(plan);
      expect(formatted).toBe('库存不足：需要 1000，可用 500');
    });

    it('should format empty plan', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 0,
        totalAvailable: 1000,
        items: [],
        isFeasible: true,
      };

      const formatted = formatOutboundPlan(plan);
      expect(formatted).toBe('无需出库');
    });
  });

  describe('validateOutboundPlan', () => {
    const packagedStockBySize: PackagedStockBySize[] = [
      {packageSize: 500, count: 2},
      {packageSize: 250, count: 3},
    ];
    const looseStock = 100;

    it('should validate feasible plan', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 750,
        totalAvailable: 1850,
        items: [
          {
            packageSize: 500,
            quantity: 1,
            unit: '包' as const,
            quantityInBaseUnits: 500,
          },
          {
            packageSize: 250,
            quantity: 1,
            unit: '包' as const,
            quantityInBaseUnits: 250,
          },
        ],
        isFeasible: true,
      };

      const isValid = validateOutboundPlan(plan, packagedStockBySize, looseStock);
      expect(isValid).toBe(true);
    });

    it('should reject infeasible plan', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 1000,
        totalAvailable: 500,
        items: [],
        isFeasible: false,
        reason: 'Not enough stock',
      };

      const isValid = validateOutboundPlan(plan, packagedStockBySize, looseStock);
      expect(isValid).toBe(false);
    });

    it('should reject plan with insufficient packaged stock', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 1500,
        totalAvailable: 2000,
        items: [
          {
            packageSize: 500,
            quantity: 5, // More than available (2)
            unit: '包' as const,
            quantityInBaseUnits: 2500,
          },
        ],
        isFeasible: true,
      };

      const isValid = validateOutboundPlan(plan, packagedStockBySize, looseStock);
      expect(isValid).toBe(false);
    });

    it('should reject plan with insufficient loose stock', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 500,
        totalAvailable: 600,
        items: [
          {
            packageSize: null,
            quantity: 500, // More than available (100)
            unit: 'g' as const,
            quantityInBaseUnits: 500,
          },
        ],
        isFeasible: true,
      };

      const isValid = validateOutboundPlan(plan, packagedStockBySize, looseStock);
      expect(isValid).toBe(false);
    });

    it('should validate plan with both packaged and loose', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 1050,
        totalAvailable: 1850,
        items: [
          {
            packageSize: 500,
            quantity: 2,
            unit: '包' as const,
            quantityInBaseUnits: 1000,
          },
          {
            packageSize: null,
            quantity: 50,
            unit: 'g' as const,
            quantityInBaseUnits: 50,
          },
        ],
        isFeasible: true,
      };

      const isValid = validateOutboundPlan(plan, packagedStockBySize, looseStock);
      expect(isValid).toBe(true);
    });
  });

  describe('getOutboundPlanSummary', () => {
    it('should calculate summary for packaged only plan', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 1000,
        totalAvailable: 2000,
        items: [
          {
            packageSize: 500,
            quantity: 2,
            unit: '包' as const,
            quantityInBaseUnits: 1000,
          },
        ],
        isFeasible: true,
      };

      const summary = getOutboundPlanSummary(plan);
      expect(summary.packageCount).toBe(2);
      expect(summary.looseQuantity).toBe(0);
      expect(summary.totalQuantity).toBe(1000);
      expect(summary.packageSizes).toEqual([500]);
    });

    it('should calculate summary for loose only plan', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 100,
        totalAvailable: 200,
        items: [
          {
            packageSize: null,
            quantity: 100,
            unit: 'g' as const,
            quantityInBaseUnits: 100,
          },
        ],
        isFeasible: true,
      };

      const summary = getOutboundPlanSummary(plan);
      expect(summary.packageCount).toBe(0);
      expect(summary.looseQuantity).toBe(100);
      expect(summary.totalQuantity).toBe(100);
      expect(summary.packageSizes).toEqual([]);
    });

    it('should calculate summary for mixed plan', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 850,
        totalAvailable: 2000,
        items: [
          {
            packageSize: 500,
            quantity: 1,
            unit: '包' as const,
            quantityInBaseUnits: 500,
          },
          {
            packageSize: 250,
            quantity: 1,
            unit: '包' as const,
            quantityInBaseUnits: 250,
          },
          {
            packageSize: null,
            quantity: 100,
            unit: 'g' as const,
            quantityInBaseUnits: 100,
          },
        ],
        isFeasible: true,
      };

      const summary = getOutboundPlanSummary(plan);
      expect(summary.packageCount).toBe(2);
      expect(summary.looseQuantity).toBe(100);
      expect(summary.totalQuantity).toBe(850);
      expect(summary.packageSizes).toEqual([500, 250]);
    });

    it('should sort package sizes in descending order', () => {
      const plan = {
        medicineId: '1',
        requiredQuantity: 700,
        totalAvailable: 2000,
        items: [
          {
            packageSize: 250,
            quantity: 1,
            unit: '包' as const,
            quantityInBaseUnits: 250,
          },
          {
            packageSize: 500,
            quantity: 1,
            unit: '包' as const,
            quantityInBaseUnits: 500,
          },
        ],
        isFeasible: true,
      };

      const summary = getOutboundPlanSummary(plan);
      expect(summary.packageSizes).toEqual([500, 250]); // Sorted descending
    });
  });
});
