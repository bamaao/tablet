/**
 * Voice Command Parser
 *
 * Parses Chinese voice commands for medical inventory operations.
 * Supports the following command patterns:
 *
 * 1. Stock In (入库): "入库当归5包" or "当归入库5包"
 * 2. Stock Out (出库): "出库黄芪500克" or "黄芪出库3两"
 * 3. Unpack (拆包): "拆包甘草2包" or "甘草拆包1包"
 * 4. Audit (盘点): "盘点当归实盘500克" or "当归盘点500克"
 * 5. Prescription (按方出库): "按补中益气汤抓7付" or "补中益气汤抓7付"
 *
 * @module utils/voice/CommandParser
 */

import {VoiceCommand, VoiceParseResult, TransactionType, UnitType} from '@/types';

// ============================================================================
// CHINESE NUMERAL CONVERSION
// ============================================================================

/**
 * Convert Chinese numerals to Arabic numbers
 * Handles: 一二三四五六七八九十百千万两半
 */
function chineseNumeralToNumber(chinese: string): number | null {
  const digitMap: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    两: 2,
    半: 0.5,
  };

  // Direct digit mapping
  if (digitMap[chinese] !== undefined) {
    return digitMap[chinese];
  }

  // Handle simple cases
  if (chinese === '十') return 10;
  if (chinese === '百') return 100;
  if (chinese === '千') return 1000;
  if (chinese === '万') return 10000;

  // Parse compound numbers (e.g., 二十五, 三百五十)
  const compoundPatterns = [
    {pattern: /([一二三四五六七八九十])百([一二三四五六七八九十])?([零十百千万])?/, handler: handleHundreds},
    {pattern: /([一二三四五六七八九十])千/, handler: handleThousands},
    {pattern: /([一二三四五六七八九十])([零十百千万])/, handler: handleTens},
  ];

  for (const {pattern, handler} of compoundPatterns) {
    const match = chinese.match(pattern);
    if (match) {
      return handler(match);
    }
  }

  return null;
}

function handleHundreds(match: RegExpMatchArray): number | null {
  const hundreds = digitToNumber(match[1]);
  if (hundreds === null) return null;

  let result = hundreds * 100;

  if (match[2]) {
    const tens = digitToNumber(match[2]);
    if (tens !== null) result += tens * 10;
  }

  return result;
}

function handleThousands(match: RegExpMatchArray): number | null {
  const thousands = digitToNumber(match[1]);
  return thousands !== null ? thousands * 1000 : null;
}

function handleTens(match: RegExpMatchArray): number | null {
  const tens = digitToNumber(match[1]);
  if (tens === null) return null;

  // Special case: 十 = 10, 二十 = 20, etc.
  if (match[0] === '十') return 10;
  if (match[1] === '十') return 10 + (match[2] ? digitToNumber(match[2]) || 0 : 0);

  return tens * 10;
}

function digitToNumber(chinese: string): number | null {
  const digitMap: Record<string, number> = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  };
  return digitMap[chinese] ?? null;
}

/**
 * Extract and convert quantity from text (Chinese numerals or Arabic numbers)
 */
function extractQuantity(text: string): {quantity: number; remainingText: string} {
  // Try Arabic numbers first (including decimals)
  const arabicMatch = text.match(/(\d+(?:\.\d+)?)\s*(.*)/);
  if (arabicMatch) {
    return {quantity: parseFloat(arabicMatch[1]), remainingText: arabicMatch[2]};
  }

  // Try Chinese numerals
  const chinesePatterns = [
    /([一二三四五六七八九十百千万两半]+)\s*(.*)/,
    /(\d+)\s*(.*)/,
  ];

  for (const pattern of chinesePatterns) {
    const match = text.match(pattern);
    if (match) {
      const quantity = chineseNumeralToNumber(match[1]);
      if (quantity !== null) {
        return {quantity, remainingText: match[2]};
      }
    }
  }

  return {quantity: 0, remainingText: text};
}

// ============================================================================
// UNIT RECOGNITION
// ============================================================================

const UNIT_PATTERNS: Record<UnitType, RegExp[]> = {
  '包': [/包/, /bāo/i],
  'g': [/克/, /[gG]/, /公[克]/],
  'kg': [/千[克]/, /[kK][gG]/],
  '斤': [/斤/],
  '两': [/两/],
  '钱': [/钱/],
  'ml': [/毫[升]/, /[mM][lL]/],
  'L': [/升/, /[lL](?!$)/],
  '盒': [/盒/],
  '瓶': [/瓶/],
};

/**
 * Extract unit from text
 */
function extractUnit(text: string): UnitType | null {
  for (const [unit, patterns] of Object.entries(UNIT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return unit as UnitType;
      }
    }
  }
  return null;
}

