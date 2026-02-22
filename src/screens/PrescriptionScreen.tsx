/**
 * PrescriptionScreen Component
 *
 * Screen for prescription-based dispensing (按照药方出库).
 * Allows selecting a prescription and dispensing multiple doses (付数).
 */

import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {
  Text,
  Button,
  Card,
  TextInput,
  useTheme,
  List,
} from 'react-native-paper';
import {MasterDetailLayout} from '@/components/layout/MasterDetailLayout';
import {MedicineList} from '@/components/inventory/MedicineList';
import {VoiceBar} from '@/components/voice/VoiceBar';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {
  loadPrescriptions,
  selectPrescription,
  setDosageCount,
  selectDosageCount,
  clearSelection,
  selectPrescriptionItems,
  loadPrescriptionItems,
  checkPrescriptionAvailability,
  selectIsAvailable,
} from '@/store/slices/prescriptionSlice';
import {executeTransaction} from '@/store/slices/inventorySlice';
import {TransactionType} from '@/types';
import {showToast, showError as showErrorAction} from '@/store/slices/uiSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const PrescriptionScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const prescriptions = useAppSelector(selectPrescriptions);
  const selectedPrescription = useAppSelector(selectSelectedPrescription);
  const dosageCount = useAppSelector(selectDosageCount);
  const items = useAppSelector(selectPrescriptionItems);
  const isAvailable = useAppSelector(selectIsAvailable);

  const [checking, setChecking] = useState(false);

  // Load prescriptions on mount
  useEffect(() => {
    dispatch(loadPrescriptions());
  }, [dispatch]);

  // Load items when prescription is selected
  useEffect(() => {
    if (selectedPrescription) {
      dispatch(loadPrescriptionItems(selectedPrescription.id));
    }
  }, [selectedPrescription, dispatch]);

  // Handle prescription selection
  const handleSelectPrescription = (prescription: any) => {
    dispatch(selectPrescription(prescription));
    dispatch(setDosageCount(1));
  };

  // Handle check availability
  const handleCheckAvailability = async () => {
    if (!selectedPrescription) return;

    setChecking(true);
    try {
      await dispatch(
        checkPrescriptionAvailability({
          prescriptionId: selectedPrescription.id,
          dosageCount,
        }),
      ).unwrap();
    } catch (error) {
      dispatch(showErrorAction((error as Error).message));
    } finally {
      setChecking(false);
    }
  };

  // Handle dispense
  const handleDispense = async () => {
    if (!selectedPrescription || isAvailable === false) {
      return;
    }

    try {
      // Create outbound transactions for each ingredient
      for (const item of items) {
        const requiredQuantity = item.quantity * dosageCount;
        await dispatch(
          executeTransaction({
            medicineId: item.medicineId,
            type: TransactionType.OUTBOUND,
            quantity: requiredQuantity,
            unit: item.medicine.baseUnit,
            referenceId: selectedPrescription.id,
            notes: `${selectedPrescription.name} ${dosageCount}付`,
          }),
        ).unwrap();
      }

      dispatch(
        showToast(`已抓药: ${selectedPrescription.name} ${dosageCount}付`),
      );

      // Reset selection
      dispatch(clearSelection());
    } catch (error) {
      dispatch(showErrorAction((error as Error).message));
    }
  };

  // Render prescription list
  const renderPrescriptionList = () => {
    return (
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text variant="titleMedium">处方列表</Text>
        </View>

        {prescriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              暂无处方
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollList}>
            {prescriptions.map(prescription => (
              <List.Item
                key={prescription.id}
                title={prescription.name}
                description={prescription.description}
                left={props => (
                  <List.Icon {...props} icon="bottle-tonic" />
                )}
                right={props =>
                  selectedPrescription?.id === prescription.id ? (
                    <List.Icon {...props} icon="check" color={theme.colors.primary} />
                  ) : null
                }
                onPress={() => handleSelectPrescription(prescription)}
                style={[
                  styles.listItem,
                  selectedPrescription?.id === prescription.id && styles.selectedListItem,
                ]}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  // Render prescription details
  const renderPrescriptionDetails = () => {
    if (!selectedPrescription) {
      return (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            请选择处方
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.detailsContainer}>
        <Card style={styles.prescriptionCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.prescriptionName}>
              {selectedPrescription.name}
            </Text>
            {selectedPrescription.description && (
              <Text variant="bodyMedium" style={styles.prescriptionDescription}>
                {selectedPrescription.description}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Dosage Count Input */}
        <View style={styles.dosageContainer}>
          <Text variant="titleMedium" style={styles.dosageLabel}>
            付数
          </Text>
          <View style={styles.dosageInputRow}>
            <Button
              mode="outlined"
              onPress={() => dispatch(setDosageCount(Math.max(1, dosageCount - 1)))}
              disabled={dosageCount <= 1}>
              -
            </Button>
            <TextInput
              value={String(dosageCount)}
              onChangeText={(text) => {
                const value = parseInt(text, 10);
                if (!isNaN(value) && value > 0) {
                  dispatch(setDosageCount(value));
                }
              }}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.dosageInput}
              contentStyle={styles.dosageInputContent}
            />
            <Button
              mode="outlined"
              onPress={() => dispatch(setDosageCount(dosageCount + 1))}>
              +
            </Button>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.ingredientsContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            成份
          </Text>
          {items.map((item, index) => {
            const totalRequired = item.quantity * dosageCount;
            const hasEnough = item.medicine.currentStock >= totalRequired;

            return (
              <View key={item.id} style={styles.ingredientItem}>
                <View style={styles.ingredientHeader}>
                  <Text variant="bodyMedium" style={styles.ingredientName}>
                    {item.medicine.name}
                  </Text>
                  <View
                    style={[
                      styles.stockBadge,
                      {backgroundColor: hasEnough ? '#E8F5E9' : '#FFEBEE'},
                    ]}>
                    <Text
                      variant="labelSmall"
                      style={{color: hasEnough ? '#2E7D32' : '#D32F2F'}}>
                      {hasEnough ? '充足' : '不足'}
                    </Text>
                  </View>
                </View>
                <View style={styles.ingredientDetails}>
                  <Text variant="bodySmall} style={styles.ingredientLabel}>
                    每付: {item.quantity}{item.unit}
                  </Text>
                  <Text variant="bodySmall} style={styles.ingredientLabel}>
                    需要: {totalRequired}{item.medicine.baseUnit}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.ingredientStock,
                      {color: hasEnough ? '#2E7D32' : '#D32F2F'},
                    ]}>
                    库存: {item.medicine.currentStock}{item.medicine.baseUnit}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            mode="outlined"
            onPress={handleCheckAvailability}
            disabled={checking || !items.length}
            loading={checking}
            style={styles.actionButton}>
            检查库存
          </Button>
          <Button
            mode="contained"
            onPress={handleDispense}
            disabled={isAvailable === false || checking}
            style={styles.actionButton}
            buttonColor={isAvailable === true ? theme.colors.primary : undefined}>
            确认抓药
          </Button>
        </View>

        {isAvailable === false && (
          <Card style={styles.warningCard}>
            <Card.Content>
              <View style={styles.warningRow}>
                <Icon name="alert-circle" size={24} color="#D32F2F" />
                <Text variant="bodyMedium" style={styles.warningText}>
                  库存不足，无法完成抓药
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <MasterDetailLayout
        master={renderPrescriptionList()}
        detail={renderPrescriptionDetails()}
      />

      <VoiceBar />
    </View>
  );
};

const selectSelectedPrescription = (state: {
  prescription: {selectedPrescription?: {id: string}};
}) => state.prescription.selectedPrescription;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  scrollList: {
    flex: 1,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedListItem: {
    backgroundColor: '#E0F2F1',
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
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  prescriptionCard: {
    marginBottom: 16,
  },
  prescriptionName: {
    fontWeight: 'bold',
  },
  prescriptionDescription: {
    color: '#666',
    marginTop: 8,
  },
  dosageContainer: {
    marginBottom: 16,
  },
  dosageLabel: {
    marginBottom: 8,
  },
  dosageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dosageInput: {
    flex: 1,
  },
  dosageInputContent: {
    textAlign: 'center',
  },
  ingredientsContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  ingredientItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientName: {
    fontWeight: '600',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ingredientDetails: {
    gap: 2,
  },
  ingredientLabel: {
    color: '#666',
  },
  ingredientStock: {
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  warningCard: {
    marginTop: 16,
    backgroundColor: '#FFEBEE',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    color: '#D32F2F',
  },
});
