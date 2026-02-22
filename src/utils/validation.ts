/**
 * Validation utilities for the Medical Inventory System
 */

import {isValidMedicineName, isValidQuantity, isValidPrescriptionName} from './helpers';

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// ============================================================================
// MEDICINE VALIDATION
// ============================================================================

export function validateMedicine(medicine: {
  name: string;
  category: string;
  baseUnit: string;
  packageUnit: string;
  packageSize: number;
  minStock: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Name validation
  if (!medicine.name || medicine.name.trim().length === 0) {
    errors.push('药品名称不能为空');
  } else if (!isValidMedicineName(medicine.name)) {
    errors.push('药品名称格式不正确（2-10个中文字符）');
  }

  // Category validation
  const validCategories = ['CHINESE_HERB', 'CHINESE_PATENT', 'WESTERN_MEDICINE', 'SUPPLIES'];
  if (!validCategories.includes(medicine.category)) {
    errors.push('无效的药品分类');
  }

  // Unit validation
  if (!medicine.baseUnit || !['g', 'ml'].includes(medicine.baseUnit)) {
    errors.push('基础单位必须是 g 或 ml');
  }

  if (!medicine.packageUnit) {
    errors.push('包装单位不能为空');
  }

  // Package size validation
  if (medicine.packageSize <= 0) {
    errors.push('包装规格必须大于0');
  } else if (medicine.packageSize > 10000) {
    warnings.push('包装规格较大，请确认');
  }

  // Min stock validation
  if (medicine.minStock < 0) {
    errors.push('最低库存不能为负数');
  } else if (medicine.minStock === 0) {
    warnings.push('最低库存设置为0，将不会收到库存预警');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// TRANSACTION VALIDATION
// ============================================================================

export function validateTransaction(transaction: {
  type: string;
  quantity: number;
  unit: string;
  medicineId?: string;
  currentStock?: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Type validation
  const validTypes = ['INBOUND', 'OUTBOUND', 'UNPACK', 'AUDIT'];
  if (!validTypes.includes(transaction.type)) {
    errors.push('无效的交易类型');
  }

  // Quantity validation
  if (transaction.quantity <= 0) {
    errors.push('数量必须大于0');
  }

  // Unit validation
  const validUnits = ['g', 'kg', 'mg', 'ml', 'L', '斤', '两', '钱', '分', '包', '盒', '瓶'];
  if (!transaction.unit || !validUnits.includes(transaction.unit)) {
    errors.push('无效的单位');
  }

  // Stock availability check for outbound
  if (transaction.type === 'OUTBOUND' && transaction.currentStock !== undefined) {
    if (transaction.quantity > transaction.currentStock) {
      errors.push(`库存不足。当前库存: ${transaction.currentStock}`);
    } else if (transaction.quantity > transaction.currentStock * 0.9) {
      warnings.push('将使用大部分库存');
    }
  }

  // Package availability check for unpack
  if (transaction.type === 'UNPACK') {
    if (transaction.unit !== '包') {
      errors.push('拆包操作单位必须是包');
    }
    if (transaction.currentStock !== undefined) {
      // Assuming packaged stock is tracked separately
      // This would need more context to validate properly
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// PRESCRIPTION VALIDATION
// ============================================================================

export function validatePrescription(prescription: {
  name: string;
  items?: Array<{medicineId: string; quantity: number}>;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Name validation
  if (!prescription.name || prescription.name.trim().length === 0) {
    errors.push('处方名称不能为空');
  } else if (!isValidPrescriptionName(prescription.name)) {
    errors.push('处方名称格式不正确（2-15个中文字符）');
  }

  // Items validation
  if (!prescription.items || prescription.items.length === 0) {
    errors.push('处方必须包含至少一味药');
  } else if (prescription.items.length < 2) {
    warnings.push('处方只包含一味药，请确认');
  } else if (prescription.items.length > 30) {
    warnings.push('处方药味较多，请确认');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// AUDIT VALIDATION
// ============================================================================

export function validateAuditEntry(audit: {
  expectedStock: number;
  actualStock: number;
  unit: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Stock validation
  if (audit.actualStock < 0) {
    errors.push('实盘库存不能为负数');
  }

  if (audit.expectedStock < 0) {
    errors.push('账面库存不能为负数');
  }

  // Unit validation
  const validUnits = ['g', 'kg', 'mg', 'ml', 'L', '斤', '两', '钱', '分'];
  if (!audit.unit || !validUnits.includes(audit.unit)) {
    errors.push('无效的单位');
  }

  // Discrepancy warning
  const discrepancy = audit.actualStock - audit.expectedStock;
  const discrepancyPercentage = audit.expectedStock > 0
    ? (Math.abs(discrepancy) / audit.expectedStock) * 100
    : 0;

  if (discrepancyPercentage > 50) {
    warnings.push('差异较大，请仔细核对');
  } else if (discrepancy !== 0) {
    warnings.push('存在差异，已记录');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// DOSAGE VALIDATION
// ============================================================================

export function validateDosageCount(count: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (count <= 0) {
    errors.push('付数必须大于0');
  }

  if (count > 100) {
    warnings.push('付数较大，请确认');
  }

  if (!Number.isInteger(count)) {
    warnings.push('付数通常为整数');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
