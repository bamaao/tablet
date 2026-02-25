/**
 * Core type definitions for the Medical Inventory Management System
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum TransactionType {
  INBOUND = 'INBOUND',       // 入库
  OUTBOUND = 'OUTBOUND',     // 出库
  UNPACK = 'UNPACK',         // 拆包
  AUDIT = 'AUDIT',           // 盘点
}

export enum InventoryMode {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  UNPACK = 'UNPACK',
  AUDIT = 'AUDIT',
}

export enum UnitType {
  PACKAGE = '包',     // Package
  GRAM = 'g',         // Gram
  KILOGRAM = 'kg',    // Kilogram
  JIN = '斤',         // 500g
  LIANG = '两',       // 50g
  QIAN = '钱',        // 5g
  MILLILITER = 'ml',  // Milliliter
  LITER = 'L',        // Liter
  HE = '盒',          // Box
  BOTTLE = '瓶',      // Bottle
}

export enum MedicineCategory {
  CHINESE_HERB = 'CHINESE_HERB',           // 中药材
  CHINESE_PATENT = 'CHINESE_PATENT',       // 中成药
  WESTERN_MEDICINE = 'WESTERN_MEDICINE',   // 西药
  SUPPLIES = 'SUPPLIES',                   // 医疗用品
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Medicine {
  id: string;
  name: string;                    // 药品名称 (e.g., "当归")
  pinyin?: string;                 // 拼音 (for voice search)
  category: MedicineCategory;      // 药品分类
  baseUnit: UnitType;              // 基础单位 (g or ml)
  packageUnit: UnitType;           // 包装单位
  packageSize: number;             // 每包规格 in base units (e.g., 500 for 500g/包)
  currentStock: number;            // 当前库存 (in base units)
  looseStock: number;              // 散装库存 (in base units)
  packagedStock: number;           // 包装库存 (in packages, not base units)
  minStock: number;                // 最低库存预警 (in base units)
  location?: string;               // 存放位置
  createdAt: Date;
  updatedAt: Date;
}

export interface StockTransaction {
  id: string;
  medicineId: string;
  type: TransactionType;
  quantity: number;                // 数量 (in base units for most operations)
  unit: UnitType;
  beforeStock: number;             // 操作前库存 (base units)
  afterStock: number;              // 操作后库存 (base units)
  referenceId?: string;            // 关联单据ID (prescription_id, audit_id, etc.)
  notes?: string;
  createdAt: Date;
  synced: boolean;                 // 是否已同步到服务器
}

export interface Prescription {
  id: string;
  name: string;                    // 方剂名称 (e.g., "补中益气汤")
  pinyin?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicineId: string;
  quantity: number;                // 每付用量 (in base units)
  unit: UnitType;
  medicine: Medicine;              // Fetched relation
}

export interface AuditRecord {
  id: string;
  medicineId: string;
  expectedStock: number;           // 账面库存 (base units)
  actualStock: number;             // 实盘库存 (base units)
  discrepancy: number;             // 差异 (actual - expected)
  unit: UnitType;
  auditedAt: Date;
  auditedBy?: string;
  notes?: string;
  resolved: boolean;               // 是否已处理差异
}

export interface AuditSession {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  items: AuditRecord[];
}

// ============================================================================
// VOICE COMMAND TYPES
// ============================================================================

export interface VoiceCommand {
  action: 'INBOUND' | 'OUTBOUND' | 'UNPACK' | 'AUDIT' | 'PRESCRIPTION';
  medicine?: string;               // 药品名称
  quantity?: number;               // 数量
  unit?: UnitType;                 // 单位
  prescriptionName?: string;       // 方剂名称
  dosageCount?: number;            // 付数
  rawText: string;                 // 原始识别文本
  confidence?: number;             // 识别置信度
}

export interface VoiceParseResult {
  success: boolean;
  command?: VoiceCommand;
  error?: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface VoiceState {
  isListening: boolean;
  transcript: string;
  lastCommand?: VoiceCommand;
  error?: string;
  permissionGranted: boolean;
}

export interface InventoryState {
  medicines: Medicine[];
  transactions: StockTransaction[];
  currentMode: InventoryMode;
  selectedMedicine?: Medicine;
  loading: boolean;
  error?: string;
}

export interface AuditState {
  currentSession?: AuditSession;
  currentRecord?: AuditRecord;
  discrepancies: AuditRecord[];
  loading: boolean;
}

export interface PrescriptionState {
  prescriptions: Prescription[];
  selectedPrescription?: Prescription;
  dosageCount: number;             // 付数
  items: PrescriptionItem[];       // Loaded items for selected prescription
  availabilityCheck?: Map<string, boolean>; // medicineId -> hasEnoughStock
}

export interface UIState {
  loading: boolean;
  toastMessage?: string;
  errorDialog?: {
    title: string;
    message: string;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type StockDisplayInfo = {
  total: number;                   // 总库存 (base units)
  loose: number;                   // 散装 (base units)
  packaged: number;                // 包装数
  packagedInBase: number;          // 包装折合base units
  displayString: string;           // Display format (e.g., "2包 + 500g")
};

export type UnitConversionResult = {
  value: number;
  unit: UnitType;
  baseValue: number;
};

export type UnpackPlan = {
  medicineId: string;
  packagesToUnpack: number;
  resultingLooseStock: number;
  beforeStock: number;
  afterStock: number;
};

// ============================================================================
// OUTBOUND PLAN TYPES
// ============================================================================

/**
 * 出库方案中单项的出库计划
 */
export interface OutboundPlanItem {
  packageSize: number | null;  // 包装规格，null表示散装
  quantity: number;             // 出库数量（包数或基础单位数）
  unit: UnitType;               // 单位
  quantityInBaseUnits: number;  // 转换为基础单位的数量
}

/**
 * 完整的出库方案
 */
export interface OutboundPlan {
  medicineId: string;
  requiredQuantity: number;     // 用户需要的总数量（基础单位）
  totalAvailable: number;       // 可用总库存（基础单位）
  items: OutboundPlanItem[];    // 出库项列表
  isFeasible: boolean;          // 是否可行
  reason?: string;              // 不可行原因
}

/**
 * 出库策略类型
 */
export type OutboundStrategy =
  | 'optimal'      // 最优策略：优先大包装，避免拆包
  | 'greedy'       // 贪心策略：尽可能使用库存
  | 'loose_first'  // 优先散装
  | 'package_only'; // 仅使用包装
