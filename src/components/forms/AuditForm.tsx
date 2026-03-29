/**
 * AuditForm Component
 *
 * Form for inventory audit/stocktaking (盘点) operations.
 * Redesigned according to UI prototype with green theme (#00A67D).
 * Records actual stock counts and calculates discrepancies.
 */

import React, {useState, useEffect} from 'react';
import {View, StyleSheet, KeyboardAvoidingView, Platform} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Divider,
  useTheme,
  Card,
  SegmentedButtons,
} from 'react-native-paper';
import {ScrollView} from 'react-native-gesture-handler';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {
  executeTransaction,
  selectSelectedMedicine,
  selectPackagedStockBySize,
} from '@/store/slices/inventorySlice';
import {
  recordAuditEntry,
  selectCurrentSession,
  selectAuditLoading,
} from '@/store/slices/auditSlice';
import {TransactionType, UnitType} from '@/types';
import {convertToBaseUnits} from '@/utils/conversion/UnitConverter';
import {showToast, showError} from '@/store/slices/uiSlice';

// Theme colors (Green theme)
const COLORS = {
  primary: '#00A67D',     // Green
  background: '#E6F7F0',  // Light green
  warning: '#FF9800',     // Orange for loss
  error: '#F44336',       // Red for loss
  success: '#4CAF50',     // Green for gain
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
  white: '#FFFFFF',
};

