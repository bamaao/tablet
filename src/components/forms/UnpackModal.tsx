/**
 * UnpackModal Component
 *
 * Modal for bulk breaking/unpacking operations (拆包).
 * Converts packaged medicine to loose units (e.g., 1包 → 500g).
 */

import React, {useState, useEffect} from 'react';
import {View, StyleSheet, KeyboardAvoidingView, Platform} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Divider,
  Dialog,
  Portal,
  useTheme,
} from 'react-native-paper';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {executeTransaction, selectSelectedMedicine} from '@/store/slices/inventorySlice';
import {TransactionType, UnitType, Medicine} from '@/types';
import {convertToBaseUnits, calculateUnpack, canUnpack} from '@/utils/conversion/UnitConverter';

interface UnpackModalProps {
  /**
   * Is the modal visible
   */
  visible: boolean;

  /**
   * Callback when modal is dismissed
   */
  onDismiss: () => void;

  /**
   * Optional medicine to pre-select
   */
  medicine?: Medicine;
}

export const UnpackModal: React.FC<UnpackModalProps> = ({
  visible,
  onDismiss,
  medicine: propMedicine,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const selectedMedicine = useAppSelector(selectSelectedMedicine);
  const loading = useAppSelector(selectInventoryLoading);

  // Use prop medicine if provided, otherwise use selected medicine from store
  const medicine = propMedicine || selectedMedicine;

  const [packagesToUnpack, setPackagesToUnpack] = useState('0');
  const [notes, setNotes] = useState('');

  // Calculate unpack result
  const [unpackResult, setUnpackResult] = useState<{
    packagedStock: number;
    looseStock: number;
    unpackedAmount: number;
  } | null>(null);

  useEffect(() => {
    if (medicine && packagesToUnpack) {
      const packages = parseFloat(packagesToUnpack);
      if (packages > 0 && medicine.packagedStock >= packages) {
        const result = calculateUnpack(
          medicine.packagedStock,
          packages,
          medicine.packageSize,
          medicine.looseStock,
        );
        setUnpackResult(result);
      } else {
        setUnpackResult(null);
      }
    } else {
      setUnpackResult(null);
    }
  }, [medicine, packagesToUnpack]);

  // Validate form
  const isValid =
    medicine &&
    parseFloat(packagesToUnpack) > 0 &&
    unpackResult !== null;

  // Handle submit
  const handleSubmit = async () => {
    if (!isValid || !medicine) return;

    try {
      await dispatch(
        executeTransaction({
          medicineId: medicine.id,
          type: TransactionType.UNPACK,
          quantity: parseFloat(packagesToUnpack),
          unit: '包',
          notes,
        }),
      ).unwrap();

      dispatch(
        showToast(`已拆包 ${medicine.name} ${packagesToUnpack}包`),
      );

      // Reset and close
      setPackagesToUnpack('0');
      setNotes('');
      onDismiss();
    } catch (error) {
      dispatch(showError((error as Error).message));
    }
  };

  if (!medicine) {
    return (
      <Portal>
        <Dialog visible={visible} onDismiss={onDismiss}>
          <Dialog.Title>无法拆包</Dialog.Title>
          <Dialog.Content>
            <Text>请先选择要拆包的药品</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={onDismiss}>关闭</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  }

  const packagesToUnpackNum = parseFloat(packagesToUnpack) || 0;
  const canUnpackPackages = canUnpack(medicine.packagedStock, packagesToUnpackNum);

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={styles.dialog}>
        <Dialog.Title>拆包 - {medicine.name}</Dialog.Title>

        <Dialog.Content style={styles.content}>
          {/* Current Stock Info */}
          <View style={styles.stockInfo}>
            <View style={styles.stockRow}>
              <Text variant="bodyMedium">包装库存:</Text>
              <Text variant="bodyMedium" style={styles.stockValue}>
                {medicine.packagedStock} {medicine.packageUnit}
              </Text>
            </View>
            <View style={styles.stockRow}>
              <Text variant="bodyMedium">散装库存:</Text>
              <Text variant="bodyMedium" style={styles.stockValue}>
                {medicine.looseStock} {medicine.baseUnit}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.stockRow}>
              <Text variant="bodyMedium" style={styles.totalLabel}>
                每包规格:
              </Text>
              <Text variant="bodyMedium" style={styles.stockValue}>
                {medicine.packageSize} {medicine.baseUnit}
              </Text>
            </View>
          </View>

          {/* Input */}
          <TextInput
            value={packagesToUnpack}
            onChangeText={setPackagesToUnpack}
            keyboardType="number-pad"
            label="拆包数量"
            mode="outlined"
            style={styles.input}
            error={packagesToUnpackNum > medicine.packagedStock}
            autoFocus
          />

          {/* Quick buttons */}
          <View style={styles.quickButtons}>
            <Button
              mode="outlined"
              onPress={() => setPackagesToUnpack('1')}
              disabled={medicine.packagedStock < 1}
              style={styles.quickButton}>
              1包
            </Button>
            <Button
              mode="outlined"
              onPress={() => setPackagesToUnpack('2')}
              disabled={medicine.packagedStock < 2}
              style={styles.quickButton}>
              2包
            </Button>
            <Button
              mode="outlined"
              onPress={() => setPackagesToUnpack(String(medicine.packagedStock))}
              style={styles.quickButton}>
              全部
            </Button>
          </View>

          {/* Warning */}
          {packagesToUnpackNum > 0 && !canUnpackPackages && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                包装库存不足！当前只有 {medicine.packagedStock} 包
              </Text>
            </View>
          )}

          {/* Result Preview */}
          {unpackResult && (
            <View style={styles.previewContainer}>
              <Text variant="titleSmall" style={styles.previewTitle}>
                拆包后库存预览:
              </Text>
              <View style={styles.previewRow}>
                <Text variant="bodyMedium">包装库存:</Text>
                <Text variant="bodyMedium" style={styles.previewValue}>
                  {unpackResult.packagedStock} 包
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text variant="bodyMedium">散装库存:</Text>
                <Text variant="bodyMedium" style={styles.previewValue}>
                  {unpackResult.looseStock} {medicine.baseUnit}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text variant="bodyMedium" style={styles.totalLabel}>
                  本次拆出:
                </Text>
                <Text variant="bodyMedium" style={styles.previewHighlight}>
                  +{unpackResult.unpackedAmount} {medicine.baseUnit}
                </Text>
              </View>
            </View>
          )}

          {/* Notes */}
          <TextInput
            value={notes}
            onChangeText={setNotes}
            label="备注（可选）"
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.input}
          />
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={loading}>
            取消
          </Button>
          <Button
            onPress={handleSubmit}
            disabled={!isValid || loading}
            mode="contained"
            loading={loading}>
            确认拆包
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
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
  dialog: {
    maxHeight: '80%',
  },
  content: {
    maxHeight: 500,
  },
  stockInfo: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stockValue: {
    fontWeight: '600',
  },
  totalLabel: {
    fontWeight: '600',
  },
  divider: {
    marginVertical: 8,
  },
  input: {
    marginBottom: 12,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickButton: {
    flex: 1,
  },
  warningContainer: {
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F44336',
    marginBottom: 12,
  },
  warningText: {
    color: '#D32F2F',
    fontSize: 12,
  },
  previewContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  previewTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#2E7D32',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewValue: {
    fontWeight: '500',
  },
  previewHighlight: {
    fontWeight: '600',
    color: '#2E7D32',
  },
  totalLabel: {
    fontWeight: '600',
  },
});
