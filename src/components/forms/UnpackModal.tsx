/**
 * UnpackModal Component
 *
 * Modal for bulk breaking/unpacking operations (拆包).
 * Redesigned according to UI prototype with purple theme (#7B1FA2).
 * Converts packaged medicine to loose units (e.g., 1包 → 500g).
 */

import React, {useState, useEffect, useMemo} from 'react';
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
  Card,
} from 'react-native-paper';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {
  executeTransaction,
  selectSelectedMedicine,
  selectInventoryLoading,
  selectPackagedStockBySize,
} from '@/store/slices/inventorySlice';
import {TransactionType, UnitType, Medicine} from '@/types';
import {convertToBaseUnits, calculateUnpack, canUnpack} from '@/utils/conversion/UnitConverter';
import {showToast, showError} from '@/store/slices/uiSlice';

// Theme colors (Purple theme)
const COLORS = {
  primary: '#7B1FA2',     // Purple
  background: '#F3E5F5',  // Light purple
  success: '#00A67D',     // Green
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
  white: '#FFFFFF',
  error: '#F44336',
};

interface UnpackModalProps {
  visible: boolean;
  onDismiss: () => void;
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
  const packagedStockBySizeRaw = useAppSelector(state =>
    medicine ? selectPackagedStockBySize(state, medicine.id) : []
  );

  // Memoize to prevent infinite loops
  const packagedStockBySize = useMemo(() => packagedStockBySizeRaw, [JSON.stringify(packagedStockBySizeRaw)]);

  const [packagesToUnpack, setPackagesToUnpack] = useState('0');
  const [selectedPackageSize, setSelectedPackageSize] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  // Reset when medicine changes
  useEffect(() => {
    if (medicine) {
      setPackagesToUnpack('0');
      setSelectedPackageSize(null);
      setNotes('');
    }
  }, [medicine?.id]);

