/**
 * Outbound Calculator
 *
 * 智能出库计算器 - 根据库存和需求计算最优出库方案
 *
 * 支持多规格包装混合出库，自动计算最优包装组合策略。
 */

import {OutboundPlan, OutboundPlanItem, OutboundStrategy} from '@/types';
import {PackagedStockBySize} from '@/store/slices/inventorySlice';

/**
 * 计算最优出库方案
 *
 * 根据用户需要的数量，自动计算最优的包装组合策略。
 *
 * @param packagedStockBySize - 按规格分组的包装库存
 * @param looseStock - 散装库存（基础单位）
 * @param requiredQuantity - 需要的数量（基础单位）
 * @param strategy - 出库策略
 * @returns 出库方案
 */
export function calculateOptimalOutboundPlan(
  packagedStockBySize: PackagedStockBySize[],
  looseStock: number,
  requiredQuantity: number,
  strategy: OutboundStrategy = 'optimal',
): OutboundPlan {
  const items: OutboundPlanItem[] = [];
  let remaining = requiredQuantity;

  // Calculate total available stock
  const totalPackagedStock = packagedStockBySize.reduce(
    (sum, stock) => sum + stock.packageSize * stock.count,
    0,
  );
  const totalAvailable = totalPackagedStock + looseStock;

  // Check if stock is sufficient
  if (totalAvailable < requiredQuantity) {
    return {
      medicineId: '',
      requiredQuantity,
      totalAvailable,
      items: [],
      isFeasible: false,
      reason: `库存不足：需要 ${requiredQuantity}，可用 ${totalAvailable}`,
    };
  }

  // Sort stock based on strategy
  let sortedStock = [...packagedStockBySize];

  switch (strategy) {
    case 'optimal':
      // Sort by package size descending (largest first)
      sortedStock.sort((a, b) => b.packageSize - a.packageSize);
      break;
    case 'greedy':
      // Sort by package size descending (same as optimal for now)
      sortedStock.sort((a, b) => b.packageSize - a.packageSize);
      break;
    case 'loose_first':
      // Use loose stock first, then packages
      break;
    case 'package_only':
      // Sort by package size descending, don't use loose stock
      sortedStock.sort((a, b) => b.packageSize - a.packageSize);
      break;
  }

  // Strategy: loose_first - use loose stock first
  if (strategy === 'loose_first' && looseStock > 0) {
    const looseToUse = Math.min(remaining, looseStock);
    items.push({
      packageSize: null,
      quantity: looseToUse,
      unit: 'g',
      quantityInBaseUnits: looseToUse,
    });
    remaining -= looseToUse;
  }

  // Try to use packaged stock (for all strategies except pure loose scenarios)
  for (const {packageSize, count} of sortedStock) {
    if (remaining <= 0) break;

    // Calculate how many packages we can use
    // For optimal: use as many large packages as possible
    // For greedy: use whatever packages are available
    // For loose_first: use packages after loose stock is exhausted
    // For package_only: only use packages
    let packagesToUse = 0;

    // Calculate max packages we can use
    const maxPackages = Math.min(count, Math.ceil(remaining / packageSize));

    if (maxPackages > 0) {
      // Try to use floor(remaining / packageSize) packages
      // If remaining is not divisible, we use floor() + maybe 1 package
      const fullPackages = Math.floor(remaining / packageSize);
      packagesToUse = fullPackages > 0 ? fullPackages : 1;

      // But don't use more than available
      packagesToUse = Math.min(packagesToUse, maxPackages);

      if (packagesToUse > 0) {
        items.push({
          packageSize,
          quantity: packagesToUse,
          unit: '包',
          quantityInBaseUnits: packagesToUse * packageSize,
        });
        remaining -= packagesToUse * packageSize;
      }
    }
  }

  // If still remaining and not package_only or loose_first strategy, use loose stock
  if (remaining > 0 && strategy !== 'package_only' && strategy !== 'loose_first') {
    const looseToUse = Math.min(remaining, looseStock);
    items.push({
      packageSize: null,
      quantity: looseToUse,
      unit: 'g',
      quantityInBaseUnits: looseToUse,
    });
    remaining -= looseToUse;
  }

  // Calculate total provided
  const totalProvided = items.reduce((sum, item) => sum + item.quantityInBaseUnits, 0);

  return {
    medicineId: '',
    requiredQuantity,
    totalAvailable,
    items,
    isFeasible: totalProvided >= requiredQuantity,
  };
}

/**
 * 格式化出库方案为可读字符串
 *
 * @param plan - 出库方案
 * @returns 可读的字符串表示
 */
export function formatOutboundPlan(plan: OutboundPlan): string {
  if (!plan.isFeasible) {
    return plan.reason || '无法生成出库方案';
  }

  if (plan.items.length === 0) {
    return '无需出库';
  }

  const parts: string[] = [];

  for (const item of plan.items) {
    if (item.packageSize === null) {
      // Loose stock
      parts.push(`${item.quantity}g散装`);
    } else {
      // Packaged stock
      parts.push(`${item.quantity}包${item.packageSize}g/包`);
    }
  }

  const total = plan.items.reduce((sum, item) => sum + item.quantityInBaseUnits, 0);
  parts.push(`总计：${total}g`);

  return parts.join(' + ');
}

/**
 * 验证出库方案的可行性
 *
 * 检查出库方案是否可以实际执行（库存是否足够）
 *
 * @param plan - 出库方案
 * @param packagedStockBySize - 按规格分组的包装库存
 * @param looseStock - 散装库存
 * @returns 是否可行
 */
export function validateOutboundPlan(
  plan: OutboundPlan,
  packagedStockBySize: PackagedStockBySize[],
  looseStock: number,
): boolean {
  // Check if plan is marked as feasible
  if (!plan.isFeasible) {
    return false;
  }

  // Verify each item against available stock
  const packagedUsage = new Map<number, number>();
  let looseUsage = 0;

  for (const item of plan.items) {
    if (item.packageSize === null) {
      // Loose stock
      looseUsage += item.quantityInBaseUnits;
    } else {
      // Packaged stock
      packagedUsage.set(
        item.packageSize,
        (packagedUsage.get(item.packageSize) || 0) + item.quantity,
      );
    }
  }

  // Check loose stock availability
  if (looseUsage > looseStock) {
    return false;
  }

  // Check packaged stock availability
  for (const [packageSize, count] of packagedUsage.entries()) {
    const available = packagedStockBySize.find(s => s.packageSize === packageSize);
    if (!available || available.count < count) {
      return false;
    }
  }

  return true;
}

/**
 * 计算出库方案的摘要信息
 *
 * @param plan - 出库方案
 * @returns 摘要信息对象
 */
export function getOutboundPlanSummary(plan: OutboundPlan): {
  packageCount: number;
  looseQuantity: number;
  totalQuantity: number;
  packageSizes: number[];
} {
  const packageSizes: number[] = [];
  let packageCount = 0;
  let looseQuantity = 0;

  for (const item of plan.items) {
    if (item.packageSize === null) {
      looseQuantity += item.quantityInBaseUnits;
    } else {
      packageCount += item.quantity;
      if (!packageSizes.includes(item.packageSize)) {
        packageSizes.push(item.packageSize);
      }
    }
  }

  const totalQuantity = plan.items.reduce(
    (sum, item) => sum + item.quantityInBaseUnits,
    0,
  );

  return {
    packageCount,
    looseQuantity,
    totalQuantity,
    packageSizes: packageSizes.sort((a, b) => b - a),
  };
}
