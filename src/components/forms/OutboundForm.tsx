/**
 * OutboundForm Component
 *
 * Form for recording stock outbound (出库) operations.
 * Redesigned according to UI prototype with orange theme (#FF6600).
 * Supports both simple mode and smart mode with intelligent package combination.
 */

import React, {useState, useEffect, useMemo} from 'react';
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
import {
  convertToBaseUnits
} from '@/utils/conversion/UnitConverter';
import {showToast, showError} from '@/store/slices/uiSlice';
import {
  calculateOptimalOutboundPlan,
  formatOutboundPlan,
  getOutboundPlanSummary
} from '@/utils/conversion/OutboundCalculator';

// Theme colors (Orange theme)
const COLORS = {
  primary: '#FF6600',     // Orange
  background: '#FFF3E0',  // Light orange
  success: '#00A67D',     // Green
  smartPlan: '#E6F7F0', // Light green for smart plan
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
  white: '#FFFFFF',
  error: '#F44336',
};

type OutboundMode = 'simple' | 'smart';

export const OutboundForm: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const selectedMedicine = useAppSelector(selectSelectedMedicine);
  const loading = useAppSelector(selectInventoryLoading);

  // Get packaged stock grouped by size
  const packagedStockBySize = useAppSelector(state =>
    selectedMedicine ? selectPackagedStockBySize(state, selectedMedicine.id) : []
  );

  // Outbound mode: simple (traditional) or smart (intelligent mixed outbound)
  const [outboundMode, setOutboundMode] = useState<OutboundMode>('smart');

  const [quantity, setQuantity] = useState('');
  const [stockType, setStockType] = useState<'packaged' | 'loose'>('loose');
  const [unit, setUnit] = useState<UnitType>('g');
  const [notes, setNotes] = useState('');

  // Update unit based on stock type
  useEffect(() => {
    if (selectedMedicine) {
      if (stockType === 'packaged') {
        setUnit(selectedMedicine.packageUnit as UnitType);
      } else {
        setUnit(selectedMedicine.baseUnit as UnitType);
      }
      setQuantity('');
    }
  }, [stockType, selectedMedicine]);

  // Calculate stock availability
  const stockAvailable = useMemo(() => {
    if (!selectedMedicine || !quantity) return true;
    const qty = parseFloat(quantity);
    if (qty <= 0) return true;

    if (stockType === 'packaged') {
      return selectedMedicine.packagedStock >= qty;
    } else {
      const baseQty = convertToBaseUnits(qty, unit, selectedMedicine.packageSize);
    return selectedMedicine.looseStock >= baseQty;
    }
  }, [selectedMedicine, quantity, unit, stockType]);

  // Calculate smart outbound plan
  const outboundPlan = useMemo(() => {
    if (
      outboundMode === 'smart' &&
      selectedMedicine &&
      quantity &&
      parseFloat(quantity) > 0
    ) {
      const qty = parseFloat(quantity);
      const requiredQty = convertToBaseUnits(
        qty,
        unit,
        selectedMedicine.packageSize,
      );

      return calculateOptimalOutboundPlan(
        packagedStockBySize,
        selectedMedicine.looseStock,
        requiredQty,
        'optimal',
      );
    }
    return null;
  }, [outboundMode, selectedMedicine, quantity, unit, packagedStockBySize]);

  // Validate form
  const isValid = useMemo(() => {
    if (!selectedMedicine || parseFloat(quantity) <= 0) {
      return false;
    }

    if (outboundMode === 'smart') {
      return outboundPlan?.isFeasible || false;
    } else {
      return stockAvailable;
    }
  }, [selectedMedicine, quantity, stockAvailable, outboundMode, outboundPlan]);

  // Handle submit
  const handleSubmit = async () => {
    if (!isValid || !selectedMedicine) return;

    try {
      if (outboundMode === 'smart' && outboundPlan && outboundPlan.isFeasible) {
        // Smart mode: Execute multiple transactions for each item in the plan
        for (const item of outboundPlan.items) {
          await dispatch(executeTransaction({
            medicineId: selectedMedicine.id,
            type: TransactionType.OUTBOUND,
            quantity: item.quantity,
            unit: item.unit,
            packageSize: item.packageSize ?? undefined,
            notes: `智能出库 - ${notes}`,
          })).unwrap();
        }

        const summary = formatOutboundPlan(outboundPlan);
        dispatch(showToast(`已出库 ${selectedMedicine.name} - ${summary}`));

        setQuantity('');
        setNotes('');
      } else {
        // Simple mode: Traditional single transaction
        await dispatch(executeTransaction({
          medicineId: selectedMedicine.id,
          type: TransactionType.OUTBOUND,
          quantity: parseFloat(quantity),
          unit,
          notes: `${stockType === 'packaged' ? '包装' : '散装'}出库 - ${notes}`,
        })).unwrap();

        dispatch(showToast(`已出库 ${selectedMedicine.name} ${quantity}${unit}`));

        setQuantity('');
        setNotes('');
      }
    } catch (error) {
      dispatch(showError((error as Error).message));
    }
  };

  if (!selectedMedicine) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, {backgroundColor: COLORS.background}]}>
          <Text style={[styles.emptyIconText, {color: COLORS.primary}]}>📤</Text>
        </View>
        <Text variant="titleMedium" style={styles.emptyTitle}>出库操作</Text>
        <Text variant="bodyMedium" style={styles.emptyText}>
          请先从左侧列表选择要出库的药品
        </Text>
      </View>
    );
  }

  // Current stock display
  const currentStock = stockType === 'packaged'
    ? selectedMedicine.packagedStock
    : selectedMedicine.looseStock;

  const currentStockDisplay = stockType === 'packaged'
    ? `${selectedMedicine.packagedStock}${selectedMedicine.packageUnit}`
    : `${selectedMedicine.looseStock}${selectedMedicine.baseUnit}`;

  // Quick quantities
  const quickQuantities = stockType === 'packaged'
    ? selectedMedicine.packagedStock > 0
      ? ['1', '2', '5'].filter(q => parseInt(q) <= selectedMedicine.packagedStock)
      : ['1']
    : selectedMedicine.looseStock >= 1000
      ? ['100', '500', '1000']
      : ['50', '100', '200'];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Current Stock Display */}
        <View style={styles.stockInfoSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>当前库存</Text>
          <View style={styles.stockGrid}>
            {/* Display packaged stock by specification */}
            {packagedStockBySize.length > 0 ? (
              packagedStockBySize.map(({ packageSize, size, count }) => (
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

        {/* Outbound Mode Selection */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>出库模式</Text>
          <SegmentedButtons
            value={outboundMode}
            onValueChange={(value) => setOutboundMode(value as OutboundMode)}
            buttons={[
              {
                label: '手动选择',
                value: 'simple',
                style: outboundMode === 'simple' && styles.activeSegment,
              },
              {
                label: '智能出库',
                value: 'smart',
                style: outboundMode === 'smart' && styles.activeSegmentOrange,
              },
            ]}
            style={styles.segmentedButtons}
          />
          <Text variant="bodySmall" style={styles.modeDescription}>
            {outboundMode === 'simple'
              ? '手动选择出库类型（包装/散装）'
              : '自动计算最优包装组合，支持多规格混合出库'}
          </Text>
        </View>

        {/* Stock Type Selection - Only show in simple mode */}
        {outboundMode === 'simple' && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>出库类型</Text>
            <SegmentedButtons
              value={stockType}
              onValueChange={(value) => setStockType(value as 'packaged' | 'loose')}
              buttons={[
                {
                  label: `散装出库`,
                  value: 'loose',
                  disabled: selectedMedicine.looseStock === 0,
                  style: stockType === 'loose' && styles.activeSegmentOrange,
                },
                {
                  label: `包装出库`,
                  value: 'packaged',
                  disabled: selectedMedicine.packagedStock === 0,
                  style: stockType === 'packaged' && styles.activeSegmentOrange,
                },
              ]}
              style={styles.segmentedButtons}
            />
          </View>
        )}

        {/* Quantity Input */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            出库数量
            {outboundMode === 'simple' && stockType === 'packaged' ? ' (包)' : ` (${selectedMedicine.baseUnit})`}
          </Text>

          <Text variant="bodySmall" style={styles.availableStock}>
            当前可用: {currentStockDisplay}
          </Text>

          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            placeholder={outboundMode === 'smart' ? '输入出库克数' : '输入数量'}
            placeholderTextColor={COLORS.textLight}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            autoFocus
            selectTextOnFocus
            error={!stockAvailable && outboundMode === 'simple' && quantity !== ''}
          />

          <View style={styles.quickButtons}>
            {quickQuantities.slice(0, 3).map(q => (
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

          {/* Stock Availability Warning - Only for simple mode */}
          {outboundMode === 'simple' && quantity && !stockAvailable && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                {stockType === 'packaged'
                  ? `包装库存不足！当前只有 ${selectedMedicine.packagedStock} 包`
                  : `散装库存不足！当前只有 ${selectedMedicine.looseStock} ${selectedMedicine.baseUnit}`
                }
              </Text>
            </View>
          )}

          {/* Smart Mode Plan Preview */}
          {outboundMode === 'smart' && outboundPlan && quantity && (
            <View style={styles.planPreviewContainer}>
              {outboundPlan.isFeasible ? (
                <Card style={styles.planCard}>
                  <Card.Content>
                    <Text variant="titleSmall" style={styles.planTitle}>
                      智能出库方案
                    </Text>
                    {outboundPlan.items.map((item, index) => (
                      <Text key={index} variant="bodyMedium" style={styles.planItem}>
                        • {item.packageSize
                          ? `${item.packageSize}g/包 × ${item.quantity}包 (${item.packageSize * item.quantity}g)`
                          : `${item.quantity}g散装`}
                      </Text>
                    ))}
                    <Divider style={styles.planDivider} />
                    <Text variant="bodyMedium" style={styles.planTotal}>
                      总计: {outboundPlan.items.reduce((sum, i) => sum + i.quantityInBaseUnits, 0)}g
                      {outboundPlan.needsUnpack ? ' (需拆包)' : ' (无需拆包)'}
                    </Text>
                  </Card.Content>
                </Card>
              ) : (
                <View style={styles.warningContainer}>
                  <Text style={styles.warningText}>{outboundPlan.reason}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Unit Display - Only for simple mode */}
        {outboundMode === 'simple' && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              单位: {unit}
            </Text>
            <Text variant="bodyMedium" style={styles.unitInfo}>
              {stockType === 'packaged'
                ? `每包${selectedMedicine.packageSize}${selectedMedicine.baseUnit}`
                : '散装单位'}
            </Text>
          </View>
        )}

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

        {/* Submit Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => {
              setQuantity('');
              setNotes('');
            }}
            disabled={!quantity}
            style={styles.cancelButton}
            textColor={COLORS.textSecondary}>
            清空
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={!isValid || loading}
            loading={loading}
            style={styles.submitButton}
            buttonColor={
              outboundMode === 'smart'
                ? outboundPlan?.isFeasible
                  ? COLORS.primary
                  : COLORS.error
                : stockAvailable
                  ? COLORS.primary
                  : COLORS.error
            }
            contentStyle={styles.submitButtonContent}>
            确认出库
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
  // Empty state
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
  // Stock Info Section
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
  // Section
  section: {
    marginBottom: 20,
  },
  // Segmented Buttons
  segmentedButtons: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 12,
  },
  activeSegment: {
    backgroundColor: COLORS.primary,
  },
  activeSegmentOrange: {
    backgroundColor: COLORS.primary,
  },
  modeDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  // Input
  input: {
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },
  availableStock: {
    color: COLORS.success,
    marginBottom: 12,
    fontWeight: '500',
  },
  // Quick Buttons
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
  // Warning
  warningContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  warningText: {
    color: COLORS.error,
    fontSize: 12,
  },
  // Smart Plan
  planPreviewContainer: {
    marginTop: 16,
  },
  planCard: {
    backgroundColor: COLORS.smartPlan,
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: 12,
  },
  planTitle: {
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 12,
  },
  planItem: {
    marginBottom: 8,
    color: '#2E7D32',
  },
  planDivider: {
    marginVertical: 8,
    backgroundColor: '#A5D6A',
  },
  planTotal: {
    fontWeight: '600',
    color: '#1B5E20',
  },
  // Unit Info
  unitInfo: {
    color: COLORS.textSecondary,
  },
  // Notes Input
  notesInput: {
    backgroundColor: COLORS.white,
    minHeight: 60,
  },
  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
  },
  submitButton: {
    flex: 2,
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 12,
  },
});
