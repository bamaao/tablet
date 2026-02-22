/**
 * Additional utility functions for the Medical Inventory System
 */

// ============================================================================
// MEDICINE HELPERS
// ============================================================================

/**
 * Get medicine display name with pinyin
 */
export function getMedicineDisplayName(medicine: {
  name: string;
  pinyin?: string;
}): string {
  return medicine.pinyin ? `${medicine.name} (${medicine.pinyin})` : medicine.name;
}

/**
 * Format medicine category for display
 */
export function formatMedicineCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    CHINESE_HERB: '中药材',
    CHINESE_PATENT: '中成药',
    WESTERN_MEDICINE: '西药',
    SUPPLIES: '医疗用品',
  };
  return categoryMap[category] || '其他';
}

/**
 * Get color for medicine category
 */
export function getMedicineCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    CHINESE_HERB: '#4CAF50',
    CHINESE_PATENT: '#FF9800',
    WESTERN_MEDICINE: '#2196F3',
    SUPPLIES: '#9E9E9E',
  };
  return colorMap[category] || '#757575';
}

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

/**
 * Format transaction type for display
 */
export function formatTransactionType(type: string): string {
  const typeMap: Record<string, string> = {
    INBOUND: '入库',
    OUTBOUND: '出库',
    UNPACK: '拆包',
    AUDIT: '盘点',
  };
  return typeMap[type] || type;
}

/**
 * Get transaction type color
 */
export function getTransactionTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    INBOUND: '#4CAF50',
    OUTBOUND: '#2196F3',
    UNPACK: '#FF9800',
    AUDIT: '#9C27B0',
  };
  return colorMap[type] || '#757575';
}

// ============================================================================
// DATE/TIME HELPERS
// ============================================================================

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString('zh-CN');
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate Chinese medicine name
 */
export function isValidMedicineName(name: string): boolean {
  // Chinese characters only, 2-10 characters
  return /^[\u4e00-\u9fa5]{2,10}$/.test(name);
}

/**
 * Validate quantity input
 */
export function isValidQuantity(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0 && num <= 1000000;
}

/**
 * Validate prescription name
 */
export function isValidPrescriptionName(name: string): boolean {
  // Chinese characters, 2-15 characters
  return /^[\u4e00-\u9fa5]{2,15}$/.test(name);
}

// ============================================================================
// STRING HELPERS
// ============================================================================

/**
 * Convert Chinese to pinyin (simplified version)
 * Note: This is a basic implementation. For production, use a proper pinyin library.
 */
export function toPinyin(chinese: string): string {
  // Basic mapping for common medicine names
  // In production, use a library like pinyin-pro
  const commonMap: Record<string, string> = {
    当归: 'dang gui',
    黄芪: 'huang qi',
    甘草: 'gan cao',
    党参: 'dang shen',
    白术: 'bai zhu',
    茯苓: 'fu ling',
    熟地: 'shu di',
    白芍: 'bai shao',
    川芎: 'chuan xiong',
  };

  return commonMap[chinese] || chinese;
}

/**
 * Search query highlighter
 */
export function highlightMatch(text: string, query: string): string {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '**$1**');
}
