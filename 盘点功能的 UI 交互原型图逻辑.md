# 盘点功能的 UI 交互原型图逻辑

## 文档概述

本文档定义了药品库存盘点功能的完整业务逻辑，包括业务实体、业务规则、业务流程和UI交互设计。

**设计核心原则**：**"盲操优先、语音驱动、差异高亮、多人协作"**

**术语约定**：
- **管理员**：具有创建会话、分配任务、提交结果权限的用户
- **盘点员**：执行盘点操作的普通用户（管理员也可兼任盘点员）
- **会话**：一次完整的盘点活动
- **明细项**：单个药品的盘点任务

---

# 第一部分：业务实体

## 1.1 核心实体定义

### 1.1.1 盘点会话 (AuditSession)

一次完整的盘点活动，包含多个药品的盘点任务。

```
┌─────────────────────────────────────────────────────────────┐
│  AuditSession (盘点会话)                                     │
├─────────────────────────────────────────────────────────────┤
│  id: string                  // 会话唯一标识                  │
│  name: string                // 会话名称，如"2024年1月盘点"    │
│  status: AuditSessionStatus  // 状态（见枚举定义）             │
│  createdBy: string           // 创建人ID（管理员）             │
│  createdByName: string       // 创建人姓名                    │
│  createdAt: DateTime         // 创建时间                      │
│  startedAt: DateTime?        // 开始时间                      │
│  completedAt: DateTime?      // 完成时间                      │
│  submittedAt: DateTime?      // 提交时间                      │
│  submittedBy: string?        // 提交人ID                      │
│  totalMedicines: number      // 需盘点药品总数                 │
│  completedMedicines: number  // 已完成药品数（不含跳过）        │
│  skippedMedicines: number    // 已跳过药品数                   │
│  auditors: AuditorSession[]  // 参与的盘点员列表               │
│  items: AuditItem[]          // 盘点明细项                    │
└─────────────────────────────────────────────────────────────┘
```

**会话状态枚举 (AuditSessionStatus)**：

| 状态 | 值 | 说明 | 可转换到 |
|------|-----|------|---------|
| 待开始 | `PENDING` | 会话已创建，等待开始 | `IN_PROGRESS` |
| 进行中 | `IN_PROGRESS` | 盘点进行中 | `COMPLETED`, `CANCELLED` |
| 已完成 | `COMPLETED` | 所有药品已盘点完成，等待提交 | `SUBMITTED`, `IN_PROGRESS` |
| 已提交 | `SUBMITTED` | 已提交，库存已更新 | - (终态) |
| 已取消 | `CANCELLED` | 会话已取消 | - (终态) |

**状态转换规则**：
```
PENDING ──[管理员开始]──> IN_PROGRESS
                          │
                          ├──[全部完成]──> COMPLETED
                          │                    │
                          │                    ├──[管理员提交]──> SUBMITTED
                          │                    │
                          │                    └──[有药品需重盘]──> IN_PROGRESS
                          │
                          └──[管理员取消]──> CANCELLED
```

### 1.1.2 盘点员会话 (AuditorSession)

单个盘点员在一次盘点会话中的工作状态。

```
┌─────────────────────────────────────────────────────────────┐
│  AuditorSession (盘点员会话)                                 │
├─────────────────────────────────────────────────────────────┤
│  id: string                  // 会话唯一标识                  │
│  auditSessionId: string      // 所属盘点会话ID                │
│  auditorId: string           // 盘点员ID                      │
│  auditorName: string         // 盘点员姓名                    │
│  auditorRole: Enum           // 角色：管理员/普通盘点员        │
│  status: AuditorStatus       // 状态（见枚举定义）             │
│  assignedMedicines: string[] // 分配的药品ID列表              │
│  currentMedicineId: string?  // 当前正在盘点的药品ID          │
│  completedCount: number      // 已完成数量                    │
│  skippedCount: number        // 已跳过数量                    │
│  joinedAt: DateTime          // 加入时间                      │
│  lastActiveAt: DateTime      // 最后活跃时间                  │
│  leftAt: DateTime?           // 离开时间                      │
└─────────────────────────────────────────────────────────────┘
```

**盘点员状态枚举 (AuditorStatus)**：

| 状态 | 值 | 说明 | 触发条件 |
|------|-----|------|---------|
| 活跃 | `ACTIVE` | 正在盘点 | 有操作活动 |
| 空闲 | `IDLE` | 暂时无操作 | 2分钟无操作 |
| 已离开 | `LEFT` | 已退出盘点 | 主动退出或超时 |

### 1.1.3 盘点明细项 (AuditItem)

单个药品的盘点状态和结果。

```
┌─────────────────────────────────────────────────────────────┐
│  AuditItem (盘点明细项)                                      │
├─────────────────────────────────────────────────────────────┤
│  id: string                  // 明细项唯一标识                 │
│  auditSessionId: string      // 所属盘点会话ID                │
│  medicineId: string          // 药品ID                        │
│  medicineName: string        // 药品名称                      │
│  medicineType: MedicineType  // 药品类型                      │
│                                                             │
│  // 系统账面数据（会话开始时的快照）                           │
│  systemStock: SystemStock    // 系统账面库存（多规格）         │
│                                                             │
│  // 盘点状态                                                 │
│  status: AuditItemStatus     // 状态（见枚举定义）             │
│  lockedBy: string?           // 锁定者盘点员ID                │
│  lockedByName: string?       // 锁定者姓名                    │
│  lockedAt: DateTime?         // 锁定时间                      │
│  lockExpiresAt: DateTime?    // 锁定过期时间                  │
│                                                             │
│  // 实盘数据（盘点完成后填写）                                │
│  actualStock: ActualStock?   // 实盘库存（多规格）             │
│  auditedBy: string?          // 盘点员ID                      │
│  auditedByName: string?      // 盘点员姓名                    │
│  auditedAt: DateTime?        // 盘点时间                      │
│                                                             │
│  // 差异数据                                                 │
│  discrepancy: Discrepancy?   // 差异信息                      │
│  reason: string?             // 盈亏原因                      │
│  notes: string?              // 备注                         │
│                                                             │
│  // 草稿数据（输入中暂存）                                    │
│  draftStock: ActualStock?    // 草稿实盘数据                  │
│  draftSavedAt: DateTime?     // 草稿保存时间                  │
│                                                             │
│  // 修改记录                                                 │
│  modifiedCount: number       // 修改次数                      │
│  modifiedBy: string?         // 最后修改人ID                  │
│  modifiedAt: DateTime?       // 最后修改时间                  │
└─────────────────────────────────────────────────────────────┘
```

