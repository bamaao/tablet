/**
 * InboundForm Component
 *
 * Form for recording stock incoming (入库) operations.
 * Allows user to input quantity and select unit.
 */

import React, {useState} from 'react';
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
import {executeTransaction, selectSelectedMedicine} from '@/store/slices/inventorySlice';
import {TransactionType, UnitType, Medicine} from '@/types';
import {UnitSelector} from '@/components/inventory/UnitSelector';
import {showToast} from '@/store/slices/uiSlice';

export const InboundForm: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const selectedMedicine = useAppSelector(selectSelectedMedicine);
  const loading = useAppSelector(selectInventoryLoading);

  const [quantity, setQuantity] = useState('0');
  const [unit, setUnit] = useState<UnitType>('包');
  const [notes, setNotes] = useState('');

  // Validate form
  const isValid = selectedMedicine && parseFloat(quantity) > 0;

  // Handle submit
  const handleSubmit = async () => {
    if (!isValid || !selectedMedicine) return;

    try {
      await dispatch(
        executeTransaction({
          medicineId: selectedMedicine.id,
          type: TransactionType.INBOUND,
          quantity: parseFloat(quantity),
          unit,
          notes,
        }),
      ).unwrap();

      // Show success message
      dispatch(
        showToast(`已入库 ${selectedMedicine.name} ${quantity}${unit}`),
      );

      // Reset form
      setQuantity('0');
      setNotes('');
    } catch (error) {
      dispatch(showError((error as Error).message));
    }
  };

  // Quick quantity buttons
  const quickQuantities = ['1', '5', '10'];

  if (!selectedMedicine) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyLarge" style={styles.emptyText}>
          请先选择要入库的药品
        </Text>
      </View>
    );
  }

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
            当前库存: {selectedMedicine.displayStock}
          </Text>
        </View>

        <Divider />

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
          contentStyle={styles.submitButtonContent}>
          确认入库
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const selectInventoryLoading = (state: {inventory: {loading: boolean}}) =>
  state.inventory.loading;
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
  submitButton: {
    marginTop: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});