  // Calculate unpack result
  const unpackResult = useMemo(() => {
    if (medicine && packagesToUnpack) {
      const packages = parseFloat(packagesToUnpack);
      const effectivePackageSize = selectedPackageSize || medicine.packageSize;

      // Find available packages for selected size
      const availablePackages = selectedPackageSize
        ? packagedStockBySize.find(s => s.packageSize === selectedPackageSize)?.count || 0
        : medicine.packagedStock;

      if (packages > 0 && availablePackages >= packages) {
        return calculateUnpack(
          availablePackages,
          packages,
          effectivePackageSize,
          medicine.looseStock,
        );
      }
    }
    return null;
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
        <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>无法拆包</Dialog.Title>
          <Dialog.Content>
            <Text>请先选择要拆包的药品</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={onDismiss} textColor={COLORS.primary}>关闭</Button>
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
        <Dialog.Title style={styles.dialogTitle}>拆包 - {medicine.name}</Dialog.Title>

        <Dialog.Content style={styles.content}>
          {/* Current Stock Info */}
          <View style={styles.stockInfoSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>当前库存</Text>
            <View style={styles.stockGrid}>
              {/* Display packaged stock by specification */}
              {packagedStockBySize.length > 0 ? (
                packagedStockBySize.map(({ packageSize, count }) => (
                  <View key={packageSize} style={styles.stockItem}>
                    <Text variant="bodyMedium" style={styles.stockLabel}>
                      {packageSize}g/包
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
                    {medicine.packagedStock}{medicine.packageUnit}
                  </Text>
                </View>
              )}
              <View style={styles.stockItem}>
                <Text variant="bodyMedium" style={styles.stockLabel}>
                  散装
                </Text>
                <Text variant="titleMedium" style={[styles.stockValue, {color: COLORS.success}]}>
                  {medicine.looseStock}{medicine.baseUnit}
                </Text>
              </View>
            </View>
          </View>

          <Divider style={styles.divider} />

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
          <Text variant="titleMedium" style={styles.sectionTitle}>拆包数量 (包)</Text>
          <TextInput
            value={packagesToUnpack}
            onChangeText={setPackagesToUnpack}
            keyboardType="number-pad"
            mode="outlined"
            style={styles.input}
            placeholder="输入要拆的包数"
            placeholderTextColor={COLORS.textLight}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            error={packagesToUnpackNum > availablePackages}
            autoFocus
            selectTextOnFocus
          />

          {/* Quick buttons */}
          <View style={styles.quickButtons}>
            <Button
              mode="outlined"
              onPress={() => setPackagesToUnpack('1')}
              disabled={availablePackages < 1}
              style={styles.quickButton}
              textColor={COLORS.primary}>
              1包
            </Button>
            <Button
              mode="outlined"
              onPress={() => setPackagesToUnpack('2')}
              disabled={availablePackages < 2}
              style={styles.quickButton}
              textColor={COLORS.primary}>
              2包
            </Button>
            <Button
              mode="outlined"
              onPress={() => setPackagesToUnpack(String(availablePackages))}
              style={styles.quickButton}
              textColor={COLORS.primary}>
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
            <Card style={styles.previewCard}>
              <Card.Content>
                <Text variant="titleSmall" style={styles.previewTitle}>
                  拆包后库存预览
                </Text>
                <View style={styles.previewRow}>
                  <Text variant="bodyMedium" style={styles.previewLabel}>包装库存:</Text>
                  <Text variant="bodyMedium" style={styles.previewValue}>
                    {unpackResult.packagedStock} 包 {selectedPackageSize ? `(${selectedPackageSize}g规格)` : ''}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text variant="bodyMedium" style={styles.previewLabel}>散装库存:</Text>
                  <Text variant="bodyMedium" style={styles.previewValue}>
                    {unpackResult.looseStock} {medicine.baseUnit}
                  </Text>
                </View>
                <Divider style={styles.previewDivider} />
                <View style={styles.previewRow}>
                  <Text variant="bodyMedium" style={styles.previewLabel}>本次拆出:</Text>
                  <Text variant="titleMedium" style={styles.previewHighlight}>
                    +{unpackResult.unpackedAmount} {medicine.baseUnit}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Notes */}
          <View style={styles.notesSection}>
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
        </Dialog.Content>

        <Dialog.Actions style={styles.dialogActions}>
          <Button onPress={onDismiss} disabled={loading} textColor={COLORS.textSecondary}>
            取消
          </Button>
          <Button
            onPress={handleSubmit}
            disabled={!isValid || loading}
            mode="contained"
            loading={loading}
            buttonColor={COLORS.primary}
            contentStyle={styles.submitButtonContent}>
            确认拆包
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '85%',
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
  dialogTitle: {
    color: COLORS.primary,
  },
  content: {
    paddingHorizontal: 24,
  },
  // Stock Info Section
  stockInfoSection: {
    marginBottom: 16,
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
    minWidth: 90,
    alignItems: 'center',
  },
  stockLabel: {
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  stockValue: {
    fontWeight: '600',
  },
  divider: {
    marginVertical: 16,
  },
  // Section
  section: {
    marginTop: 16,
    marginBottom: 16,
  },
  // Segmented Buttons
  segmentedButtons: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 12,
  },
  // Input
  input: {
    backgroundColor: COLORS.white,
    marginBottom: 12,
    marginTop: 8,
  },
  // Quick Buttons
  quickButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  quickButton: {
    flex: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
  },
  // Warning
  warningContainer: {
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
    marginBottom: 12,
  },
  warningText: {
    color: COLORS.error,
    fontSize: 12,
  },
  // Preview Card
  previewCard: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  previewTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: '#1B5E20',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontWeight: '500',
  },
  previewDivider: {
    marginVertical: 8,
    backgroundColor: '#A5D6A',
  },
  previewHighlight: {
    fontWeight: '600',
    color: '#1B5E20',
  },
  // Notes Section
  notesSection: {
    marginTop: 8,
  },
  notesInput: {
    backgroundColor: COLORS.white,
    minHeight: 60,
  },
  // Dialog Actions
  dialogActions: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 16,
  },
  submitButtonContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
});
