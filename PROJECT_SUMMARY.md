# React Native 医疗库存管理系统

## 项目完成状态

### 核心功能
- ✅ **库存入库 (Stock In)** - 支持语音命令和手动输入
- ✅ **库存出库 (Stock Out)** - 带库存检查
- ✅ **拆包操作 (Unpack)** - 包装转散装，原子事务
- ✅ **库存盘点 (Audit)** - 三栏布局，差异追踪
- ✅ **处方抓药 (Prescription)** - 按方剂配药，库存检查

### 技术实现
- ✅ React Native 0.73 + TypeScript
- ✅ Redux Toolkit 状态管理
- ✅ WatermelonDB 离线数据库
- ✅ React Native Paper UI组件
- ✅ FlashList 高性能列表
- ✅ big.js 精确计算
- ✅ react-native-voice 语音识别
- ✅ react-native-tts 语音合成

### 文件结构
```
tablet/
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── index.js
├── app.json
├── src/
│   ├── App.tsx                 # 应用入口
│   ├── types/index.ts          # 类型定义
│   ├── database/               # 数据库
│   │   ├── schema.ts           # WatermelonDB模式
│   │   ├── models/             # 数据模型
│   │   └── index.ts
│   ├── utils/                  # 工具函数
│   │   ├── conversion/         # 单位转换
│   │   ├── voice/              # 语音解析
│   │   └── helpers.ts
│   ├── store/                  # Redux状态
│   │   ├── index.ts
│   │   ├── hooks.ts
│   │   └── slices/
│   ├── components/             # UI组件
│   │   ├── layout/
│   │   ├── inventory/
│   │   ├── voice/
│   │   └── forms/
│   ├── screens/                # 屏幕
│   ├── services/               # 服务
│   ├── hooks/                  # Hooks
│   └── navigation/             # 导航
└── android/                    # Android配置
    ├── app/
    │   ├── build.gradle
    │   └── src/main/
    │       ├── AndroidManifest.xml
    │       ├── java/.../       # Java代码
    │       └── res/            # 资源
    └── gradle files
```

## 语音命令支持

| 命令 | 示例 | 说明 |
|------|------|------|
| 入库 | `入库当归5包` | 增加库存 |
| 出库 | `出库黄芪500克` | 减少库存 |
| 拆包 | `拆包甘草2包` | 包装转散装 |
| 盘点 | `盘点当归实盘500克` | 记录实盘 |
| 处方 | `按补中益气汤抓7付` | 按方配药 |

## 单位支持

### 重量单位
- 公制: g, kg, mg
- 中药: 斤(500g), 两(50g), 钱(5g), 分(0.5g)
- 包装: 包, 盒, 瓶

### 体积单位
- ml, L

## 运行项目

```bash
# 1. 安装依赖
cd /e/js_projects/tablet
npm install

# 2. 运行 Metro
npm start

# 3. 运行 Android
npm run android

# 或者编译 APK
cd android
./gradlew assembleDebug
```

## 数据库模式

### 表结构
- **medicines** - 药品主数据
- **stock_transactions** - 交易历史
- **prescriptions** - 处方模板
- **prescription_items** - 处方成分
- **audit_records** - 盘点记录
- **audit_sessions** - 盘点会话

## 注意事项

1. **Android only** - 当前仅配置Android，平板横屏
2. **权限** - 需要麦克风权限（语音功能）
3. **数据库** - 使用WatermelonDB SQLite本地存储
4. **精度** - 使用big.js确保计算精度

## 后续扩展

- [ ] iOS支持
- [ ] 条码扫描
- [ ] OCR处方识别
- [ ] 数据同步到服务器
- [ ] 多仓库支持
- [ ] 用户权限管理
