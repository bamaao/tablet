/**
 * Tablet inventory UI tokens aligned with design-export mockups and project docs.
 */
import {InventoryMode} from '@/types';

/** Brand teal from design-export (headers, filters, voice bar accents). */
export const BRAND_TEAL = '#12968B';

/** Primary action / selected state per operation mode. */
export const MODE_ACCENT: Record<InventoryMode, string> = {
  [InventoryMode.INBOUND]: '#1976D2',
  [InventoryMode.OUTBOUND]: '#FF6600',
  [InventoryMode.UNPACK]: '#7B1FA2',
  [InventoryMode.AUDIT]: '#00897B',
};

export const VOICE_HINT_BY_MODE: Record<InventoryMode, string> = {
  [InventoryMode.INBOUND]: '说「入库当归 500 克」开始操作',
  [InventoryMode.OUTBOUND]: '说「出库当归 200 克」开始操作',
  [InventoryMode.UNPACK]: '说「拆包当归 1 包」开始操作',
  [InventoryMode.AUDIT]: '说「盘点当归实盘 500 克」开始操作',
};

export function formatTabletHeaderDate(date: Date = new Date()): string {
  const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${w[date.getDay()]}`;
}