**盘点明细项状态枚举 (AuditItemStatus)**：

| 状态 | 值 | 说明 | 可执行操作 | 可转换到 |
|------|-----|------|-----------|---------|
| 待盘点 | `PENDING` | 无人盘点 | 选择盘点 | `LOCKED` |
| 锁定中 | `LOCKED` | 被盘点员锁定 | 输入数据、跳过、超时释放 | `PENDING`, `SKIPPED`, `COMPLETED` |
| 已跳过 | `SKIPPED` | 已跳过 | 重新盘点 | `LOCKED` |
| 已完成 | `COMPLETED` | 盘点完成 | 查看、修改（会话未提交前） | `LOCKED`（修改时） |

**状态转换规则**：
```
PENDING ──[选择药品]──> LOCKED ──[确认提交]──> COMPLETED
    │                      │
    │                      ├──[跳过]──> SKIPPED
    │                      │                │
    │                      │                └──[重新盘点]──> LOCKED
    │                      │
    │                      └──[超时/取消]──> PENDING
    │
    └─────────────────────────────────────────

COMPLETED ──[修改]──> LOCKED ──[确认]──> COMPLETED
```

**重要说明**：
- 删除了 `IN_PROGRESS` 状态，因为 `LOCKED` 已表示盘点员正在操作该药品
- 锁定后即进入输入状态，无需额外状态

### 1.1.4 系统账面库存 (SystemStock)

药品在系统中的账面数据（会话开始时的快照）。

