/**
 * OutboundForm Component
 *
 * Form for recording stock outbound (出库) operations.
 * Supports both packaged and loose stock removal with proper validation.
 */

import React, {useState, useEffect, useMemo} from 'react';
import {View, StyleSheet, KeyboardAvoidingView, Platform} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Divider,
  SegmentedButtons,
  ProgressBar,
  useTheme,
  Card,
} from 'react-native-paper';
import {ScrollView} from 'react-native-gesture-handler';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {
  executeTransaction,
  selectSelectedMedicine,
  selectInventoryLoading,
  selectPackagedStockBySize,
  PackagedStockBySize,
} from '@/store/slices/inventorySlice';
import {TransactionType, UnitType} from '@/types';
import {
  convertToBaseUnits,
  convertFromBaseUnits,
} from '@/utils/conversion/UnitConverter';
import {showToast, showError} from '@/store/slices/uiSlice';
import {
  calculateOptimalOutboundPlan,
  formatOutboundPlan,
  getOutboundPlanSummary,
} from '@/utils/conversion/OutboundCalculator';

export const OutboundForm: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const selectedMedicine = useAppSelector(selectSelectedMedicine);
  const loading = useAppSelector(selectInventoryLoading);

  // Get packaged stock grouped by size
  const packagedStockBySize = useAppSelector(state =>
    selectedMedicine ? selectPackagedStockBySize(state, selectedMedicine.id) : [],
  );

  // Outbound mode: simple (traditional) or smart (intelligent mixed outbound)
  const [outboundMode, setOutboundMode] = useState<'simple' | 'smart'>('smart');

  const [quantity, setQuantity] = useState('0');
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
      setQuantity('0'); // Reset quantity when changing type
    }
  }, [stockType, selectedMedicine]);

  // Calculate stock availability
  const [stockAvailable, setStockAvailable] = useState(true);
  const [requiredStock, setRequiredStock] = useState(0);

  useEffect(() => {
    if (selectedMedicine && quantity) {
      const qty = parseFloat(quantity);
      if (qty > 0) {
        const baseQty = convertToBaseUnits(qty, unit, selectedMedicine.packageSize);

        if (stockType === 'packaged') {
          // Check packaged stock availability
          setStockAvailable(selectedMedicine.packagedStock >= qty);
          setRequiredStock(qty); // Package count
        } else {
          // Check loose stock availability
          setStockAvailable(selectedMedicine.looseStock >= baseQty);
          setRequiredStock(baseQty); // Base units
        }
      } else {
        setStockAvailable(true);
        setRequiredStock(0);
      }
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

      const plan = calculateOptimalOutboundPlan(
        packagedStockBySize,
        selectedMedicine.looseStock,
        requiredQty,
        'optimal',
      );

      return plan;
    }
    return null;
  }, [outboundMode, selectedMedicine, quantity, unit, packagedStockBySize]);

  // Get plan summary for smart mode
  const planSummary = useMemo(() => {
    if (outboundPlan && outboundPlan.isFeasible) {
      return getOutboundPlanSummary(outboundPlan);
    }
    return null;
  }, [outboundPlan]);

  // Validate form
  const isValid = useMemo(() => {
    if (!selectedMedicine || parseFloat(quantity) <= 0) {
      return false;
    }

    if (outboundMode === 'smart') {
      // For smart mode, check if plan is feasible
      return outboundPlan?.isFeasible || false;
    } else {
      // For simple mode, check stock availability
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
          await dispatch(
            executeTransaction({
              medicineId: selectedMedicine.id,
              type: TransactionType.OUTBOUND,
              quantity: item.quantity,
              unit: item.unit,
              packageSize: item.packageSize ?? undefined,
              notes: `智能出库 - ${notes}`,
            }),
          ).unwrap();
        }

        // Format summary for toast
        const summary = formatOutboundPlan(outboundPlan);
        dispatch(showToast(`已出库 ${selectedMedicine.name} - ${summary}`));

        setQuantity('0');
        setNotes('');
      } else {
        // Simple mode: Traditional single transaction
        await dispatch(
          executeTransaction({
            medicineId: selectedMedicine.id,
            type: TransactionType.OUTBOUND,
            quantity: parseFloat(quantity),
            unit,
            notes: `${stockType === 'packaged' ? '包装' : '散装'}出库 - ${notes}`,
          }),
        ).unwrap();

        dispatch(showToast(`已出库 ${selectedMedicine.name} ${quantity}${unit}`));

        setQuantity('0');
        setNotes('');
      }
    } catch (error) {
      dispatch(showError((error as Error).message));
    }
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

  const currentStock = stockType === 'packaged'
    ? selectedMedicine.packagedStock
    : selectedMedicine.looseStock;

  const currentStockDisplay = stockType === 'packaged'
    ? `${selectedMedicine.packagedStock}${selectedMedicine.packageUnit}`
    : `${selectedMedicine.looseStock}${selectedMedicine.baseUnit}`;

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
        keyboardShouldPersistTaps="handled">
        {/* Medicine Info */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {selectedMedicine.name}
          </Text>
          <Text variant="bodyMedium" style={styles.sectionSubtitle}>
            规格: {selectedMedicine.packageSize}{selectedMedicine.baseUnit}/{selectedMedicine.packageUnit}
          </Text>
          <View style={styles.stockInfoRow}>
            <Text variant="bodyMedium" style={styles.stockLabel}>
              散装库存: {selectedMedicine.looseStock}{selectedMedicine.baseUnit}
            </Text>
          </View>
          {/* Display packaged stock by specification */}
          {packagedStockBySize.length > 0 ? (
            <View style={styles.packageSpecContainer}>
              <Text variant="bodyMedium" style={styles.stockLabel}>
                包装库存:
              </Text>
              {packagedStockBySize.map(({ packageSize, count }) => (
                <Text key={packageSize} variant="bodyMedium" style={styles.packageSpecText}>
                  • {packageSize}g/包 × {count}包
                </Text>
              ))}
            </View>
          ) : (
            <Text variant="bodyMedium" style={styles.stockLabel}>
              包装库存: {selectedMedicine.packagedStock}{selectedMedicine.packageUnit}
            </Text>
          )}
        </View>

        <Divider />

        {/* Outbound Mode Selection */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            出库模式
          </Text>
          <SegmentedButtons
            value={outboundMode}
            onValueChange={(value) => setOutboundMode(value as 'simple' | 'smart')}
            buttons={[
              {
                label: '简单模式',
                value: 'simple',
              },
              {
                label: '智能模式',
                value: 'smart',
              },
            ]}
            style={styles.segmentedButtons}
          />
          <Text variant="bodySmall" style={styles.modeDescription}>
            {outboundMode === 'simple'
              ? '简单模式：手动选择出库类型（包装/散装）'
              : '智能模式：自动计算最优包装组合，支持多规格混合出库'}
          </Text>
        </View>

        {/* Stock Type Selection - Only show in simple mode */}
        {outboundMode === 'simple' && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              出库类型
            </Text>
            <SegmentedButtons
              value={stockType}
              onValueChange={(value) => setStockType(value as 'packaged' | 'loose')}
              buttons={[
                {
                  label: `散装出库`,
                  value: 'loose',
                  disabled: selectedMedicine.looseStock === 0,
                },
                {
                  label: `包装出库`,
                  value: 'packaged',
                  disabled: selectedMedicine.packagedStock === 0,
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
          </Text>

          <Text variant="bodySmall" style={styles.availableStock}>
            当前可用: {currentStockDisplay}
          </Text>

          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            label="数量"
            mode="outlined"
            style={styles.input}
            error={!stockAvailable && quantity !== '0'}
            autoFocus
          />

          {/* Quick Quantity Buttons */}
          <View style={styles.quickButtons}>
            {quickQuantities.slice(0, 3).map(q => (
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
                        {item.packageSize
                          ? `• ${item.packageSize}g/包 × ${item.quantity}包`
                          : `• ${item.quantity}g散装`}
                      </Text>
                    ))}
                    <Divider style={styles.planDivider} />
                    <Text variant="bodyMedium" style={styles.planTotal}>
                      总计: {outboundPlan.items.reduce((sum, i) => sum + i.quantityInBaseUnits, 0)}g
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
                : `散装单位`}
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
          contentStyle={styles.submitButtonContent}
          buttonColor={
            outboundMode === 'smart'
              ? outboundPlan?.isFeasible
                ? undefined
                : theme.colors.error
              : stockAvailable
              ? undefined
              : theme.colors.error
          }>
          确认出库
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
  stockInfoRow: {
    gap: 4,
  },
  stockLabel: {
    color: '#666',
  },
  packageSpecContainer: {
    gap: 2,
  },
  packageSpecText: {
    color: '#666',
    marginLeft: 12,
    fontSize: 12,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  modeDescription: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  availableStock: {
    color: '#00695C',
    marginBottom: 8,
    fontWeight: '500',
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
  unitInfo: {
    color: '#666',
  },
  planPreviewContainer: {
    marginTop: 16,
  },
  planCard: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  planTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#2E7D32',
  },
  planItem: {
    marginBottom: 4,
    color: '#1B5E20',
  },
  planDivider: {
    marginTop: 8,
    marginBottom: 8,
  },
  planTotal: {
    fontWeight: '600',
    color: '#1B5E20',
  },
  submitButton: {
    marginTop: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});
