/**
 * OutboundForm Component
 *
 * Form for recording stock outbound (出库) operations.
 * Validates stock availability before allowing outbound.
 */

import React, {useState, useEffect} from 'react';
import {View, StyleSheet, KeyboardAvoidingView, Platform} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Divider,
  useTheme,
  ProgressBar,
} from 'react-native-paper';
import {ScrollView} from 'react-native-gesture-handler';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {executeTransaction, selectSelectedMedicine} from '@/store/slices/inventorySlice';
import {TransactionType, UnitType} from '@/types';
import {UnitSelector} from '@/components/inventory/UnitSelector';
import {convertToBaseUnits, convertFromBaseUnits} from '@/utils/conversion/UnitConverter';

export const OutboundForm: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const selectedMedicine = useAppSelector(selectSelectedMedicine);
  const loading = useAppSelector(selectInventoryLoading);

  const [quantity, setQuantity] = useState('0');
  const [unit, setUnit] = useState<UnitType>('g');
  const [notes, setNotes] = useState('');

  // Calculate stock availability
  const [stockAvailable, setStockAvailable] = useState(true);
  const [requiredStock, setRequiredStock] = useState(0);

  useEffect(() => {
    if (selectedMedicine && quantity) {
      const qty = parseFloat(quantity);
      if (qty > 0) {
        const required = convertToBaseUnits(qty, unit, selectedMedicine.packageSize);
        setRequiredStock(required);
        setStockAvailable(selectedMedicine.currentStock >= required);
      } else {
        setRequiredStock(0);
        setStockAvailable(true);
      }
    }
  }, [selectedMedicine, quantity, unit]);

  // Validate form
  const isValid = selectedMedicine && parseFloat(quantity) > 0 && stockAvailable;

  // Handle submit
  const handleSubmit = async () => {
    if (!isValid || !selectedMedicine) return;

    try {
      await dispatch(
        executeTransaction({
          medicineId: selectedMedicine.id,
          type: TransactionType.OUTBOUND,
          quantity: parseFloat(quantity),
          unit,
          notes,
        }),
      ).unwrap();

      dispatch(
        showToast(`已出库 ${selectedMedicine.name} ${quantity}${unit}`),
      );

      setQuantity('0');
      setNotes('');
    } catch (error) {
      dispatch(showError((error as Error).message));
    }
  };

  // Quick quantity buttons (based on current stock)
  const getQuickQuantities = () => {
    if (!selectedMedicine) return [];
    const stockG = convertFromBaseUnits(selectedMedicine.currentStock, 'g');
    const values = [];
    if (stockG >= 100) values.push('100');
    if (stockG >= 50) values.push('50');
    if (stockG >= 10) values.push('10');
    return values.length > 0 ? values : ['5'];
  };

  if (!selectedMedicine) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyLarge" style={styles.emptyText}>
          请先选择要出库的药品
        </Text>
      </View>
    );
  }

  const quickQuantities = getQuickQuantities();
  const stockPercentage = selectedMedicine.currentStock
    ? (Math.min(requiredStock, selectedMedicine.currentStock) / selectedMedicine.currentStock) * 100
    : 0;

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
            当前库存: {selectedMedicine.displayStock}
          </Text>
        </View>

        <Divider />

        {/* Quantity Input */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            出库数量
          </Text>

          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            label="数量"
            mode="outlined"
            style={styles.input}
            error={!stockAvailable}
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

          {/* Stock Availability Warning */}
          {quantity && !stockAvailable && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                库存不足！当前: {selectedMedicine.currentStock}g，需要: {requiredStock}g
              </Text>
            </View>
          )}

          {/* Stock Progress Bar */}
          {quantity && stockAvailable && requiredStock > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text variant="bodySmall" style={styles.progressLabel}>
                  库存占用
                </Text>
                <Text variant="bodySmall" style={styles.progressValue}>
                  {stockPercentage.toFixed(1)}%
                </Text>
              </View>
              <ProgressBar
                progress={Math.min(stockPercentage / 100, 1)}
                color={stockPercentage > 80 ? theme.colors.error : theme.colors.primary}
              />
            </View>
          )}
        </View>

        {/* Unit Selector */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            单位
          </Text>
          <UnitSelector value={unit} onChange={setUnit} />
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
          buttonColor={stockAvailable ? undefined : theme.colors.error}>
          确认出库
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const selectInventoryLoading = (state: {inventory: {loading: boolean}}) =>
  state.inventory.loading;

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
  warningContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  warningText: {
    color: '#D32F2F',
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    color: '#666',
  },
  progressValue: {
    color: '#666',
  },
  submitButton: {
    marginTop: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});