```
┌─────────────────────────────────────────────────────────────┐
│  SystemStock (系统账面库存)                                  │
├─────────────────────────────────────────────────────────────┤
│  medicineId: string          // 药品ID                       │
│  packages: PackageStock[]    // 包装库存列表                  │
│  looseGrams: number          // 散装克数                      │
│  snapshotAt: DateTime        // 快照时间（会话开始时）         │
│  readonly totalGrams: number // 总克数（计算字段）             │
│  readonly totalPackages: number // 总包数（计算字段）          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PackageStock (包装库存)                                     │
├─────────────────────────────────────────────────────────────┤
│  specGrams: number           // 规格克数，如500、250、200     │
│  quantity: number            // 数量（包）                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.1.5 实盘库存 (ActualStock)

盘点时实际清点的库存数据。

```
┌─────────────────────────────────────────────────────────────┐
│  ActualStock (实盘库存)                                      │
├─────────────────────────────────────────────────────────────┤
│  medicineId: string          // 药品ID                       │
│  packages: PackageActual[]   // 包装实盘列表                  │
│  looseGrams: number          // 散装克数                      │
│  readonly totalGrams: number // 总克数（计算字段）             │
│  readonly totalPackages: number // 总包数（计算字段）          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PackageActual (包装实盘)                                    │
├─────────────────────────────────────────────────────────────┤
│  specGrams: number           // 规格克数                      │
│  quantity: number            // 实盘数量（包）                 │
└─────────────────────────────────────────────────────────────┘
```

**重要说明**：
- 实盘规格必须来自系统账面快照中的规格列表
- 如果实盘发现新规格，需先通过入库功能添加后再盘点

### 1.1.6 差异信息 (Discrepancy)

盘点结果与系统账面的差异。

```
┌─────────────────────────────────────────────────────────────┐
│  Discrepancy (差异信息)                                      │
├─────────────────────────────────────────────────────────────┤
│  type: DiscrepancyType       // 类型（见枚举定义）             │
│  gramsDiff: number           // 克数差异（正=盘盈，负=盘亏）   │
│  packagesDiff: number        // 包数差异                      │
│  readonly requiresReason: boolean // 是否需要填写原因          │
└─────────────────────────────────────────────────────────────┘
```

**差异类型枚举 (DiscrepancyType)**：

| 类型 | 值 | 说明 | 克数差异 | 是否必填原因 |
|------|-----|------|---------|-------------|
| 一致 | `MATCH` | 实盘与账面一致 | = 0 | 否 |
| 盘盈 | `SURPLUS` | 实盘大于账面 | > 0 | 否（可选） |
| 盘亏 | `LOSS` | 实盘小于账面 | < 0 | **是（必须）** |

### 1.1.7 操作日志 (AuditLog)

记录盘点过程中的关键操作（供审计追溯）。

```
┌─────────────────────────────────────────────────────────────┐
│  AuditLog (操作日志)                                         │
├─────────────────────────────────────────────────────────────┤
│  id: string                  // 日志唯一标识                  │
│  auditSessionId: string      // 所属盘点会话ID                │
│  auditItemId: string?        // 相关明细项ID（可选）           │
│  action: AuditAction         // 操作类型                      │
│  operatorId: string          // 操作人ID                      │
│  operatorName: string        // 操作人姓名                    │
│  operatedAt: DateTime        // 操作时间                      │
│  details: object             // 操作详情（JSON）               │
│  ipAddress: string?          // 操作IP                        │
└─────────────────────────────────────────────────────────────┘
```

**操作类型枚举 (AuditAction)**：

| 操作 | 值 | 说明 |
|------|-----|------|
| 创建会话 | `SESSION_CREATE` | 管理员创建盘点会话 |
| 开始会话 | `SESSION_START` | 管理员开始盘点 |
| 提交会话 | `SESSION_SUBMIT` | 管理员提交盘点结果 |
| 取消会话 | `SESSION_CANCEL` | 管理员取消盘点 |
| 加入会话 | `AUDITOR_JOIN` | 盘点员加入 |
| 离开会话 | `AUDITOR_LEAVE` | 盘点员离开 |
| 锁定药品 | `ITEM_LOCK` | 盘点员锁定药品 |
| 释放锁定 | `ITEM_UNLOCK` | 释放锁定（含超时、取消） |
| 完成盘点 | `ITEM_COMPLETE` | 盘点员完成盘点 |
| 跳过药品 | `ITEM_SKIP` | 盘点员跳过药品 |
| 修改结果 | `ITEM_MODIFY` | 修改已完成的盘点结果 |
| 强制解锁 | `FORCE_UNLOCK` | 管理员强制释放锁定 |

---

# 第二部分：业务规则

## 2.1 盘点会话规则

### BR-001: 会话创建
| 规则项 | 说明 |
|--------|------|
| 权限要求 | 只有**管理员**角色可以创建盘点会话 |
| 必填内容 | 会话名称、需盘点的药品范围 |
| 初始状态 | `PENDING` |
| 系统操作 | 为每个药品创建 `AuditItem`，保存系统账面快照 |
| 记录日志 | `SESSION_CREATE` |

### BR-002: 会话开始
| 规则项 | 说明 |
|--------|------|
| 权限要求 | 只有**管理员**可以开始盘点会话 |
| 前置条件 | 至少有一名盘点员（含管理员兼任）已加入 |
| 状态变更 | `PENDING` → `IN_PROGRESS` |
| 记录日志 | `SESSION_START` |

### BR-003: 会话完成条件
会话自动从 `IN_PROGRESS` 变为 `COMPLETED` 需满足**所有**条件：
1. 所有药品状态为 `COMPLETED` 或 `SKIPPED`
2. 所有盘亏项（`DiscrepancyType.LOSS`）已填写原因
3. 无药品处于 `LOCKED` 状态

**说明**：`SKIPPED` 状态的药品允许存在，不影响会话完成

### BR-004: 会话提交
| 规则项 | 说明 |
|--------|------|
| 权限要求 | 只有**管理员**可以提交已完成的会话 |
| 前置条件 | 会话状态为 `COMPLETED` |
| 状态变更 | `COMPLETED` → `SUBMITTED` |
| 系统操作 | 1. 用实盘数据更新系统库存<br>2. 生成盘盈盘亏报表<br>3. 锁定所有数据，禁止修改 |
| 记录日志 | `SESSION_SUBMIT` |

### BR-005: 会话取消
| 规则项 | 说明 |
|--------|------|
| 权限要求 | 只有**管理员**可以取消会话 |
| 前置条件 | 会话状态为 `PENDING` 或 `IN_PROGRESS` |
| 状态变更 | `PENDING`/`IN_PROGRESS` → `CANCELLED` |
| 系统操作 | 释放所有锁定，已输入数据保留但不生效 |
| 记录日志 | `SESSION_CANCEL` |

### BR-006: 会话回退
| 规则项 | 说明 |
|--------|------|
| 允许回退 | `COMPLETED` → `IN_PROGRESS` |
| 触发条件 | 管理员发现需重盘的药品 |
| 权限要求 | 只有**管理员**可以执行回退 |
| 系统操作 | 将需重盘药品状态重置为 `PENDING` |

## 2.2 药品锁定规则

### BR-101: 锁定触发
| 规则项 | 说明 |
|--------|------|
| 触发时机 | 盘点员**选择**药品时立即锁定 |
| 锁定时长 | **5分钟**（300秒） |
| 锁定范围 | 单个药品（单个 `AuditItem`） |
| 状态变更 | `PENDING`/`SKIPPED`/`COMPLETED` → `LOCKED` |
| 并发控制 | 同一时间只有一个盘点员可以锁定同一药品 |
| 记录日志 | `ITEM_LOCK` |

### BR-102: 锁定续期
| 规则项 | 说明 |
|--------|------|
| 续期触发 | 盘点员有以下操作时自动续期：<br>- 输入实盘数量<br>- 语音输入<br>- 点击界面元素 |
| 续期时长 | 从操作时刻起重新计算 **5分钟** |
| 续期次数 | 无限制 |
| 不触发续期 | 仅查看界面、无交互操作 |

### BR-103: 锁定释放
| 释放条件 | 状态变更 | 数据处理 | 日志操作 |
|---------|---------|---------|---------|
| 确认提交实盘数据 | → `COMPLETED` | 保存实盘数据 | `ITEM_COMPLETE` |
| 点击"跳过" | → `SKIPPED` | 清除草稿 | `ITEM_SKIP` |
| 超时无操作（5分钟） | → `PENDING`/`SKIPPED`/`COMPLETED`（恢复原状态） | **草稿保留**，提示用户 | `ITEM_UNLOCK`（超时） |
| 盘点员主动取消 | → 恢复原状态 | **草稿保留** | `ITEM_UNLOCK`（取消） |
| 管理员强制解锁 | → 恢复原状态 | 草稿保留 | `FORCE_UNLOCK` |
| 盘点员离开会话 | → 恢复原状态 | 草稿保留 | `ITEM_UNLOCK`（离开） |

**恢复原状态说明**：
- 若锁定前是 `PENDING`，释放后恢复为 `PENDING`
- 若锁定前是 `SKIPPED`，释放后恢复为 `SKIPPED`
- 若锁定前是 `COMPLETED`（修改操作），释放后恢复为 `COMPLETED`（原数据）

### BR-104: 强制解锁
| 规则项 | 说明 |
|--------|------|
| 权限要求 | 只有**管理员**可以强制解锁 |
| 操作确认 | 需二次确认 |
| 通知机制 | 被解锁的盘点员收到通知（如在线） |
| 日志记录 | 必须记录操作原因 |
| 记录日志 | `FORCE_UNLOCK` |

## 2.3 实盘输入规则

### BR-201: 多规格输入
| 规则项 | 说明 |
|--------|------|
| 输入方式 | 按规格分别输入包数 |
| 输入类型 | 包数：≥0 的整数；散装：≥0 的数值（保留1位小数） |
| 自动计算 | 系统实时计算并显示总克数、总包数 |
| 草稿保存 | 每次输入变更后自动保存草稿 |

### BR-202: 规格约束
| 规则项 | 说明 |
|--------|------|
| 规格来源 | **仅限**系统账面快照中该药品的规格 |
| 新规格处理 | 如实盘发现系统不存在的规格：<br>1. 该药品暂时跳过<br>2. 先通过入库功能添加新规格<br>3. 重新盘点该药品 |
| 规格为空 | 如果系统账面无包装规格（仅散装），则只能输入散装克数 |

### BR-203: 数据校验
| 校验项 | 规则 | 错误提示 |
|--------|------|---------|
| 包数 | ≥ 0 的整数 | "包数必须为非负整数" |
| 散装克数 | ≥ 0，最多1位小数 | "克数必须为非负数，最多1位小数" |
| 总量非空 | 至少输入一个规格的数量或散装克数 | "请输入实盘数量" |

## 2.4 盈亏处理规则

### BR-301: 差异计算
```
差异克数 = 实盘总克数 - 系统账面总克数
差异包数 = 实盘总包数 - 系统账面总包数

