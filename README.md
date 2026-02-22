# React Native Medical Inventory Management System

A voice-first React Native tablet application for medical inventory management, targeting Android tablets in landscape orientation.

## Features

- **Stock In/Out (出入库)** - Add/remove inventory with voice support
- **Bulk Breaking/Unpacking (拆包)** - Convert packaged medicine to loose units
- **Inventory Audit (盘点)** - Stocktaking with voice-driven workflow
- **Prescription Outbound (按照药方出库)** - Dispense based on prescriptions

## Technology Stack

| Category | Technology |
|----------|-----------|
| Framework | React Native 0.73+ |
| Language | TypeScript (strict mode) |
| State Management | Redux Toolkit |
| Database | WatermelonDB (offline-first) |
| UI Components | React Native Paper + FlashList |
| Voice | react-native-voice + react-native-tts |
| Math | big.js (precise calculations) |

## Installation

```bash
# Install dependencies
npm install

# For iOS (if needed)
cd ios && pod install

# Run on Android
npm run android
```

## Project Structure

```
src/
├── components/      # Reusable UI components
│   ├── layout/     # Layout components
│   ├── inventory/  # Inventory-specific components
│   ├── voice/      # Voice interaction components
│   └── forms/      # Form components
├── database/       # WatermelonDB schema and models
├── hooks/          # Custom React hooks
├── navigation/     # Navigation configuration
├── screens/        # Screen components
├── services/       # Voice and TTS services
├── store/          # Redux store and slices
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Voice Commands

The application supports Chinese voice commands:

- **入库**: "入库当归5包" or "当归入库5包"
- **出库**: "出库黄芪500克" or "黄芪出库3两"
- **拆包**: "拆包甘草2包" or "甘草拆包1包"
- **盘点**: "盘点当归实盘500克" or "当归盘点500克"
- **处方**: "按补中益气汤抓7付" or "补中益气汤抓7付"

## Android Build

```bash
# Debug build
cd android && ./gradlew assembleDebug

# Release build
cd android && ./gradlew assembleRelease
```

## Configuration

The app is configured for:
- Landscape orientation only
- Android 7.0+ (API 24+)
- Target Android 13 (API 33)
- Chinese and English languages

## Database Schema

- `medicines` - Drug inventory with unit conversion data
- `stock_transactions` - Transaction history (INBOUND/OUTBOUND/UNPACK/AUDIT)
- `prescriptions` - Prescription templates
- `prescription_items` - Prescription medicine list
- `audit_records` - Stocktaking session data
- `audit_sessions` - Audit session management

## License

MIT