export const AuditForm: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const selectedMedicine = useAppSelector(selectSelectedMedicine);
  const currentSession = useAppSelector(selectCurrentSession);
  const loading = useAppSelector(selectAuditLoading);

  const [actualQuantity, setActualQuantity] = useState('');
  const [unit, setUnit] = useState<UnitType>('g');
  const [notes, setNotes] = useState('');
  const [showLossReason, setShowLossReason] = useState(false);
  const [lossReason, setLossReason] = useState('');

  // Get packaged stock by size
  const packagedStockBySize = useAppSelector(state =>
    selectedMedicine ? selectPackagedStockBySize(state, selectedMedicine.id) : []
  );

  // Calculate discrepancy
  const [discrepancy, setDiscrepancy] = useState(0);

  useEffect(() => {
    if (selectedMedicine && actualQuantity) {
      const actual = parseFloat(actualQuantity);
      const actualInBaseUnits = convertToBaseUnits(actual, unit, selectedMedicine.packageSize);
      const discrepancyInBaseUnits = actualInBaseUnits - selectedMedicine.currentStock;

      setDiscrepancy(discrepancyInBaseUnits);
      setShowLossReason(discrepancyInBaseUnits < 0);
    } else {
      setDiscrepancy(0);
      setShowLossReason(false);
    }
  }, [selectedMedicine, actualQuantity, unit]);

  // Initialize unit when medicine is selected
  useEffect(() => {
    if (selectedMedicine) {
      setUnit(selectedMedicine.baseUnit as UnitType);
    }
  }, [selectedMedicine?.id]);

  // Validate form
  const isValid = selectedMedicine &&
    actualQuantity &&
    parseFloat(actualQuantity) >= 0 &&
    (!showLossReason || lossReason.trim().length > 0);

  // Handle submit
  const handleSubmit = async () => {
    if (!isValid || !selectedMedicine || !currentSession) return;

    try {
      const actualInBaseUnits = convertToBaseUnits(
        parseFloat(actualQuantity),
        unit,
        selectedMedicine.packageSize,
      );

      // Record audit entry
      await dispatch(
        recordAuditEntry({
          sessionId: currentSession.id,
          medicineId: selectedMedicine.id,
          expectedStock: selectedMedicine.currentStock,
          actualStock: actualInBaseUnits,
          unit,
          notes: notes || undefined,
        }),
      ).unwrap();

      // If there's a discrepancy, create a stock transaction
      if (discrepancy !== 0) {
        await dispatch(
          executeTransaction({
            medicineId: selectedMedicine.id,
            type: TransactionType.AUDIT,
            quantity: actualInBaseUnits,
            unit,
            referenceId: currentSession.id,
            notes: lossReason
              ? `盘点调整 - 原因: ${lossReason}`
              : notes || `盘点调整: ${discrepancy > 0 ? '+' : ''}${discrepancy}${unit}`,
          }),
        ).unwrap();
      }

      const discrepancyText = discrepancy === 0
        ? '无差异'
        : `差异 ${discrepancy > 0 ? '+' : ''}${discrepancy}${unit}`;
      dispatch(
        showToast(`已盘点 ${selectedMedicine.name}，${discrepancyText}`),
      );

      // Reset form
      setActualQuantity('');
      setNotes('');
      setLossReason('');
    } catch (error) {
      dispatch(showError((error as Error).message));
    }
  };

  if (!selectedMedicine) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, {backgroundColor: COLORS.background}]}>
          <Text style={[styles.emptyIconText, {color: COLORS.primary}]}>📋</Text>
        </View>
        <Text variant="titleMedium" style={styles.emptyTitle}>盘点操作</Text>
        <Text variant="bodyMedium" style={styles.emptyText}>
          请先从左侧列表选择要盘点的药品
        </Text>
      </View>
    );
  }

  if (!currentSession) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, {backgroundColor: COLORS.background}]}>
          <Text style={[styles.emptyIconText, {color: COLORS.primary}]}>📋</Text>
        </View>
        <Text variant="titleMedium" style={styles.emptyTitle}>开始盘点</Text>
        <Text variant="bodyMedium" style={styles.emptyText}>
          请先点击"开始盘点"按钮创建盘点会话
        </Text>
      </View>
    );
  }

  const isLoss = discrepancy < 0;
  const isGain = discrepancy > 0;

  // Quick quantity buttons
  const quickQuantities = selectedMedicine.currentStock >= 1000
    ? ['100', '500', '1000']
    : selectedMedicine.currentStock >= 500
      ? ['50', '100', '200']
      : ['10', '50', '100'];

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
          <Text variant="titleMedium" style={styles.sectionTitle}>账面库存</Text>
          <View style={styles.stockGrid}>
            {/* Display packaged stock by specification */}
            {packagedStockBySize.length > 0 ? (
              packagedStockBySize.map(({ packageSize, count }) => (
                <View key={packageSize} style={styles.stockItem}>
                  <Text variant="bodyMedium" style={styles.stockLabel}>
                    {packageSize}g/包
                  </Text>
                  <Text variant="titleMedium" style={[styles.stockValue, {color: COLORS.primary}]}>
                    {count}包
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.stockItem}>
                <Text variant="bodyMedium" style={styles.stockLabel}>
                  包装
                </Text>
                <Text variant="titleMedium" style={[styles.stockValue, {color: COLORS.primary}]}>
                  {selectedMedicine.packagedStock}{selectedMedicine.packageUnit}
                </Text>
              </View>
            )}
            <View style={styles.stockItem}>
              <Text variant="bodyMedium" style={styles.stockLabel}>
                散装
              </Text>
              <Text variant="titleMedium" style={[styles.stockValue, {color: COLORS.primary}]}>
                {selectedMedicine.looseStock}{selectedMedicine.baseUnit}
              </Text>
            </View>
          </View>
          <View style={styles.totalStockRow}>
            <Text variant="bodyMedium" style={styles.totalStockLabel}>
              总计
            </Text>
            <Text variant="titleMedium" style={[styles.totalStockValue, {color: COLORS.primary}]}>
              {selectedMedicine.currentStock}{selectedMedicine.baseUnit}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Actual Quantity Input */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>实盘数量</Text>

          <TextInput
            value={actualQuantity}
            onChangeText={setActualQuantity}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            placeholder={`输入实际数量 (${unit})`}
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
                onPress={() => setActualQuantity(q)}
                style={styles.quickButton}
                textColor={COLORS.primary}
                contentStyle={styles.quickButtonContent}>
                {q}
              </Button>
            ))}
          </View>
        </View>

        {/* Discrepancy Display */}
        {actualQuantity && (
          <Card style={[
            styles.discrepancyCard,
            isLoss && styles.lossCard,
            isGain && styles.gainCard,
          ]}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.discrepancyLabel}>
                {discrepancy === 0 ? '无差异' : isLoss ? '盘亏' : '盘盈'}
              </Text>
              <Text variant="headlineSmall" style={[
                styles.discrepancyValue,
                isLoss && styles.lossText,
                isGain && styles.gainText,
              ]}>
                {discrepancy > 0 ? '+' : ''}{discrepancy}{unit}
              </Text>
              {isLoss && (
                <Text variant="bodySmall" style={styles.discrepancyNote}>
                  ⚠️ 盘亏将自动扣减库存
                </Text>
              )}
              {isGain && (
                <Text variant="bodySmall" style={styles.discrepancyNote}>
                  ✓ 盘盈将自动增加库存
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Loss Reason - Required for losses */}
        {showLossReason && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, {color: COLORS.error}]}>
              盘亏原因（必填）
            </Text>
            <TextInput
              value={lossReason}
              onChangeText={setLossReason}
              mode="outlined"
              style={styles.input}
              placeholder="请输入盘亏原因"
              placeholderTextColor={COLORS.textLight}
              outlineColor={COLORS.error}
              activeOutlineColor={COLORS.error}
              multiline
              numberOfLines={2}
            />
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

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!isValid || loading}
          loading={loading}
          style={[
            styles.submitButton,
            isLoss && styles.submitButtonLoss,
            isGain && styles.submitButtonGain,
          ]}
          buttonColor={
            discrepancy === 0
              ? COLORS.primary
              : isLoss
                ? COLORS.error
                : COLORS.success
          }
          contentStyle={styles.submitButtonContent}>
          确认盘点
        </Button>
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
    gap: 12,
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
  },
  totalStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  totalStockLabel: {
    color: COLORS.textSecondary,
  },
  totalStockValue: {
    fontWeight: '600',
  },
  divider: {
    marginVertical: 16,
  },
  // Section
  section: {
    marginBottom: 20,
  },
  // Input
  input: {
    backgroundColor: COLORS.white,
    marginBottom: 12,
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
  // Discrepancy Card
  discrepancyCard: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  lossCard: {
    backgroundColor: '#FFEBEE',
    borderColor: COLORS.error,
  },
  gainCard: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS.success,
  },
  discrepancyLabel: {
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.text,
  },
  discrepancyValue: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lossText: {
    color: COLORS.error,
  },
  gainText: {
    color: COLORS.success,
  },
  discrepancyNote: {
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // Notes Input
  notesInput: {
    backgroundColor: COLORS.white,
    minHeight: 60,
  },
  // Submit Button
  submitButton: {
    borderRadius: 8,
    marginTop: 8,
  },
  submitButtonLoss: {
    // Additional styles for loss
  },
  submitButtonGain: {
    // Additional styles for gain
  },
  submitButtonContent: {
    paddingVertical: 12,
  },
});