判断规则：
  差异克数 > 0  → 盘盈 (SURPLUS)
  差异克数 < 0  → 盘亏 (LOSS)
  差异克数 = 0  → 一致 (MATCH)
```

### BR-302: 原因填写
| 差异类型 | 是否必填 | 说明 |
|---------|---------|------|
| 一致 (`MATCH`) | 否 | 无差异 |
| 盘盈 (`SURPLUS`) | 否 | 可选填写，记录可能原因 |
| 盘亏 (`LOSS`) | **是** | **必须**填写原因才能提交 |

**常见原因参考**：
- 盘亏：受潮损耗、过期丢弃、发药漏记、计量误差、被盗
- 盘盈：入库漏记、退药未记录

### BR-303: 跳过处理
| 规则项 | 说明 |
|--------|------|
| 计入完成数 | **否** - 跳过的药品不计入 `completedMedicines` |
| 重新盘点 | **允许** - 可随时重新盘点跳过的药品 |
| 会话完成 | 跳过的药品允许存在，不影响会话进入 `COMPLETED` 状态 |
| 会话提交 | 提交时如有跳过项，系统提示管理员确认 |

### BR-304: 修改已完成的盘点
| 规则项 | 说明 |
|--------|------|
| 允许修改时机 | 会话状态为 `IN_PROGRESS` 或 `COMPLETED`（未提交） |
| 权限要求 | **任何人**都可以修改自己完成的盘点<br>**管理员**可以修改任何人的盘点 |
| 修改流程 | 1. 点击已完成的药品<br>2. 获取锁定（状态 → `LOCKED`）<br>3. 修改数据<br>4. 确认提交（状态 → `COMPLETED`） |
| 记录要求 | 每次修改记录 `modifiedCount`、`modifiedBy`、`modifiedAt` |
| 记录日志 | `ITEM_MODIFY` |

## 2.5 多人协作规则

### BR-401: 盘点员角色
| 角色 | 权限 |
|------|------|
| 管理员（兼任盘点员） | 创建会话、分配任务、盘点药品、强制解锁、提交结果、修改任何人的盘点 |
| 普通盘点员 | 盘点分配给自己的药品、修改自己完成的盘点 |

### BR-402: 任务分配模式
| 模式 | 说明 | 适用场景 |
|------|------|---------|
| 自动分配 | 管理员按药品分类（中草药/西药）或区域分配 | 有明确分工的大型盘点 |
| 自由认领 | 盘点员自行选择药品，先到先得 | 小型盘点或临时盘点 |

### BR-403: 分配约束
| 规则项 | 说明 |
|--------|------|
| 药品可见性 | 盘点员只能看到自己分配/认领的药品 + 已完成的药品（只读） |
| 锁定可见性 | 被他人锁定的药品显示锁定者姓名和预计释放时间 |
| 完成可见性 | 所有盘点员可以看到整体进度统计 |

### BR-404: 实时同步
| 规则项 | 说明 |
|--------|------|
| 同步机制 | 通过 WebSocket 实时广播以下事件：<br>- 药品锁定/释放<br>- 药品完成/跳过<br>- 盘点员加入/离开 |
| 断网处理 | 本地缓存操作，联网后自动同步 |
| 冲突处理 | 同步冲突时，以**服务器数据为准**，提示用户刷新 |

## 2.6 权限规则汇总

| 操作 | 管理员 | 普通盘点员 |
|------|:------:|:----------:|
| 创建盘点会话 | ✅ | ❌ |
| 开始/取消会话 | ✅ | ❌ |
| 分配任务 | ✅ | ❌ |
| 提交盘点结果 | ✅ | ❌ |
| 强制解锁 | ✅ | ❌ |
| 查看所有进度 | ✅ | ❌ |
| 盘点分配的药品 | ✅ | ✅ |
| 修改自己的盘点 | ✅ | ✅ |
| 修改他人的盘点 | ✅ | ❌ |
| 查看已完成的药品 | ✅ | ✅ |

---

# 第三部分：业务流程

## 3.1 盘点会话完整生命周期

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        盘点会话生命周期                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [管理员创建会话]                                                        │
│   - 指定会话名称                                                         │
│   - 选择需盘点的药品                                                     │
│   - 系统保存账面快照                                                     │
│        │                                                                │
│        ▼                                                                │
│  ┌─────────────┐                                                        │
│  │   PENDING   │ <──────────────────────────────────┐                   │
│  └──────┬──────┘                                    │                   │
│         │                                           │                   │
│         │ [管理员开始]                               │                   │
│         │ [至少1名盘点员加入]                         │                   │
│         ▼                                           │                   │
│  ┌─────────────┐                                    │                   │
│  │ IN_PROGRESS │ <─────────────────────────────┐    │                   │
│  └──────┬──────┘                              │    │                   │
│         │                                     │    │                   │
│         │                                     │    │                   │
│         ├──── [管理员取消] ──> ┌──────────┐   │    │                   │
│         │                      │ CANCELLED│   │    │                   │
│         │                      └──────────┘   │    │                   │
│         │                                     │    │                   │
│         │    ┌────────────────────────────┐   │    │                   │
│         │    │     盘点员工作区            │   │    │                   │
│         │    │  ┌─────┐ ┌─────┐ ┌─────┐  │   │    │                   │
│         │    │  │  A  │ │  B  │ │  C  │  │   │    │                   │
│         │    │  │当归 │ │黄芪 │ │阿莫西│  │   │    │                   │
│         │    │  │枸杞 │ │西洋参│ │布洛芬│  │   │    │                   │
│         │    │  └─────┘ └─────┘ └─────┘  │   │    │                   │
│         │    └────────────────────────────┘   │    │                   │
│         │              │                      │    │                   │
│         │              │ [有药品需重盘]        │    │                   │
│         │              └──────────────────────┘    │                   │
│         │                                           │                   │
│         │ [全部药品完成/跳过]                         │                   │
│         │ [所有盘亏已填原因]                          │                   │
│         ▼                                           │                   │
│  ┌─────────────┐                                    │                   │
│  │  COMPLETED  │ ── [发现需重盘] ────────────────────┘                   │
│  └──────┬──────┘                                                        │
│         │                                                               │
│         │ [管理员审核确认]                                                │
│         │ [确认跳过项]                                                    │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │  SUBMITTED  │                                                        │
│  └──────┬──────┘                                                        │
│         │                                                               │
│         │ [系统自动执行]                                                  │
│         │ - 更新系统库存                                                  │
│         │ - 生成盘盈盘亏报表                                              │
│         │ - 锁定所有数据                                                  │
│         ▼                                                               │
│     [结束]                                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3.2 单个药品盘点流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        单个药品盘点流程                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────┐                                                            │
│  │ 开始   │                                                            │
│  └───┬────┘                                                            │
│      │                                                                 │
│      ▼                                                                 │
│  ┌────────────────────┐                                                │
│  │ 1. 选择药品        │  方式：点击列表 / 语音选择                       │
│  └─────────┬──────────┘                                                │
│            │                                                           │
│            ▼                                                           │
│  ┌────────────────────┐     ┌────────────────────┐                     │
│  │ 2. 检查锁定状态    │────>│ 被他人锁定？        │                     │
│  └─────────┬──────────┘     │ 是：               │                     │
│            │ 否             │   - 提示锁定者姓名  │                     │
│            │                │   - 显示剩余时间    │                     │
│            │                │   - 返回选择其他    │                     │
│            │                └────────────────────┘                     │
│            │                                                           │
│            ▼                                                           │
│  ┌────────────────────┐                                                │
│  │ 3. 锁定药品        │  - 状态: → LOCKED                               │
│  │                    │  - 记录: 锁定者、锁定时间、过期时间              │
│  │                    │  - 广播: 锁定事件                               │
│  └─────────┬──────────┘                                                │
│            │                                                           │
│            ▼                                                           │
│  ┌────────────────────┐                                                │
│  │ 4. 显示药品信息    │  - 药品名称、类型                                │
│  │                    │  - 系统账面库存（多规格）                        │
│  │                    │  - 恢复草稿（如有）                              │
│  └─────────┬──────────┘                                                │
│            │                                                           │
│            ▼                                                           │
│  ┌────────────────────┐                                                │
│  │ 5. 输入实盘数量    │  方式：手动输入 / 语音输入                        │
│  │                    │  内容：各规格包数 + 散装克数                     │
│  │                    │  自动：计算总克数、总包数                        │
│  │                    │  自动：保存草稿                                  │
│  │                    │  自动：续期锁定                                  │
│  └─────────┬──────────┘                                                │
│            │                                                           │
│            ▼                                                           │
│  ┌────────────────────┐                                                │
│  │ 6. 计算差异        │  - 自动计算克数差异、包数差异                     │
│  │                    │  - 判断盘盈/盘亏/一致                           │
│  │                    │  - 显示差异结果                                  │
│  └─────────┬──────────┘                                                │
│            │                                                           │
│      ┌─────┴─────┐                                                     │
│      │           │                                                     │
│      ▼           ▼                                                     │
│  ┌────────┐  ┌────────────────┐                                        │
│  │ 跳过   │  │ 7. 填写原因     │  盘亏：必须填写                        │
│  │        │  │    （如有差异） │  盘盈：可选填写                        │
│  └────┬───┘  └───────┬────────┘                                        │
│       │              │                                                  │
│       ▼              ▼                                                  │
│  ┌────────────────────────────┐                                         │
│  │ 8. 确认提交                │  按钮：[确认并下一个]                    │
│  └─────────────┬──────────────┘                                         │
│                │                                                        │
│                ▼                                                        │
│  ┌────────────────────────────┐                                         │
│  │ 9. 保存结果                │  - 验证数据完整性                        │
│  │                            │  - 保存实盘数据                          │
│  │                            │  - 释放锁定                              │
│  │                            │  - 状态: → COMPLETED 或 SKIPPED          │
│  │                            │  - 广播完成事件                          │
│  │                            │  - 清除草稿                              │
│  └─────────────┬──────────────┘                                         │
│                │                                                        │
│                ▼                                                        │
│  ┌────────────────────────────┐                                         │
│  │ 10. 移动到下一项           │  - 自动选择下一个待盘药品                 │
│  │     或完成                 │  - 或提示全部完成                        │
│  └─────────────┬──────────────┘                                         │
│                │                                                        │
│                ▼                                                        │
│           ┌────────┐                                                    │
│           │ 结束   │                                                    │
│           └────────┘                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3.3 多人协作时序图

```
盘点员A          盘点员B           服务器            数据库           WebSocket
   │               │                │                 │                │
   │ 选择当归       │                │                 │                │
   │───────────────────────────────>│                 │                │
   │               │                │ 检查锁定状态     │                │
   │               │                │────────────────>│                │
   │               │                │<────────────────│                │
   │               │                │ 锁定当归        │                │
   │               │                │────────────────>│                │
   │ 锁定成功       │                │                 │                │
   │<───────────────────────────────│                 │                │
   │               │                │                 │                │
   │               │                │ 广播锁定事件     │                │
   │               │<───────────────────────────────────────────────────│
   │               │                │                 │                │
   │               │ 选择当归       │                 │                │
   │               │───────────────>│                 │                │
   │               │                │ 检查锁定状态     │                │
   │               │                │────────────────>│                │
   │               │                │<────────────────│                │
   │               │ 已被锁定(盘点员A)│                │                │
   │               │<───────────────│                 │                │
   │               │                │                 │                │
   │ 输入实盘数据   │                │                 │                │
   │───────────────────────────────>│                 │                │
   │               │                │ 保存草稿        │                │
   │               │                │────────────────>│                │
   │               │                │                 │                │
   │ 确认提交       │                │                 │                │
   │───────────────────────────────>│                 │                │
   │               │                │ 保存实盘数据     │                │
   │               │                │────────────────>│                │
   │               │                │ 释放锁定        │                │
   │               │                │────────────────>│                │
   │ 提交成功       │                │                 │                │
   │<───────────────────────────────│                 │                │
   │               │                │                 │                │
   │               │                │ 广播完成事件     │                │
   │<─────────────────────────────────────────────────────────────────│
   │               │<─────────────────────────────────────────────────│
   │               │                │                 │                │
