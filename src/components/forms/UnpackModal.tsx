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
  SegmentedButtons,
} from 'react-native-paper';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {executeTransaction, selectSelectedMedicine, selectInventoryLoading, selectPackagedStockBySize, PackagedStockBySize} from '@/store/slices/inventorySlice';
import {TransactionType, UnitType, Medicine} from '@/types';
import {convertToBaseUnits, calculateUnpack, canUnpack} from '@/utils/conversion/UnitConverter';
import {showToast, showError} from '@/store/slices/uiSlice';

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

  // Get packaged stock grouped by size
  const packagedStockBySize = useAppSelector(state =>
    medicine ? selectPackagedStockBySize(state, medicine.id) : []
  );

  const [packagesToUnpack, setPackagesToUnpack] = useState('0');
  const [selectedPackageSize, setSelectedPackageSize] = useState<number | null>(null);
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
      const effectivePackageSize = selectedPackageSize || medicine.packageSize;

      // Find available packages for selected size
      const availablePackages = selectedPackageSize
        ? packagedStockBySize.find(s => s.packageSize === selectedPackageSize)?.count || 0
        : medicine.packagedStock;

      if (packages > 0 && availablePackages >= packages) {
        const result = calculateUnpack(
          availablePackages,
          packages,
          effectivePackageSize,
          medicine.looseStock,
        );
        setUnpackResult(result);
      } else {
        setUnpackResult(null);
      }
    } else {
      setUnpackResult(null);
    }
  }, [medicine, packagesToUnpack, selectedPackageSize, packagedStockBySize]);

  // Validate form
  const isValid =
    medicine &&
    parseFloat(packagesToUnpack) > 0 &&
    unpackResult !== null &&
    (packagedStockBySize.length > 0 ? selectedPackageSize !== null : true);

  // Handle submit
  const handleSubmit = async () => {
    if (!isValid || !medicine) return;

    try {
      const txnParams: any = {
        medicineId: medicine.id,
        type: TransactionType.UNPACK,
        quantity: parseFloat(packagesToUnpack),
        unit: '包',
        notes,
      };

      // Add packageSize if specified
      if (selectedPackageSize) {
        txnParams.packageSize = selectedPackageSize;
      }

      await dispatch(executeTransaction(txnParams)).unwrap();

      const spec = selectedPackageSize ? `${selectedPackageSize}g` : '';
      dispatch(
        showToast(`已拆包 ${medicine.name} ${packagesToUnpack}包${spec ? ` (${spec})` : ''}`),
      );

      // Reset and close
      setPackagesToUnpack('0');
      setSelectedPackageSize(null);
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
  const effectivePackageSize = selectedPackageSize || medicine.packageSize;
  const availablePackages = selectedPackageSize
    ? packagedStockBySize.find(s => s.packageSize === selectedPackageSize)?.count || 0
    : medicine.packagedStock;
  const canUnpackPackages = canUnpack(availablePackages, packagesToUnpackNum);

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
              <Text variant="bodyMedium">散装库存:</Text>
              <Text variant="bodyMedium" style={styles.stockValue}>
                {medicine.looseStock} {medicine.baseUnit}
              </Text>
            </View>

            {/* Display packaged stock by specification */}
            {packagedStockBySize.length > 0 ? (
              <>
                <Text variant="bodyMedium" style={styles.totalLabel}>
                  包装库存:
                </Text>
                {packagedStockBySize.map(({ packageSize, count }) => (
                  <View key={packageSize} style={styles.stockRow}>
                    <Text variant="bodySmall" style={styles.packageSpecLabel}>
                      • {packageSize}g/包
                    </Text>
                    <Text variant="bodyMedium" style={styles.stockValue}>
                      {count} 包
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.stockRow}>
                <Text variant="bodyMedium">包装库存:</Text>
                <Text variant="bodyMedium" style={styles.stockValue}>
                  {medicine.packagedStock} {medicine.packageUnit}
                </Text>
              </View>
            )}
          </View>

          {/* Package Size Selection (if multiple specs) */}
          {packagedStockBySize.length > 1 && (
            <View style={styles.section}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                选择要拆的包装规格
              </Text>
              <SegmentedButtons
                value={selectedPackageSize?.toString() || ''}
                onValueChange={(value) => setSelectedPackageSize(value ? Number(value) : null)}
                buttons={[
                  { label: '默认', value: medicine.packageSize.toString() },
                  ...packagedStockBySize.map(({ packageSize, count }) => ({
                    label: `${packageSize}g`,
                    value: packageSize.toString(),
                  }))
                ]}
                style={styles.segmentedButtons}
              />
            </View>
          )}

          {/* Input */}
          <TextInput
            value={packagesToUnpack}
            onChangeText={setPackagesToUnpack}
            keyboardType="number-pad"
            label="拆包数量"
            mode="outlined"
            style={styles.input}
            error={packagesToUnpackNum > availablePackages}
            autoFocus
          />

          {/* Quick buttons */}
          <View style={styles.quickButtons}>
            <Button
              mode="outlined"
              onPress={() => setPackagesToUnpack('1')}
              disabled={availablePackages < 1}
              style={styles.quickButton}>
              1包
            </Button>
            <Button
              mode="outlined"
              onPress={() => setPackagesToUnpack('2')}
              disabled={availablePackages < 2}
              style={styles.quickButton}>
              2包
            </Button>
            <Button
              mode="outlined"
              onPress={() => setPackagesToUnpack(String(availablePackages))}
              style={styles.quickButton}>
              全部
            </Button>
          </View>

          {/* Warning */}
          {packagesToUnpackNum > 0 && !canUnpackPackages && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                包装库存不足！当前只有 {availablePackages} 包 {selectedPackageSize ? `(${selectedPackageSize}g规格)` : ''}
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
                  {unpackResult.packagedStock} 包 {selectedPackageSize ? `(${selectedPackageSize}g规格)` : ''}
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
            keyboardType="default"
            autoCorrect={true}
            autoCapitalize="sentences"
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
  packageSpecLabel: {
    color: '#666',
    marginLeft: 8,
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
  section: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
});
