/**
 * InventoryScreen Component
 *
 * Main inventory management screen with stock in/out/unpack operations.
 * Uses a master-detail layout with medicine list and operation form.
 */

import React, {useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Button, useTheme, IconButton, TextInput, SegmentedButtons} from 'react-native-paper';
import {MasterDetailLayout} from '@/components/layout/MasterDetailLayout';
import {ModeSegmentedControl} from '@/components/layout/ModeSegmentedControl';
import {MedicineList} from '@/components/inventory/MedicineList';
import {InboundForm} from '@/components/forms/InboundForm';
import {OutboundForm} from '@/components/forms/OutboundForm';
import {AuditForm} from '@/components/forms/AuditForm';
import {UnpackModal} from '@/components/forms/UnpackModal';
import {VoiceBar} from '@/components/voice/VoiceBar';
import {InventoryMode, MedicineCategory, UnitType} from '@/types';
import {useAppSelector, useAppDispatch} from '@/store/hooks';
import {selectCurrentMode, createMedicine} from '@/store/slices/inventorySlice';

export const InventoryScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const currentMode = useAppSelector(selectCurrentMode);

  const [showUnpackModal, setShowUnpackModal] = useState(false);
  const [showMedicineForm, setShowMedicineForm] = useState(false);
  const [newMedicineName, setNewMedicineName] = useState('');
  const [newMedicineType, setNewMedicineType] = useState('chinese');

  // Render the appropriate form based on current mode
  const renderForm = () => {
    switch (currentMode) {
      case InventoryMode.INBOUND:
        return <InboundForm />;
      case InventoryMode.OUTBOUND:
        return <OutboundForm />;
      case InventoryMode.UNPACK:
        return (
          <View style={styles.unpackContainer}>
            <View style={styles.unpackContent}>
              <View style={styles.unpackIconContainer}>
                <Text style={styles.unpackIconText}>📦</Text>
              </View>
              <View style={styles.unpackTextContainer}>
                <Text variant="titleMedium" style={styles.unpackTitle}>
                  拆包模式
                </Text>
                <Text variant="bodyMedium" style={styles.unpackDescription}>
                  将包装药品转换为散装单位
                </Text>
              </View>
              <Button
                mode="contained"
                onPress={() => setShowUnpackModal(true)}
                style={styles.unpackButton}>
                打开拆包
              </Button>
            </View>
          </View>
        );
      case InventoryMode.AUDIT:
        return <AuditForm />;
      default:
        return <InboundForm />;
    }
  };

  // Handle save new medicine
  const handleSaveMedicine = async () => {
    if (!newMedicineName.trim()) {
      return;
    }

    // Determine category based on type
    const category = newMedicineType === 'chinese'
      ? MedicineCategory.CHINESE_HERB
      : MedicineCategory.WESTERN_MEDICINE;

    // Dispatch createMedicine action
    await dispatch(createMedicine({
      name: newMedicineName.trim(),
      category,
      baseUnit: newMedicineType === 'chinese' ? 'g' : 'ml',
      packageUnit: '包',
      packageSize: newMedicineType === 'chinese' ? 500 : 100,
      minStock: 1000,
    }));

    // Close the form
    setShowMedicineForm(false);
    setNewMedicineName('');
    setNewMedicineType('chinese');
  };

  return (
    <View style={styles.container}>
      {/* Mode Selector with Add Button */}
      <View style={styles.headerRow}>
        <View style={styles.modeSelectorContainer}>
          <ModeSegmentedControl />
        </View>
        <Button
          mode="contained"
          onPress={() => {
            console.log('Add button pressed, showMedicineForm:', showMedicineForm);
            setShowMedicineForm(true);
            console.log('After setShowMedicineForm(true)');
          }}
          style={styles.addButton}
          buttonColor={theme.colors.primary}
          icon="plus"
          contentStyle={styles.addButtonContent}>
          添加
        </Button>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <MasterDetailLayout
          master={<MedicineList showLowStockOnly={false} />}
          detail={renderForm()}
        />
      </View>

      {/* Voice Bar (Always visible) */}
      <VoiceBar />

      {/* Unpack Modal */}
      <UnpackModal
        visible={showUnpackModal}
        onDismiss={() => setShowUnpackModal(false)}
      />

      {/* Medicine Form Modal */}
      {showMedicineForm && (
        <View style={styles.fullScreenModal}>
          <View style={styles.fullScreenModalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text variant="headlineMedium">添加新药品</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => {
                  console.log('Close button pressed');
                  setShowMedicineForm(false);
                }}
              />
            </View>

            {/* Form Content */}
            <View style={styles.formContent}>
              <Text style={styles.label}>药品名称</Text>
              <TextInput
                value={newMedicineName}
                onChangeText={setNewMedicineName}
                label="请输入药品名称"
                mode="outlined"
                style={styles.input}
                autoFocus
                selectTextOnFocus
                keyboardType="default"
                autoCapitalize="sentences"
                autoCorrect={true}
              />

              <Text style={styles.label}>药品类型</Text>
              <SegmentedButtons
                value={newMedicineType}
                onValueChange={setNewMedicineType}
                buttons={[
                  {label: '中草药', value: 'chinese'},
                  {label: '西药', value: 'western'},
                ]}
                style={styles.segmented}
              />

              <Button
                mode="contained"
                onPress={handleSaveMedicine}
                disabled={!newMedicineName.trim()}
                style={styles.saveButton}>
                保存药品
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modeSelectorContainer: {
    flex: 1,
  },
  addButton: {
    marginLeft: 8,
  },
  addButtonContent: {
    paddingHorizontal: 12,
  },
  content: {
    flex: 1,
  },
  unpackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  unpackContent: {
    alignItems: 'center',
    gap: 24,
  },
  unpackIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  unpackIconText: {
    fontSize: 48,
  },
  unpackTextContainer: {
    alignItems: 'center',
  },
  unpackTitle: {
    fontWeight: '600',
  },
  unpackDescription: {
    color: '#666',
    textAlign: 'center',
  },
  unpackButton: {
    minWidth: 150,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    margin: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  fullScreenModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenModalContent: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  formContent: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    marginBottom: 20,
  },
  segmented: {
    marginBottom: 24,
  },
  saveButton: {
    marginTop: 8,
  },
});