```

---

# 第四部分：UI 交互设计

## 4.1 盘点模式布局 (Tablet Landscape)

| **A. 待盘清单 (30%)** | **B. 交互核心区 (40%)** | **C. 盈亏核算区 (30%)** |
| --- | --- | --- |
| **搜索/筛选**：[全部][已盘][未盘][已跳过][他人锁定] | **当前盘点对象**：<br><br>**当归 (中草药)** | **系统账面**：<br><br>500g/包 × 5包 = 2500g<br>250g/包 × 3包 = 750g<br>散装 150g<br>**总计：3400g** |
| 1. 当归 `[当前 ← 我]` | **实盘数量输入**：<br><br>500g/包: `[ 2 ]` 包 = 1000g<br>250g/包: `[ 1 ]` 包 = 250g<br>散装: `[ 0 ]` g<br>**总计: 1250g** | **实盘数量**：<br><br>1250g (3包) |
| 2. 黄芪 `[🔒 王药剂师 3分后释放]` | **盈亏原因**：<br><br>`[ 受潮损耗... ]` | **差异结果**：<br><br><span style="color:red">盘亏：-2150g</span> |
| 3. 阿莫西林 `[待盘]` | | |
| 4. 枸杞 `[已盘 ✓]` | | |
| 5. 西洋参 `[已跳过]` | | |
| **底部：语音波形条** | **[ 跳过 ] [ 确认并下一个 ]** | |

## 4.2 锁定状态指示器

| 状态 | 显示示例 | 颜色 | 可点击 |
|------|---------|------|--------|
| 待盘 | `[待盘]` | 灰色 | ✅ |
| 当前（我正在盘点） | `[当前 ← 我]` | 紫色 | ✅（继续） |
| 他人锁定 | `[🔒 王药剂师 3分后释放]` | 橙色 | ❌（提示） |
| 已盘 | `[已盘 ✓ 李药剂师]` | 绿色 | ✅（查看） |
| 已跳过 | `[已跳过]` | 黄色 | ✅（重盘） |

## 4.3 语音交互示例

### 场景1：正常盘点流程
```
用户: "开始盘点当归"
系统: "当归已锁定。系统库存：500克每包5包，250克每包3包，散装150克，总计3400克。请报实盘数量。"

