/**
 * InboundForm Component
 *
 * Form for recording stock incoming (入库) operations.
 * Supports both packaged and loose stock entry.
 */

import React, {useState} from 'react';
import {View, StyleSheet, KeyboardAvoidingView, Platform} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Divider,
  SegmentedButtons,
} from 'react-native-paper';
import {ScrollView} from 'react-native-gesture-handler';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {executeTransaction, selectSelectedMedicine, selectInventoryLoading} from '@/store/slices/inventorySlice';
import {TransactionType, UnitType} from '@/types';
import {UnitSelector} from '@/components/inventory/UnitSelector';
import {showToast, showError} from '@/store/slices/uiSlice';

export const InboundForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const selectedMedicine = useAppSelector(selectSelectedMedicine);
  const loading = useAppSelector(selectInventoryLoading);

  const [quantity, setQuantity] = useState('0');
  const [stockType, setStockType] = useState<'packaged' | 'loose'>('loose');
  const [unit, setUnit] = useState<UnitType>('g');
  const [packageSize, setPackageSize] = useState<string>(''); // Package size in grams
  const [notes, setNotes] = useState('');

  // Update unit based on stock type
  React.useEffect(() => {
    if (selectedMedicine) {
      if (stockType === 'packaged') {
        setUnit(selectedMedicine.packageUnit as UnitType);
        // Initialize packageSize with medicine default if empty
        if (!packageSize) {
          setPackageSize(String(selectedMedicine.packageSize));
        }
      } else {
        setUnit(selectedMedicine.baseUnit as UnitType);
      }
    }
  }, [stockType, selectedMedicine, packageSize]);

  // Validate form
  const isValid = selectedMedicine && parseFloat(quantity) > 0;

  // Handle submit
  const handleSubmit = async () => {
    if (!isValid || !selectedMedicine) return;

    try {
      const txnParams: any = {
        medicineId: selectedMedicine.id,
        type: TransactionType.INBOUND,
        quantity: parseFloat(quantity),
        unit,
        notes: `${stockType === 'packaged' ? '包装' : '散装'}入库 - ${notes}`,
      };

      // Add packageSize for packaged units
      if (stockType === 'packaged' && packageSize) {
        txnParams.packageSize = parseFloat(packageSize);
      }

      await dispatch(executeTransaction(txnParams)).unwrap();

      const totalDisplay = stockType === 'packaged'
        ? `${quantity}包 × ${packageSize}${selectedMedicine.baseUnit} = ${parseFloat(quantity) * parseFloat(packageSize)}${selectedMedicine.baseUnit}`
        : `${quantity}${unit}`;

      dispatch(
        showToast(`已入库 ${selectedMedicine.name} ${totalDisplay}`),
      );

      setQuantity('0');
      setNotes('');
    } catch (error) {
      dispatch(showError((error as Error).message));
    }
  };

  if (!selectedMedicine) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyLarge" style={styles.emptyText}>
          请先选择要入库的药品
        </Text>
      </View>
    );
  }

  const quickQuantities: string[] = stockType === 'packaged' ? ['1', '5', '10'] : ['100', '500', '1000'];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Medicine Info */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {selectedMedicine.name}
          </Text>
          <Text variant="bodyMedium" style={styles.sectionSubtitle}>
            规格: {selectedMedicine.packageSize}{selectedMedicine.baseUnit}/{selectedMedicine.packageUnit}
          </Text>
          <Text variant="bodyMedium" style={styles.sectionSubtitle}>
            当前库存 - 包装: {selectedMedicine.packagedStock}{selectedMedicine.packageUnit}
          </Text>
          <Text variant="bodyMedium" style={styles.sectionSubtitle}>
            当前库存 - 散装: {selectedMedicine.looseStock}{selectedMedicine.baseUnit}
          </Text>
        </View>

        <Divider />

        {/* Stock Type Selection */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            入库类型
          </Text>
          <SegmentedButtons
            value={stockType}
            onValueChange={(value) => setStockType(value as 'packaged' | 'loose')}
            buttons={[
              {label: '散装入库', value: 'loose'},
              {label: '包装入库', value: 'packaged'},
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Quantity Input */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            入库数量
          </Text>

          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            label="数量"
            mode="outlined"
            style={styles.input}
            autoFocus
          />

          {/* Quick Quantity Buttons */}
          <View style={styles.quickButtons}>
            {quickQuantities.map(q => (
              <Button
                key={q}
                mode="outlined"
                onPress={() => setQuantity(q)}
                style={styles.quickButton}
                compact>
                {q}
              </Button>
            ))}
          </View>
        </View>

        {/* Package Size Input (only for packaged units) */}
        {stockType === 'packaged' && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              包装规格（克/包）
            </Text>

            <TextInput
              value={packageSize}
              onChangeText={setPackageSize}
              keyboardType="number-pad"
              label="每包规格"
              mode="outlined"
              style={styles.input}
              placeholder={`默认: ${selectedMedicine.packageSize}`}
            />

            {/* Quick Package Size Buttons */}
            <View style={styles.quickButtons}>
              <Button
                mode="outlined"
                onPress={() => setPackageSize(String(selectedMedicine.packageSize))}
                style={styles.quickButton}
                compact>
                默认
              </Button>
              <Button
                mode="outlined"
                onPress={() => setPackageSize('250')}
                style={styles.quickButton}
                compact>
                250g
              </Button>
              <Button
                mode="outlined"
                onPress={() => setPackageSize('500')}
                style={styles.quickButton}
                compact>
                500g
              </Button>
            </View>

            {/* Calculation Display */}
            {quantity && packageSize && (
              <Text variant="bodyMedium" style={styles.calculationText}>
                共计: {quantity} 包 × {packageSize} {selectedMedicine.baseUnit}/包 = {parseFloat(quantity) * parseFloat(packageSize)} {selectedMedicine.baseUnit}
              </Text>
            )}
          </View>
        )}

        {/* Unit Display (auto-selected based on stock type) */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            单位: {unit}
          </Text>
          <Text variant="bodyMedium" style={styles.unitInfo}>
            {stockType === 'packaged'
              ? `每包${selectedMedicine.packageSize}${selectedMedicine.baseUnit}`
              : `散装单位`}
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            label="备注（可选）"
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            keyboardType="default"
            autoCorrect={true}
            autoCapitalize="sentences"
          />
        </View>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!isValid || loading}
          loading={loading}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}>
          确认入库
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#999',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: '#666',
    marginBottom: 4,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickButton: {
    flex: 1,
  },
  unitInfo: {
    color: '#666',
  },
  calculationText: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    color: '#1565C0',
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});
