/**
 * InboundForm Component
 *
 * Form for recording stock incoming (入库) operations.
 * Redesigned according to UI prototype with blue theme.
 * Supports both packaged and loose stock entry with multi-specification.
 */

import React, {useState, useMemo} from 'react';
import {View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Divider,
  SegmentedButtons,
  useTheme,
  Card,
} from 'react-native-paper';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {
  executeTransaction,
  selectSelectedMedicine,
  selectInventoryLoading,
  selectPackagedStockBySize,
} from '@/store/slices/inventorySlice';
import {TransactionType, UnitType} from '@/types';
import {showToast, showError} from '@/store/slices/uiSlice';

// Theme colors
const COLORS = {
  primary: '#1976D2',
  background: '#E3F2FD',
  success: '#00A67D',
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
  white: '#FFFFFF',
};

type InboundType = 'packaged' | 'loose';

export const InboundForm: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const selectedMedicine = useAppSelector(selectSelectedMedicine);
  const loading = useAppSelector(selectInventoryLoading);
  const packagedStockBySize = useAppSelector(state =>
    selectedMedicine ? selectPackagedStockBySize(state, selectedMedicine.id) : []
  );

  const [inboundType, setInboundType] = useState<InboundType>('packaged');
  const [quantity, setQuantity] = useState('');
  const [packageSize, setPackageSize] = useState('');
  const [notes, setNotes] = useState('');

  // Initialize package size when medicine is selected
  React.useEffect(() => {
    if (selectedMedicine) {
      setPackageSize(String(selectedMedicine.packageSize));
    }
  }, [selectedMedicine]);

  // Calculate total grams for packaged inbound
  const totalGrams = useMemo(() => {
    if (inboundType === 'packaged' && quantity && packageSize) {
      return parseFloat(quantity) * parseFloat(packageSize);
    }
    return 0;
  }, [inboundType, quantity, packageSize]);

  // Validate form
  const isValid = useMemo(() => {
    if (!selectedMedicine) return false;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return false;

    if (inboundType === 'packaged') {
      const pkgSize = parseFloat(packageSize);
      return !isNaN(pkgSize) && pkgSize > 0;
    }

    return true;
  }, [selectedMedicine, quantity, inboundType, packageSize]);

  // Handle submit
  const handleSubmit = async () => {
    console.log('handleSubmit called, isValid:', isValid, 'selectedMedicine:', selectedMedicine?.name, 'quantity:', quantity);
    if (!isValid || !selectedMedicine) {
      console.log('Form validation failed or no medicine selected');
      return;
    }

    try {
      const qty = parseFloat(quantity);

      if (inboundType === 'packaged') {
        const pkgSize = parseFloat(packageSize);
        await dispatch(executeTransaction({
          medicineId: selectedMedicine.id,
          type: TransactionType.INBOUND,
          quantity: qty,
          unit: selectedMedicine.packageUnit as UnitType,
          packageSize: pkgSize,
          notes: `包装入库 - ${notes}`,
        })).unwrap();

        dispatch(showToast(`已入库 ${selectedMedicine.name} ${qty}包 × ${pkgSize}g = ${totalGrams}g`));
      } else {
        await dispatch(executeTransaction({
          medicineId: selectedMedicine.id,
          type: TransactionType.INBOUND,
          quantity: qty,
          unit: selectedMedicine.baseUnit as UnitType,
          notes: `散装入库 - ${notes}`,
        })).unwrap();

        dispatch(showToast(`已入库 ${selectedMedicine.name} ${qty}${selectedMedicine.baseUnit}`));
      }

      setQuantity('');
      setNotes('');
    } catch (error) {
      dispatch(showError((error as Error).message));
    }
  };

  if (!selectedMedicine) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, {backgroundColor: COLORS.background}]}>
          <Text style={[styles.emptyIconText, {color: COLORS.primary}]}>📦</Text>
        </View>
        <Text variant="titleMedium" style={styles.emptyTitle}>入库操作</Text>
        <Text variant="bodyMedium" style={styles.emptyText}>
          请先从左侧列表选择要入库的药品
        </Text>
      </View>
    );
  }

  const quickQuantities = inboundType === 'packaged'
    ? ['1', '5', '10']
    : ['100', '500', '1000'];

  const quickPackageSizes = ['250', '500'];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}>

        {/* Current Stock Display */}
        <View style={styles.stockInfoSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>当前库存</Text>
          <View style={styles.stockGrid}>
            {packagedStockBySize.length > 0 ? (
              packagedStockBySize.map(({ packageSize: size, count }) => (
                <View key={size} style={styles.stockItem}>
                  <Text variant="bodyMedium" style={styles.stockLabel}>
                    {size}g/包
                  </Text>
                  <Text variant="titleMedium" style={[styles.stockValue, {color: COLORS.success}]}>
                    {count}包
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.stockItem}>
                <Text variant="bodyMedium" style={styles.stockLabel}>
                  包装
                </Text>
                <Text variant="titleMedium" style={[styles.stockValue, {color: COLORS.success}]}>
                  {selectedMedicine.packagedStock}{selectedMedicine.packageUnit}
                </Text>
              </View>
            )}
            <View style={styles.stockItem}>
              <Text variant="bodyMedium" style={styles.stockLabel}>
                散装
              </Text>
              <Text variant="titleMedium" style={[styles.stockValue, {color: COLORS.success}]}>
                {selectedMedicine.looseStock}{selectedMedicine.baseUnit}
              </Text>
            </View>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Inbound Type Selection */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>入库类型</Text>
          <SegmentedButtons
            value={inboundType}
            onValueChange={(value) => setInboundType(value as InboundType)}
            buttons={[
              {
                label: '包装入库',
                value: 'packaged',
                style: inboundType === 'packaged' && styles.activeSegment,
              },
              {
                label: '散装入库',
                value: 'loose',
                style: inboundType === 'loose' && styles.activeSegment,
              },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Quantity Input */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            入库数量
            {inboundType === 'packaged' ? ' (包)' : ` (${selectedMedicine.baseUnit})`}
          </Text>

          <TextInput
            value={quantity}
            onChangeText={(text) => {
              console.log('Quantity changed:', text);
              setQuantity(text);
            }}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            placeholder={inboundType === 'packaged' ? '输入包数' : '输入克数'}
            placeholderTextColor={COLORS.textLight}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            autoFocus
            selectTextOnFocus
          />

          <View style={styles.quickButtons}>
            {quickQuantities.map(q => (
              <Button
                key={q}
                mode="outlined"
                onPress={() => setQuantity(q)}
                style={styles.quickButton}
                textColor={COLORS.primary}
                contentStyle={styles.quickButtonContent}>
                {q}
              </Button>
            ))}
          </View>
        </View>

        {/* Package Size Input - ALWAYS visible */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>包装规格 (克/包)</Text>

          <TextInput
            value={packageSize}
            onChangeText={(text) => {
              console.log('PackageSize changed:', text);
              setPackageSize(text);
            }}
            keyboardType="number-pad"
            mode="outlined"
            style={styles.input}
            placeholder="输入每包克数"
            placeholderTextColor={COLORS.textLight}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />

          <View style={styles.quickButtons}>
            <Button
              mode="outlined"
              onPress={() => setPackageSize(String(selectedMedicine.packageSize))}
              style={styles.quickButton}
              textColor={COLORS.primary}
              contentStyle={styles.quickButtonContent}>
              默认
            </Button>
            {quickPackageSizes.map(size => (
              <Button
                key={size}
                mode="outlined"
                onPress={() => setPackageSize(size)}
                style={styles.quickButton}
                textColor={COLORS.primary}
                contentStyle={styles.quickButtonContent}>
                {size}g
              </Button>
            ))}
          </View>

          {/* Calculation Display */}
          {quantity && packageSize && (
            <Card style={styles.calculationCard}>
              <Card.Content style={styles.calculationContent}>
                <Text variant="titleSmall" style={styles.calculationTitle}>
                  共计
                </Text>
                <Text variant="bodyLarge" style={styles.calculationText}>
                  {quantity} 包 × {packageSize} g/包 = {totalGrams} g
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            label="备注（可选）"
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.notesInput}
            placeholder="添加备注信息"
            placeholderTextColor={COLORS.textLight}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />
        </View>

        {/* Submit Button - Always visible */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={!isValid || loading}
            loading={loading}
            style={styles.submitButton}
            buttonColor={COLORS.primary}
            contentStyle={styles.submitButtonContent}>
            确认入库
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconText: {
    fontSize: 36,
  },
  emptyTitle: {
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  stockInfoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  stockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  stockItem: {
    backgroundColor: COLORS.background,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  stockLabel: {
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  stockValue: {
    fontWeight: '600',
    color: COLORS.success,
  },
  divider: {
    marginVertical: 16,
  },
  section: {
    marginBottom: 20,
  },
  segmentedButtons: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 12,
  },
  activeSegment: {
    backgroundColor: COLORS.primary,
  },
  input: {
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickButton: {
    flex: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
  },
  quickButtonContent: {
    paddingVertical: 8,
  },
  calculationCard: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  calculationContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  calculationTitle: {
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  calculationText: {
    fontWeight: '600',
    color: COLORS.primary,
    fontSize: 18,
  },
  notesInput: {
    backgroundColor: COLORS.white,
    minHeight: 60,
  },
  submitButton: {
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 12,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 4,
  },
});