用户: "2包500克，1包250克"
系统: "收到。实盘：2包500克，1包250克，总计1250克。盘亏2150克。请说出盘亏原因。"

用户: "原因：受潮损耗"
系统: "已记录盘亏原因：受潮损耗。当归盘点完成。下一项：枸杞。"
```

### 场景2：药品被锁定
```
用户: "开始盘点当归"
系统: "当归正在被王药剂师盘点，预计3分钟后释放。可盘点药品：黄芪、阿莫西林、枸杞。"

用户: "盘点黄芪"
系统: "黄芪已锁定。系统库存：..."
```

### 场景3：跳过药品
```
用户: "跳过"
系统: "已跳过当归。下一项：枸杞。"
```

### 场景4：修改已完成盘点
```
用户: "修改当归"
系统: "当归已锁定。当前实盘：2包500克，1包250克。请输入新的实盘数量。"

用户: "3包500克"
系统: "收到。新实盘：3包500克，总计1500克。盘亏1900克。请确认。"

用户: "确认"
系统: "当归盘点已修改。"
```

---

# 第五部分：异常处理

## 5.1 药品被锁定

| 场景 | 处理方式 |
|------|---------|
| 语音选择已锁定药品 | TTS播报："XX正在被[姓名]盘点，预计[X]分钟后释放。可盘点药品：[列表]" |
| 点击已锁定药品 | 弹窗显示锁定者姓名、剩余时间，提供"等待"或"选择其他药品"按钮 |
| 等待锁定释放 | 进入等待队列，锁定释放后自动通知 |

## 5.2 网络异常

| 场景 | 处理方式 |
|------|---------|
| 断网检测 | 界面顶部显示"离线模式"标识 |
| 断网时锁定 | 本地记录锁定请求，提示"正在重连..."，联网后自动获取锁 |
| 断网时输入 | 本地保存草稿，联网后自动同步 |
| 联网恢复 | 自动同步数据，显示"已同步"提示 |
| 同步冲突 | 弹窗提示"数据已更新"，显示服务器最新数据，用户选择保留或覆盖 |

## 5.3 锁定超时

| 场景 | 处理方式 |
|------|---------|
| 超时前30秒 | 界面显示倒计时，TTS播报"操作即将超时，请继续输入或确认" |
| 超时释放 | 弹窗提示"操作超时，药品锁定已释放"，草稿已保存，可选择"恢复"或"重新选择" |
| 草稿恢复 | 选择恢复后，自动锁定药品并恢复之前的输入数据 |

## 5.4 盘点员中途离开

| 场景 | 处理方式 |
|------|---------|
| 主动退出 | 弹窗确认"确定退出？已输入的数据将保存为草稿"，确认后释放锁定 |
| 关闭应用 | 下次打开时提示"上次有未完成的盘点，是否继续？" |
| 长时间无操作 | 2分钟后状态变为 `IDLE`，5分钟后锁定自动释放 |

---

# 第六部分：TypeScript 接口定义

```typescript
// ==================== 枚举定义 ====================

/** 会话状态 */
enum AuditSessionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SUBMITTED = 'SUBMITTED',
  CANCELLED = 'CANCELLED'
}

/** 盘点员状态 */
enum AuditorStatus {
  ACTIVE = 'ACTIVE',
  IDLE = 'IDLE',
  LEFT = 'LEFT'
}

/** 盘点明细项状态 */
enum AuditItemStatus {
  PENDING = 'PENDING',
  LOCKED = 'LOCKED',
  SKIPPED = 'SKIPPED',
  COMPLETED = 'COMPLETED'
}

/** 差异类型 */
enum DiscrepancyType {
  MATCH = 'MATCH',
  SURPLUS = 'SURPLUS',
  LOSS = 'LOSS'
}

/** 药品类型 */
enum MedicineType {
  CHINESE_HERB = 'CHINESE_HERB',
  WESTERN = 'WESTERN'
}

/** 盘点员角色 */
enum AuditorRole {
  ADMIN = 'ADMIN',
  AUDITOR = 'AUDITOR'
}

