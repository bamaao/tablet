/**
 * Unit Converter
 *
 * Handles unit conversions for Chinese medical inventory using big.js for precision.
 * Supports both weight (grams) and volume (milliliters) based units.
 *
 * Base Units:
 * - Weight: grams (g)
 * - Volume: milliliters (ml)
 *
 * Chinese Units:
 * - 1斤 = 500g
 * - 1两 = 50g
 * - 1钱 = 5g
 * - 1分 = 0.5g
 */

import Big from 'big.js';
import {UnitType} from '@/types';

// ============================================================================
// CONVERSION FACTORS (to base units)
// ============================================================================

const WEIGHT_CONVERSIONS: Record<UnitType, number> = {
  // Metric units
  g: 1,
  kg: 1000,
  mg: 0.001,

  // Chinese traditional units
  '斤': 500,
  '两': 50,
  '钱': 5,
  '分': 0.5,

  // Volume units (no conversion for weight)
  ml: 0, // Will be handled as error
  L: 0,
  '包': 0, // Package - needs medicine context
  '盒': 0,
  '瓶': 0,
};

const VOLUME_CONVERSIONS: Record<UnitType, number> = {
  // Volume units
  ml: 1,
  L: 1000,

  // Weight units (no conversion for volume)
  g: 0,
  kg: 0,
  mg: 0,
  '斤': 0,
  '两': 0,
  '钱': 0,
  '分': 0,

  // Package units
  '包': 0,
  '盒': 0,
  '瓶': 0,
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a unit is a weight unit
 */
export function isWeightUnit(unit: UnitType): boolean {
  return ['g', 'kg', 'mg', '斤', '两', '钱', '分'].includes(unit);
}

/**
 * Check if a unit is a volume unit
 */
export function isVolumeUnit(unit: UnitType): boolean {
  return ['ml', 'L'].includes(unit);
}

/**
 * Check if a unit is a package unit (requires medicine context)
 */
export function isPackageUnit(unit: UnitType): boolean {
  return ['包', '盒', '瓶'].includes(unit);
}

/**
 * Get the base unit for a given unit type
 */
export function getBaseUnit(unit: UnitType): 'g' | 'ml' {
  if (isWeightUnit(unit)) return 'g';
  if (isVolumeUnit(unit)) return 'ml';
  // Default to grams for package units
  return 'g';
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert any quantity+unit to base units (g or ml)
 *
 * @param quantity - The quantity in the given unit
 * @param unit - The unit to convert from
 * @param packageSize - Size of one package in base units (required for package units)
 * @returns The quantity in base units
 *
 * @example
 * convertToBaseUnits(5, '包', 500) // => 2500 (g)
 * convertToBaseUnits(1, '斤') // => 500 (g)
 * convertToBaseUnits(3, '两') // => 150 (g)
 */
export function convertToBaseUnits(
  quantity: number | string,
  unit: UnitType,
  packageSize?: number,
): number {
  const qty = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

  // Handle package units
  if (isPackageUnit(unit)) {
    if (packageSize === undefined) {
      throw new Error(`Package size required for unit: ${unit}`);
    }
    return new Big(qty).times(packageSize).toNumber();
  }

  // Handle weight units
  if (isWeightUnit(unit)) {
    const factor = WEIGHT_CONVERSIONS[unit];
    if (factor === 0) {
      throw new Error(`Invalid weight unit: ${unit}`);
    }
    return new Big(qty).times(factor).toNumber();
  }

  // Handle volume units
  if (isVolumeUnit(unit)) {
    const factor = VOLUME_CONVERSIONS[unit];
    if (factor === 0) {
      throw new Error(`Invalid volume unit: ${unit}`);
    }
    return new Big(qty).times(factor).toNumber();
  }

  throw new Error(`Unknown unit: ${unit}`);
}

/**
 * Convert from base units to a specific display unit
 *
 * @param baseQuantity - The quantity in base units (g or ml)
 * @param targetUnit - The unit to convert to
 * @param packageSize - Size of one package in base units (required for package units)
 * @returns The quantity in the target unit
 *
 * @example
 * convertFromBaseUnits(2500, '包', 500) // => 5 (packages)
 * convertFromBaseUnits(500, '斤') // => 1 (斤)
 * convertFromBaseUnits(150, '两') // => 3 (两)
 */
export function convertFromBaseUnits(
  baseQuantity: number | string,
  targetUnit: UnitType,
  packageSize?: number,
): number {
  const qty = typeof baseQuantity === 'string' ? parseFloat(baseQuantity) : baseQuantity;

  // Handle package units
  if (isPackageUnit(targetUnit)) {
    if (packageSize === undefined || packageSize === 0) {
      throw new Error(`Package size required for unit: ${targetUnit}`);
    }
    return new Big(qty).div(packageSize).toNumber();
  }

  // Handle weight units
  if (isWeightUnit(targetUnit)) {
    const factor = WEIGHT_CONVERSIONS[targetUnit];
    if (factor === 0) {
      throw new Error(`Invalid weight unit: ${targetUnit}`);
    }
    return new Big(qty).div(factor).toNumber();
  }

  // Handle volume units
  if (isVolumeUnit(targetUnit)) {
    const factor = VOLUME_CONVERSIONS[targetUnit];
    if (factor === 0) {
      throw new Error(`Invalid volume unit: ${targetUnit}`);
    }
    return new Big(qty).div(factor).toNumber();
  }

  throw new Error(`Unknown unit: ${targetUnit}`);
}

/**
 * Convert between any two units of the same type
 *
 * @param quantity - The quantity to convert
 * @param fromUnit - Source unit
 * @param toUnit - Target unit
 * @param packageSize - Package size in base units (if either unit is a package unit)
 * @returns The converted quantity
 *
 * @example
 * convertUnits(2, '斤', '两') // => 20 (两)
 * convertUnits(10, '两', '钱') // => 100 (钱)
 */
export function convertUnits(
  quantity: number,
  fromUnit: UnitType,
  toUnit: UnitType,
  packageSize?: number,
): number {
  // Convert to base units first
  const baseQuantity = convertToBaseUnits(quantity, fromUnit, packageSize);

  // Then convert to target unit
  return convertFromBaseUnits(baseQuantity, toUnit, packageSize);
}

/**
 * Format a quantity with appropriate unit for display
 *
 * @param baseQuantity - Quantity in base units
 * @param packageSize - Package size (optional)
 * @param options - Formatting options
 * @returns Formatted string
 *
 * @example
 * formatForDisplay(1500, 'g') // "1500g"
 * formatForDisplay(2500, 'g', 500) // "5包" (if packageSize provided)
 * formatForDisplay(50, 'g', 500, {preferPackages: true}) // "0包 + 50g"
 */
export function formatForDisplay(
  baseQuantity: number,
  baseUnit: 'g' | 'ml' = 'g',
  packageSize?: number,
  options: {preferPackages?: boolean; precision?: number} = {},
): string {
  const {preferPackages = false, precision = 0} = options;

  // If no package size, just show base units
  if (!packageSize) {
    return `${baseQuantity.toFixed(precision)}${baseUnit}`;
  }

  // If we should show packages
  if (preferPackages && packageSize > 0) {
    const packages = Math.floor(baseQuantity / packageSize);
    const remaining = baseQuantity % packageSize;

    if (packages > 0 && remaining > 0) {
      return `${packages}包 + ${remaining.toFixed(precision)}${baseUnit}`;
    } else if (packages > 0) {
      return `${packages}包`;
    } else {
      return `${remaining.toFixed(precision)}${baseUnit}`;
    }
  }

  // Default: show in base units
  return `${baseQuantity.toFixed(precision)}${baseUnit}`;
}

// ============================================================================
// UNPACK OPERATION CALCULATIONS
// ============================================================================

/**
 * Calculate the result of an unpack operation
 *
 * @param currentPackaged - Current packaged stock (count)
 * @param packagesToUnpack - Number of packages to unpack
 * @param packageSize - Size of one package in base units
 * @param currentLoose - Current loose stock in base units
 * @returns Object with new stock values
 *
 * @example
 * calculateUnpack(5, 2, 500, 1000)
 * // => { packagedStock: 3, looseStock: 2000, unpackedAmount: 1000 }
 */
export function calculateUnpack(
  currentPackaged: number,
  packagesToUnpack: number,
  packageSize: number,
  currentLoose: number,
): {
  packagedStock: number;
  looseStock: number;
  unpackedAmount: number;
} {
  const packagesToUnpackBig = new Big(packagesToUnpack);
  const packageSizeBig = new Big(packageSize);

  const unpackedAmount = packagesToUnpackBig.times(packageSizeBig).toNumber();
  const newPackagedStock = new Big(currentPackaged).minus(packagesToUnpackBig).toNumber();
  const newLooseStock = new Big(currentLoose).plus(unpackedAmount).toNumber();

  return {
    packagedStock: Math.max(0, newPackagedStock),
    looseStock: Math.max(0, newLooseStock),
    unpackedAmount,
  };
}

/**
 * Validate if an unpack operation is possible
 *
 * @param currentPackaged - Current packaged stock
 * @param packagesToUnpack - Packages to unpack
 * @returns true if operation is valid
 */
export function canUnpack(currentPackaged: number, packagesToUnpack: number): boolean {
  return new Big(packagesToUnpack).lte(currentPackaged) && currentPackaged > 0;
}

// ============================================================================
// STOCK CALCULATION HELPERS
// ============================================================================

/**
 * Calculate total stock from loose and packaged components
 *
 * @param looseStock - Loose stock in base units
 * @param packagedStock - Packaged stock count
 * @param packageSize - Package size in base units
 * @returns Total stock in base units
 */
export function calculateTotalStock(
  looseStock: number,
  packagedStock: number,
  packageSize: number,
): number {
  return new Big(looseStock).plus(new Big(packagedStock).times(packageSize)).toNumber();
}

/**
 * Distribute a total quantity into packages and loose units
 *
 * @param totalQuantity - Total quantity in base units
 * @param packageSize - Package size in base units
 * @returns Object with package count and loose amount
 */
export function distributeToPackages(
  totalQuantity: number,
  packageSize: number,
): {packages: number; loose: number} {
  const packagesBig = new Big(totalQuantity).div(packageSize);
  const packages = Math.floor(packagesBig.toNumber());
  const loose = new Big(totalQuantity).minus(new Big(packages).times(packageSize)).toNumber();

  return {packages, loose};
}

// ============================================================================
// COMPARISON HELPERS
// ============================================================================

/**
 * Compare two quantities in base units (safe for floating point)
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareQuantities(a: number, b: number): number {
  const bigA = new Big(a);
  const bigB = new Big(b);

  if (bigA.lt(bigB)) return -1;
  if (bigA.gt(bigB)) return 1;
  return 0;
}

/**
 * Check if there's enough stock for an operation
 */
export function hasEnoughStock(currentStock: number, required: number): boolean {
  return new Big(currentStock).gte(required);
}

/**
 * Calculate the remaining stock after an operation
 */
export function calculateRemainingStock(currentStock: number, toDeduct: number): number {
  return new Big(currentStock).minus(toDeduct).toNumber();
}
