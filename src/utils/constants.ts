/**
 * Constants for the Medical Inventory System
 */

// ============================================================================
// UNITS
// ============================================================================

export const WEIGHT_UNITS = ['g', 'kg', 'mg', '斤', '两', '钱', '分'] as const;
export const VOLUME_UNITS = ['ml', 'L'] as const;
export const PACKAGE_UNITS = ['包', '盒', '瓶'] as const;

export const ALL_UNITS = [...WEIGHT_UNITS, ...VOLUME_UNITS, ...PACKAGE_UNITS] as const;

// Unit conversion factors to base units
export const UNIT_CONVERSIONS: Record<string, number> = {
  // Weight
  g: 1,
  kg: 1000,
  mg: 0.001,
  '斤': 500,
  '两': 50,
  '钱': 5,
  '分': 0.5,

  // Volume
  ml: 1,
  L: 1000,

  // Package (depends on medicine)
  '包': 0,
  '盒': 0,
  '瓶': 0,
};

// ============================================================================
// MEDICINE CATEGORIES
// ============================================================================

export const MEDICINE_CATEGORIES = {
  CHINESE_HERB: 'CHINESE_HERB',
  CHINESE_PATENT: 'CHINESE_PATENT',
  WESTERN_MEDICINE: 'WESTERN_MEDICINE',
  SUPPLIES: 'SUPPLIES',
} as const;

export const MEDICINE_CATEGORY_LABELS: Record<string, string> = {
  CHINESE_HERB: '中药材',
  CHINESE_PATENT: '中成药',
  WESTERN_MEDICINE: '西药',
  SUPPLIES: '医疗用品',
};

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export const TRANSACTION_TYPES = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
  UNPACK: 'UNPACK',
  AUDIT: 'AUDIT',
} as const;

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  INBOUND: '入库',
  OUTBOUND: '出库',
  UNPACK: '拆包',
  AUDIT: '盘点',
};

// ============================================================================
// INVENTORY MODES
// ============================================================================

export const INVENTORY_MODES = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
  UNPACK: 'UNPACK',
  AUDIT: 'AUDIT',
} as const;

export const INVENTORY_MODE_LABELS: Record<string, string> = {
  INBOUND: '入库',
  OUTBOUND: '出库',
  UNPACK: '拆包',
  AUDIT: '盘点',
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_PACKAGE_SIZE = 500; // grams
export const DEFAULT_MIN_STOCK = 1000; // grams
export const DEFAULT_PRESCRIPTION_DOSAGE = 1; // 付

// ============================================================================
// VOICE COMMANDS
// ============================================================================

export const VOICE_COMMAND_PATTERNS = {
  INBOUND: [
    /入库\s*(.+?)\s*(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)/,
    /(.+?)\s*(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)\s*入库/,
  ],
  OUTBOUND: [
    /出库\s*(.+?)\s*(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)/,
    /(.+?)\s*(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)\s*出库/,
  ],
  UNPACK: [
    /拆[包装]\s*(.+?)\s*(\d+(?:\.\d+)?)\s*包/,
    /(.+?)\s*拆[包装]\s*(\d+(?:\.\d+)?)\s*包/,
  ],
  AUDIT: [
    /盘点\s*(.+?)\s*(?:实盘)?(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)/,
    /(.+?)\s*(?:实盘)?(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)\s*盘点/,
  ],
  PRESCRIPTION: [
    /按\s*(.+?)\s*[抓配]\s*(\d+(?:\.\d+)?)\s*付/,
    /(.+?)\s*[抓配]\s*(\d+(?:\.\d+)?)\s*付/,
  ],
} as const;

// ============================================================================
// UI CONSTANTS
// ========================================================================

export const UI_SIZES = {
  BORDER_RADIUS: 8,
  BUTTON_HEIGHT: 40,
  INPUT_HEIGHT: 56,
  HEADER_HEIGHT: 56,
  TAB_BAR_HEIGHT: 60,
  VOICE_BAR_HEIGHT: 80,
} as const;

export const UI_SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 24,
  XXL: 32,
} as const;

// ============================================================================
// COLORS
// ============================================================================

export const APP_COLORS = {
  PRIMARY: '#00695C',
  PRIMARY_CONTAINER: '#4DB6AC',
  SECONDARY: '#00695C',
  SECONDARY_CONTAINER: '#B2DFDB',
  BACKGROUND: '#F5F5F5',
  SURFACE: '#FFFFFF',
  ERROR: '#BA1A1A',
  ERROR_CONTAINER: '#FFDAD6',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  INFO: '#2196F3',
} as const;

// ============================================================================
// KEYBOARD SHORTCUTS (for future use)
// ============================================================================

export const KEYBOARD_SHORTCUTS = {
  NEW_TRANSACTION: 'Ctrl+N',
  SEARCH: 'Ctrl+F',
  VOICE: 'Ctrl+V',
  SAVE: 'Ctrl+S',
  CANCEL: 'Escape',
} as const;
