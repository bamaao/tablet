/**
 * AuditForm Component
 *
 * Form for inventory audit/stocktaking (盘点) operations.
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
} from 'react-native-paper';
import {ScrollView} from 'react-native-gesture-handler';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {
  executeTransaction,
  selectSelectedMedicine,
} from '@/store/slices/inventorySlice';
import {
  recordAuditEntry,
  selectCurrentSession,
  selectCurrentRecord,
} from '@/store/slices/auditSlice';
import {TransactionType, UnitType} from '@/types';
import {UnitSelector} from '@/components/inventory/UnitSelector';
import {convertToBaseUnits} from '@/utils/conversion/UnitConverter';

export const AuditForm: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const selectedMedicine = useAppSelector(selectSelectedMedicine);
  const currentSession = useAppSelector(selectCurrentSession);
  const currentRecord = useAppSelector(selectCurrentRecord);
  const loading = useAppSelector(selectAuditLoading);

  const [actualQuantity, setActualQuantity] = useState('');
  const [unit, setUnit] = useState<UnitType>('g');
  const [notes, setNotes] = useState('');

  // Calculate discrepancy
  const [discrepancy, setDiscrepancy] = useState(0);

  useEffect(() => {
    if (selectedMedicine && actualQuantity) {
      const actual = parseFloat(actualQuantity);
      const expectedInSelectedUnit = convertFromBaseUnits(
        selectedMedicine.currentStock,
        unit,
        selectedMedicine.packageSize,
      );
      const actualInBaseUnits = convertToBaseUnits(actual, unit, selectedMedicine.packageSize);
      const discrepancyInBaseUnits = actualInBaseUnits - selectedMedicine.currentStock;

      setDiscrepancy(discrepancyInBaseUnits);
    } else {
      setDiscrepancy(0);
    }
  }, [selectedMedicine, actualQuantity, unit]);

  // Validate form
  const isValid = selectedMedicine && actualQuantity && parseFloat(actualQuantity) >= 0;

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
            notes: notes || `盘点调整: ${discrepancy > 0 ? '+' : ''}${discrepancy}${unit}`,
          }),
        ).unwrap();
      }

      const discrepancyText = discrepancy === 0 ? '无差异' : `差异 ${discrepancy > 0 ? '+' : ''}${discrepancy}${unit}`;
      dispatch(
        showToast(`已盘点 ${selectedMedicine.name}，${discrepancyText}`),
      );

      // Reset form
      setActualQuantity('');
      setNotes('');
    } catch (error) {
      dispatch(showError((error as Error).message));
    }
  };

  if (!selectedMedicine) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyLarge" style={styles.emptyText}>
          请先选择要盘点的药品
        </Text>
      </View>
    );
  }

  if (!currentSession) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyLarge" style={styles.emptyText}>
          请先开始盘点会话
        </Text>
      </View>
    );
  }

  const expectedInSelectedUnit = convertFromBaseUnits(
    selectedMedicine.currentStock,
    unit,
    selectedMedicine.packageSize,
  );
  const isLoss = discrepancy < 0;
  const isGain = discrepancy > 0;
  const discrepancyInSelectedUnit = convertFromBaseUnits(
    Math.abs(discrepancy),
    unit,
    selectedMedicine.packageSize,
  );

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
            账面库存: {expectedInSelectedUnit.toFixed(2)} {unit}
          </Text>
        </View>

        <Divider />

        {/* Actual Quantity Input */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            实盘数量
          </Text>

          <TextInput
            value={actualQuantity}
            onChangeText={setActualQuantity}
            keyboardType="decimal-pad"
            label="实际数量"
            mode="outlined"
            style={styles.input}
            autoFocus
          />

          {/* Unit Selector */}
          <UnitSelector value={unit} onChange={setUnit} />

          {/* Discrepancy Display */}
          {actualQuantity && (
            <View
              style={[
                styles.discrepancyContainer,
                isLoss && styles.lossContainer,
                isGain && styles.gainContainer,
              ]}>
              <Text variant="titleMedium" style={styles.discrepancyLabel}>
                {discrepancy === 0 ? '无差异' : isLoss ? '盘亏' : '盘盈'}
              </Text>
              <Text
                variant="headlineSmall"
                style={[
                  styles.discrepancyValue,
                  isLoss && styles.lossText,
                  isGain && styles.gainText,
                ]}>
                {discrepancy > 0 ? '+' : ''}{discrepancyInSelectedUnit.toFixed(2)} {unit}
              </Text>
            </View>
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
            numberOfLines={3}
            style={styles.input}
            placeholder="记录差异原因..."
          />
        </View>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!isValid || loading}
          loading={loading}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
          buttonColor={
            discrepancy === 0
              ? undefined
              : isLoss
              ? theme.colors.error
              : '#4CAF50'
          }>
          确认盘点
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const selectAuditLoading = (state: {audit: {loading: boolean}}) =>
  state.audit.loading;

const showToast = (message: string) => ({
  type: 'ui/showToast',
  payload: message,
});

const showError = (message: string) => ({
  type: 'ui/showError',
  payload: {title: '错误', message},
});

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
  input: {
    marginBottom: 12,
  },
  discrepancyContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  lossContainer: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  gainContainer: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  discrepancyLabel: {
    marginBottom: 8,
  },
  discrepancyValue: {
    fontWeight: 'bold',
  },
  lossText: {
    color: '#D32F2F',
  },
  gainText: {
    color: '#2E7D32',
  },
  submitButton: {
    marginTop: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});