/** 操作类型 */
enum AuditAction {
  SESSION_CREATE = 'SESSION_CREATE',
  SESSION_START = 'SESSION_START',
  SESSION_SUBMIT = 'SESSION_SUBMIT',
  SESSION_CANCEL = 'SESSION_CANCEL',
  AUDITOR_JOIN = 'AUDITOR_JOIN',
  AUDITOR_LEAVE = 'AUDITOR_LEAVE',
  ITEM_LOCK = 'ITEM_LOCK',
  ITEM_UNLOCK = 'ITEM_UNLOCK',
  ITEM_COMPLETE = 'ITEM_COMPLETE',
  ITEM_SKIP = 'ITEM_SKIP',
  ITEM_MODIFY = 'ITEM_MODIFY',
  FORCE_UNLOCK = 'FORCE_UNLOCK'
}

// ==================== 实体定义 ====================

/** 包装库存 */
interface PackageStock {
  specGrams: number;
  quantity: number;
}

/** 系统账面库存 */
interface SystemStock {
  medicineId: string;
  packages: PackageStock[];
  looseGrams: number;
  snapshotAt: Date;
  readonly totalGrams: number;
  readonly totalPackages: number;
}

/** 实盘库存 */
interface ActualStock {
  medicineId: string;
  packages: PackageStock[];
  looseGrams: number;
  readonly totalGrams: number;
  readonly totalPackages: number;
}

/** 差异信息 */
interface Discrepancy {
  type: DiscrepancyType;
  gramsDiff: number;
  packagesDiff: number;
  readonly requiresReason: boolean;
}

/** 盘点明细项 */
interface AuditItem {
  id: string;
  auditSessionId: string;
  medicineId: string;
  medicineName: string;
  medicineType: MedicineType;
  systemStock: SystemStock;
  status: AuditItemStatus;
  lockedBy?: string;
  lockedByName?: string;
  lockedAt?: Date;
  lockExpiresAt?: Date;
  actualStock?: ActualStock;
  auditedBy?: string;
  auditedByName?: string;
  auditedAt?: Date;
  discrepancy?: Discrepancy;
  reason?: string;
  notes?: string;
  draftStock?: ActualStock;
  draftSavedAt?: Date;
  modifiedCount: number;
  modifiedBy?: string;
  modifiedAt?: Date;
}

/** 盘点员会话 */
interface AuditorSession {
  id: string;
  auditSessionId: string;
  auditorId: string;
  auditorName: string;
  auditorRole: AuditorRole;
  status: AuditorStatus;
  assignedMedicines: string[];
  currentMedicineId?: string;
  completedCount: number;
  skippedCount: number;
  joinedAt: Date;
  lastActiveAt: Date;
  leftAt?: Date;
}

/** 盘点会话 */
interface AuditSession {
  id: string;
  name: string;
  status: AuditSessionStatus;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  submittedAt?: Date;
  submittedBy?: string;
  totalMedicines: number;
  completedMedicines: number;
  skippedMedicines: number;
  auditors: AuditorSession[];
  items: AuditItem[];
}

/** 操作日志 */
interface AuditLog {
  id: string;
  auditSessionId: string;
  auditItemId?: string;
  action: AuditAction;
  operatorId: string;
  operatorName: string;
  operatedAt: Date;
  details: Record<string, unknown>;
  ipAddress?: string;
}

// ==================== 业务常量 ====================

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5分钟
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;   // 2分钟
const LOOSE_GRAMS_DECIMALS = 1;           // 散装克数小数位

// ==================== 业务函数 ====================

/** 计算总克数 */
function calculateTotalGrams(packages: PackageStock[], looseGrams: number): number {
  const packageGrams = packages.reduce((sum, p) => sum + p.specGrams * p.quantity, 0);
  return packageGrams + looseGrams;
}

/** 计算总包数 */
function calculateTotalPackages(packages: PackageStock[]): number {
  return packages.reduce((sum, p) => sum + p.quantity, 0);
}

/** 计算差异 */
function calculateDiscrepancy(system: SystemStock, actual: ActualStock): Discrepancy {
  const gramsDiff = actual.totalGrams - system.totalGrams;
  const packagesDiff = actual.totalPackages - system.totalPackages;

  let type: DiscrepancyType;
  if (gramsDiff > 0) type = DiscrepancyType.SURPLUS;
  else if (gramsDiff < 0) type = DiscrepancyType.LOSS;
  else type = DiscrepancyType.MATCH;

  return {
    type,
    gramsDiff,
    packagesDiff,
    requiresReason: type === DiscrepancyType.LOSS
  };
}

/** 检查是否锁定中 */
function isLocked(item: AuditItem): boolean {
  if (item.status !== AuditItemStatus.LOCKED) return false;
  if (!item.lockExpiresAt) return false;
  return new Date() < item.lockExpiresAt;
}

/** 检查是否可以盘点 */
function canAudit(item: AuditItem, auditorId: string): boolean {
  // 已完成且会话未提交，可修改
  if (item.status === AuditItemStatus.COMPLETED) return true;

  // 已跳过，可重新盘点
  if (item.status === AuditItemStatus.SKIPPED) return true;

  // 待盘，可盘点
  if (item.status === AuditItemStatus.PENDING) return true;

  // 锁定中，检查是否是自己锁定的或已过期
  if (item.status === AuditItemStatus.LOCKED) {
    if (item.lockedBy === auditorId) return true; // 自己锁定的
    return !isLocked(item); // 别人锁定的，检查是否过期
  }

  return false;
}

/** 锁定药品 */
async function lockMedicine(
  item: AuditItem,
  auditorId: string,
  auditorName: string
): Promise<AuditItem> {
  const now = new Date();
  const previousStatus = item.status;

  return {
    ...item,
    status: AuditItemStatus.LOCKED,
    lockedBy: auditorId,
    lockedByName: auditorName,
    lockedAt: now,
    lockExpiresAt: new Date(now.getTime() + LOCK_DURATION_MS),
    // 保存之前的状态用于恢复
    _previousStatus: previousStatus
  } as AuditItem;
}

/** 续期锁定 */
function renewLock(item: AuditItem): AuditItem {
  if (item.status !== AuditItemStatus.LOCKED) return item;

  const now = new Date();
  return {
    ...item,
    lockExpiresAt: new Date(now.getTime() + LOCK_DURATION_MS)
  };
}

