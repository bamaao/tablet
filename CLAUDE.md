---

# CLAUDE.md - 医药库存管理系统 (React Native Tablet)

本文件定义了基于 React Native 的平板医药管理系统的技术架构、开发规范与单位逻辑。

## 1. 项目概况

针对 Android 平板优化的医疗物资管理应用。核心挑战在于**高精度的中西药单位换算**、**平板大屏交互适配**以及**语音自动化录入**。

## 2. 技术栈

* **框架**: React Native 0.73+ (使用新架构 TurboModules)
* **语言**: TypeScript (严格模式)
* **状态管理**: Redux Toolkit (处理复杂的库存状态流转)
* **数据库**: WatermelonDB 或 SQLite (支持高性能离线存储与观察者模式)
* **UI 组件库**: React Native Paper + FlashList (优化长列表性能)
* **语音能力**: `react-native-voice` (语音识别) + `react-native-tts` (语音反馈)

## 3. 核心业务逻辑

### 3.1 拆包逻辑 (Unpacking / Breaking Bulk)

系统支持将整包装药品转换为散装/最小单位。

* **触发条件**：手动点击“拆包”或语音指令“拆包[药品名]”。
* **事务处理**：
1. **减少**整包库存（例如：-1 包 当归）。
2. **增加**散装库存（例如：+500g 当归）。
3. **日志记录**：自动生成一条类型为 `UNPACKING` 的库存变动流水，关联原包装 ID 与目标散装 ID。

### 3.2 盘点逻辑 (Inventory Audit)

支持“盲盘”与“明盘”两种模式。

* **实盘录入**：支持通过语音依次报数（如：“当归实盘 450 克”）。
* **盈亏计算**：`系统库存 - 实盘数量 = 损耗/溢余`。
* **库存修正**：盘点确认后，系统自动生成 `ADJUSTMENT` 凭证，强制更新当前库存值。

### 3.3 按照药方出库

* **处方逻辑 (Prescription Logic)**：
* 支持“付数”概念，所有计算必须以 `单剂量 * 付数` 为准。
* **自动预警**：出库前必须进行全方库存预检查，若有一味药缺货，需阻塞出库并提示用户。
* **单位一致性**：处方明细单位应默认锁定为药品的 `base_unit`（如：克），避免计算逻辑混乱。

## 4. 库存单位设计逻辑

由于中药（如：1提 = 7饼 = 2450g）与西药（如：1箱 = 50盒）的计量逻辑不同，采用**最小包装单位（Base Unit）**作为底层存储。

### 换算模型

```typescript
interface UnitScaling {
  fromUnit: string;   // 源单位 (如: 箱)
  toUnit: string;     // 目标单位 (如: 瓶)
  multiplier: number; // 换算倍率 (如: 40)
}

interface StockItem {
  id: string;
  name: string;
  type: 'HERB' | 'WESTERN'; 
  currentQuantity: number; // 统一存储最小单位数量
  baseUnit: string;        // 最小单位 (如: 克/支)
  standardUnit: string;    // 常用单位 (如: 斤/盒)
}

```

## 5. 语音交互流程 (Voice UX)

应用需在平板界面保留“常驻语音监听”模式或“长按悬浮球”触发。

* **解析逻辑**: 采用正则表达式或轻量级 NLP 匹配关键词。
* **反馈回路**: 识别后需通过 TTS 语音播报确认（例如：“已为您入库当归 500 克，请确认”）。

## 6. 技术规范

### 6.1 数据结构示例 (TypeScript)

```typescript
interface StockTransaction {
  id: string;
  medId: string;
  type: 'INBOUND' | 'OUTBOUND' | 'UNPACK' | 'AUDIT'; 
  quantity: number;      // 变动数量
  unit: string;          // 变动单位
  conversionRef?: string; // 关联的拆包引用ID
}

interface Medicine {
  id: string;
  name: string;
  packageSize: number;   // 包装规格 (例如: 500)
  packageUnit: string;   // 包装单位 (例如: 包)
  baseUnit: string;      // 散装单位 (例如: g)
  currentStock: number;  // 总计最小单位库存 (例如: 2500g)
}

```

### 6.2 语音指令扩展

* **拆包指令**："拆包 [药品] [数量] [单位]" -> *“拆包当归一包”*。
* **盘点指令**："开始盘点 [药品]" -> *“开始盘点当归，实盘五百克”*。

## 7. 开发规范

### 命名与文件组织

* **组件**: PascalCase (如 `StockListContainer.tsx`)
* **Hook**: camelCase (如 `useInventoryCalculation.ts`)
* **样式**: 遵循 Flexbox 栅格系统，禁止使用硬编码的 `pixel` 数值，需使用响应式比例。

### 平板布局约束

* **双栏模式 (Master-Detail)**: 在平板横屏下，左侧 1/3 显示列表，右侧 2/3 显示详情与录入面板。
* **计算精度**: 使用 `big.js` 库处理药品重量，避免 JavaScript 浮点数运算错误 ()。

## 8. 开发约束

* **原子性**：拆包操作必须在同一个数据库事务（Transaction）中完成，防止出现整包扣除但散装未增加的情况。
* **单位精度**：使用 `big.js` 处理盘点盈亏，确保中药克数计算精确到小数点后两位。
* **平板UI**：盘点界面需支持“列表快速跳转”，左侧显示待盘点清单，右侧显示大数字键盘或语音输入波形。

## 9. 核心待办 (Roadmap)

* [ ] 确定 React Native 技术栈
* [ ] 搭建 React Native Tablet 基础响应式脚手架
* [ ] 封装 `useMedicineUnit` 钩子函数（处理单位转换逻辑）
* [ ] 集成 `react-native-voice` 并编写指令解析器
* [ ] 实现离线数据库 WatermelonDB 架构
* [ ] 药标/条形码扫码功能集成
* [ ] **开发拆包功能模块**：实现 `processUnpack(medId, count)` 逻辑
* [ ] **构建盘点工作流**：支持生成盈亏报表
* [ ] **集成语音解析**：支持“拆包”和“实盘”关键词识别
* [ ] **离线同步**：确保断网时盘点数据不丢失

---