// ============================================================================
// COMMAND PATTERNS
// ============================================================================

interface CommandPattern {
  name: string;
  action: TransactionType | 'PRESCRIPTION';
  patterns: RegExp[];
  extract: (match: RegExpMatchArray) => Partial<VoiceCommand>;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  // INBOUND: "入库当归5包" or "当归入库5包" or "当归5包入库"
  {
    name: 'INBOUND',
    action: 'INBOUND',
    patterns: [
      /入库\s*([^\d]+?)(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)/,
      /([^\d]+?)(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)\s*入库/,
      /([^\d]+?)入库\s*(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)/,
    ],
    extract: (match) => ({
      medicine: match[1]?.trim(),
      quantity: parseFloat(match[2]),
      unit: extractUnit(match[3]) ?? 'g',
    }),
  },

  // OUTBOUND: "出库黄芪500克" or "黄芪出库3两"
  {
    name: 'OUTBOUND',
    action: 'OUTBOUND',
    patterns: [
      /出库\s*([^\d]+?)(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)/,
      /([^\d]+?)(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)\s*出库/,
      /([^\d]+?)出库\s*(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)/,
    ],
    extract: (match) => ({
      medicine: match[1]?.trim(),
      quantity: parseFloat(match[2]),
      unit: extractUnit(match[3]) ?? 'g',
    }),
  },

  // UNPACK: "拆包甘草2包" or "甘草拆包1包"
  {
    name: 'UNPACK',
    action: 'UNPACK',
    patterns: [
      /拆[包装]\s*([^\d]+?)(\d+(?:\.\d+)?)\s*包/,
      /([^\d]+?)拆[包装]\s*(\d+(?:\.\d+)?)\s*包/,
      /([^\d]+?)(\d+(?:\.\d+)?)\s*包\s*拆[包装]/,
    ],
    extract: (match) => ({
      medicine: match[1]?.trim(),
      quantity: parseFloat(match[2]),
      unit: '包',
    }),
  },

  // AUDIT: "盘点当归实盘500克" or "当归盘点500克"
  {
    name: 'AUDIT',
    action: 'AUDIT',
    patterns: [
      /盘点\s*([^\d]+?)(?:实盘)?(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)/,
      /([^\d]+?)(?:实盘)?(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)\s*盘点/,
      /([^\d]+?)盘点\s*(?:实盘)?(\d+(?:\.\d+)?)\s*([克包斤两钱盒瓶]+)/,
    ],
    extract: (match) => ({
      medicine: match[1]?.trim(),
      quantity: parseFloat(match[2]),
      unit: extractUnit(match[3]) ?? 'g',
    }),
  },

  // PRESCRIPTION: "按补中益气汤抓7付" or "补中益气汤抓7付"
  {
    name: 'PRESCRIPTION',
    action: 'PRESCRIPTION' as const,
    patterns: [
      /按([^\d]+?)[抓配]\s*(\d+(?:\.\d+)?)\s*付/,
      /([^\d]+?)[抓配]\s*(\d+(?:\.\d+)?)\s*付/,
      /([^\d]+?)按\s*(\d+(?:\.\d+)?)\s*付\s*[抓配]/,
    ],
    extract: (match) => ({
      prescriptionName: match[1]?.trim(),
      dosageCount: parseInt(match[2], 10),
    }),
  },
];

// ============================================================================
// MAIN PARSER FUNCTION
// ============================================================================

/**
 * Parse a voice command string into a structured VoiceCommand object
 *
 * @param text - The recognized text from speech-to-text
 * @returns VoiceParseResult with success status and parsed command or error
 *
 * @example
 * parseVoiceCommand("入库当归5包")
 * // => { success: true, command: { action: 'INBOUND', medicine: '当归', quantity: 5, unit: '包', rawText: '入库当归5包' } }
 *
 * parseVoiceCommand("按补中益气汤抓7付")
 * // => { success: true, command: { action: 'PRESCRIPTION', prescriptionName: '补中益气汤', dosageCount: 7, rawText: '按补中益气汤抓7付' } }
 */
export function parseVoiceCommand(text: string): VoiceParseResult {
  // Clean up the text
  const cleanedText = text.trim();

  if (!cleanedText) {
    return {
      success: false,
      error: 'Empty command',
    };
  }

  // Try each command pattern
  for (const pattern of COMMAND_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = cleanedText.match(regex);
      if (match) {
        try {
          const extracted = pattern.extract(match);
          const command: VoiceCommand = {
            action: pattern.action,
            rawText: cleanedText,
            ...extracted,
          };

          // Validate extracted command
          const validation = validateCommand(command);
          if (!validation.valid) {
            return {
              success: false,
              error: validation.error,
            };
          }

          return {
            success: true,
            command,
          };
        } catch (error) {
          console.error('Error parsing command:', error);
          continue;
        }
      }
    }
  }

  // If no pattern matched, try to provide a helpful error
  return {
    success: false,
    error: `Unable to parse command: "${cleanedText}". Please try again with a clear command like "入库当归5包" or "按补中益气汤抓7付"`,
  };
}