/** 释放锁定 */
function releaseLock(item: AuditItem): AuditItem {
  // 恢复到锁定前的状态
  let newStatus: AuditItemStatus;
  switch (item.status) {
    case AuditItemStatus.LOCKED:
      // 根据是否有实盘数据判断之前的状态
      if (item.actualStock) {
        newStatus = AuditItemStatus.COMPLETED;
      } else {
        newStatus = AuditItemStatus.PENDING;
      }
      break;
    default:
      newStatus = item.status;
  }

  return {
    ...item,
    status: newStatus,
    lockedBy: undefined,
    lockedByName: undefined,
    lockedAt: undefined,
    lockExpiresAt: undefined
  };
}

/** 提交盘点结果 */
async function submitAuditResult(
  item: AuditItem,
  actualStock: ActualStock,
  reason: string | undefined,
  auditorId: string,
  auditorName: string
): Promise<AuditItem> {
  const discrepancy = calculateDiscrepancy(item.systemStock, actualStock);

  // 验证：盘亏必须填写原因
  if (discrepancy.type === DiscrepancyType.LOSS && !reason?.trim()) {
    throw new Error('盘亏必须填写原因');
  }

  const now = new Date();
  const isModify = item.status === AuditItemStatus.COMPLETED || item.actualStock !== undefined;

  return {
    ...item,
    status: AuditItemStatus.COMPLETED,
    actualStock,
    discrepancy,
    reason: reason?.trim() || undefined,
    auditedBy: auditorId,
    auditedByName: auditorName,
    auditedAt: now,
    lockedBy: undefined,
    lockedByName: undefined,
    lockedAt: undefined,
    lockExpiresAt: undefined,
    draftStock: undefined,
    draftSavedAt: undefined,
    modifiedCount: isModify ? item.modifiedCount + 1 : item.modifiedCount,
    modifiedBy: isModify ? auditorId : item.modifiedBy,
    modifiedAt: isModify ? now : item.modifiedAt
  };
}

/** 跳过药品 */
function skipItem(item: AuditItem, auditorId: string, auditorName: string): AuditItem {
  return {
    ...item,
    status: AuditItemStatus.SKIPPED,
    lockedBy: undefined,
    lockedByName: undefined,
    lockedAt: undefined,
    lockExpiresAt: undefined,
    draftStock: undefined,
    draftSavedAt: undefined
  };
}

/** 保存草稿 */
function saveDraft(item: AuditItem, draftStock: ActualStock): AuditItem {
  return {
    ...item,
    draftStock,
    draftSavedAt: new Date()
  };
}

/** 检查会话是否可以完成 */
function canCompleteSession(session: AuditSession): { canComplete: boolean; reason?: string } {
  // 检查是否有锁定中的药品
  const hasLocked = session.items.some(item => item.status === AuditItemStatus.LOCKED);
  if (hasLocked) {
    return { canComplete: false, reason: '有药品正在盘点中' };
  }

  // 检查是否所有药品都已完成或跳过
  const allProcessed = session.items.every(
    item => item.status === AuditItemStatus.COMPLETED || item.status === AuditItemStatus.SKIPPED
  );
  if (!allProcessed) {
    return { canComplete: false, reason: '有药品未完成盘点' };
  }

  // 检查所有盘亏是否已填写原因
  const lossWithoutReason = session.items.filter(
    item => item.discrepancy?.type === DiscrepancyType.LOSS && !item.reason?.trim()
  );
  if (lossWithoutReason.length > 0) {
    return { canComplete: false, reason: `有${lossWithoutReason.length}项盘亏未填写原因` };
  }

  return { canComplete: true };
}

/** 计算会话进度 */
function calculateSessionProgress(session: AuditSession): {
  completed: number;
  skipped: number;
  pending: number;
  locked: number;
  percentage: number;
} {
  const completed = session.items.filter(i => i.status === AuditItemStatus.COMPLETED).length;
  const skipped = session.items.filter(i => i.status === AuditItemStatus.SKIPPED).length;
  const pending = session.items.filter(i => i.status === AuditItemStatus.PENDING).length;
  const locked = session.items.filter(i => i.status === AuditItemStatus.LOCKED).length;
  const percentage = Math.round((completed / session.totalMedicines) * 100);

  return { completed, skipped, pending, locked, percentage };
}
```

---

# 第七部分：总结

## 特性清单

| 特性 | 说明 |
|------|------|
| **多人协作** | 支持多人同时盘点，通过锁定机制避免冲突 |
| **锁定机制** | 5分钟自动释放，操作自动续期，管理员可强制解锁 |
| **多规格输入** | 支持不同规格包装 + 散装的组合输入，自动计算总量 |
| **语音驱动** | 解放双手，全程语音交互，TTS播报反馈 |
| **实时同步** | WebSocket推送状态变更，断网本地缓存 |
| **权限管理** | 管理员可创建会话、分配任务、强制解锁、提交结果 |
| **盈亏处理** | 盘亏强制填写原因，盘盈可选填写 |
| **审计日志** | 记录所有关键操作，支持追溯 |
| **草稿保存** | 自动保存输入数据，超时/退出后可恢复 |
| **修改支持** | 会话提交前可修改已完成的盘点结果 |

## 状态机总结

### 会话状态
```
PENDING → IN_PROGRESS → COMPLETED → SUBMITTED
                ↓
           CANCELLED
```

### 明细项状态
```
PENDING ↔ LOCKED → COMPLETED
            ↓
        SKIPPED ↔ LOCKED
```

## 规则编号索引

| 编号 | 规则名称 |
|------|---------|
| BR-001 | 会话创建 |
| BR-002 | 会话开始 |
| BR-003 | 会话完成条件 |
| BR-004 | 会话提交 |
| BR-005 | 会话取消 |
| BR-006 | 会话回退 |
| BR-101 | 锁定触发 |
| BR-102 | 锁定续期 |
| BR-103 | 锁定释放 |
| BR-104 | 强制解锁 |
| BR-201 | 多规格输入 |
| BR-202 | 规格约束 |
| BR-203 | 数据校验 |
| BR-301 | 差异计算 |
| BR-302 | 原因填写 |
| BR-303 | 跳过处理 |
| BR-304 | 修改已完成的盘点 |
| BR-401 | 盘点员角色 |
| BR-402 | 任务分配模式 |
| BR-403 | 分配约束 |
| BR-404 | 实时同步 |