// ============================================================================
// COMMAND VALIDATION
// ============================================================================

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a parsed voice command
 *
 * @param command - The parsed voice command
 * @returns ValidationResult with valid flag and optional error message
 */
export function validateCommand(command: VoiceCommand): ValidationResult {
  // Validate INBOUND/OUTBOUND/UNPACK commands
  if (['INBOUND', 'OUTBOUND', 'UNPACK', 'AUDIT'].includes(command.action)) {
    if (!command.medicine) {
      return {
        valid: false,
        error: 'Medicine name is required',
      };
    }

    if (!command.quantity || command.quantity <= 0) {
      return {
        valid: false,
        error: 'Quantity must be greater than 0',
      };
    }

    if (!command.unit) {
      return {
        valid: false,
        error: 'Unit is required',
      };
    }

    // Medicine name should be 2-10 characters
    if (command.medicine.length < 2 || command.medicine.length > 10) {
      return {
        valid: false,
        error: 'Medicine name seems invalid (should be 2-10 characters)',
      };
    }
  }

  // Validate PRESCRIPTION commands
  if (command.action === 'PRESCRIPTION') {
    if (!command.prescriptionName) {
      return {
        valid: false,
        error: 'Prescription name is required',
      };
    }

    if (!command.dosageCount || command.dosageCount <= 0) {
      return {
        valid: false,
        error: 'Dosage count must be greater than 0',
      };
    }

    // Prescription name should be reasonable length
    if (command.prescriptionName.length < 2 || command.prescriptionName.length > 15) {
      return {
        valid: false,
        error: 'Prescription name seems invalid',
      };
    }
  }

  return {valid: true};
}

// ============================================================================
// STOCK AVAILABILITY CHECK
// ============================================================================

/**
 * Check if there's enough stock for a command (for OUTBOUND and PRESCRIPTION)
 *
 * @param command - The parsed voice command
 * @param currentStock - Current stock in base units
 * @param packageSize - Package size in base units (for unit conversion)
 * @returns Object with hasEnough flag and required quantity in base units
 */
export function checkStockAvailability(
  command: VoiceCommand,
  currentStock: number,
  packageSize?: number,
): {hasEnough: boolean; required: number; available: number} {
  if (command.action === 'PRESCRIPTION' || command.action === 'INBOUND' || command.action === 'AUDIT') {
    // These don't need stock checking at this level
    return {hasEnough: true, required: 0, available: currentStock};
  }

  if (!command.quantity || !command.unit) {
    return {hasEnough: false, required: 0, available: currentStock};
  }

  // Import dynamically to avoid circular dependency
  const {convertToBaseUnits} = require('../conversion/UnitConverter');

  const required = convertToBaseUnits(command.quantity, command.unit, packageSize);

  return {
    hasEnough: currentStock >= required,
    required,
    available: currentStock,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format a command for confirmation display
 */
export function formatCommandForConfirmation(command: VoiceCommand): string {
  const actionLabels: Record<string, string> = {
    INBOUND: '入库',
    OUTBOUND: '出库',
    UNPACK: '拆包',
    AUDIT: '盘点',
    PRESCRIPTION: '按方抓药',
  };

  if (command.action === 'PRESCRIPTION') {
    return `${actionLabels[command.action]}: ${command.prescriptionName} ${command.dosageCount}付`;
  }

  if (command.medicine && command.quantity && command.unit) {
    return `${actionLabels[command.action]}: ${command.medicine} ${command.quantity}${command.unit}`;
  }

  return command.rawText;
}

/**
 * Get command suggestions based on partial input
 */
export function getCommandSuggestions(partial: string): string[] {
  const suggestions: string[] = [];

  if (!partial) return [];

  const lowerPartial = partial.toLowerCase();

  // Context-aware suggestions
  if (lowerPartial.includes('入')) {
    suggestions.push('入库当归5包', '入库黄芪500克');
  } else if (lowerPartial.includes('出')) {
    suggestions.push('出库甘草3两', '出库当归100克');
  } else if (lowerPartial.includes('拆')) {
    suggestions.push('拆包甘草2包');
  } else if (lowerPartial.includes('盘') || lowerPartial.includes('点')) {
    suggestions.push('盘点当归实盘500克');
  } else if (lowerPartial.includes('抓') || lowerPartial.includes('配')) {
    suggestions.push('按补中益气汤抓7付');
  }

  return suggestions;
}
