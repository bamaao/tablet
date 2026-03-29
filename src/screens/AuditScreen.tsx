/**
 * AuditScreen Component
 *
 * Three-column audit interface for inventory stocktaking.
 * - Left: Audit checklist
 * - Center: Input form with voice support
 * - Right: Real-time discrepancy display
 */

import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  List,
  FAB,
} from 'react-native-paper';
import {FlashList} from '@shopify/flash-list';
import {TableSplitView} from '@/components/layout/TableSplitView';
import {AuditForm} from '@/components/forms/AuditForm';
import {VoiceBar} from '@/components/voice/VoiceBar';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {
  loadMedicines,
  selectMedicinesSorted,
  selectSelectedMedicine,
  selectMedicine,
} from '@/store/slices/inventorySlice';
import {
  startAuditSession,
  completeAuditSession,
  selectCurrentSession,
  selectDiscrepancies,
} from '@/store/slices/auditSlice';
import {Medicine} from '@/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const AuditScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const medicines = useAppSelector(selectMedicinesSorted);
  const selectedMedicine = useAppSelector(selectSelectedMedicine);
  const currentSession = useAppSelector(selectCurrentSession);
  const discrepancies = useAppSelector(selectDiscrepancies);

  const [auditedMedicines, setAuditedMedicines] = useState<Set<string>>(new Set());

  // Start a new audit session
  const handleStartAudit = () => {
    const medicineIds = medicines.map(m => m.id);
    dispatch(startAuditSession(medicineIds));
    setAuditedMedicines(new Set());
  };

  // Complete audit session
  const handleCompleteAudit = () => {
    if (currentSession) {
      dispatch(completeAuditSession(currentSession.id));
    }
  };

  // Handle medicine selection
  const handleMedicineSelect = (medicine: Medicine) => {
    dispatch(selectMedicine(medicine));
  };

  // Check if medicine has been audited
  const isAudited = (medicineId: string) => auditedMedicines.has(medicineId);

  // Render left panel (checklist)
  const renderLeftPanel = () => {
    if (!currentSession) {
      return (
        <View style={styles.noSessionContainer}>
          <Text variant="bodyLarge" style={styles.noSessionText}>
            开始新盘点
          </Text>
          <Button mode="contained" onPress={handleStartAudit} style={styles.startButton}>
            开始
          </Button>
        </View>
      );
    }

    return (
      <View style={styles.checklistContainer}>
        <View style={styles.checklistHeader}>
          <Text variant="titleSmall">
            盘点清单 ({auditedMedicines.size}/{medicines.length})
          </Text>
        </View>

        <FlashList
          data={medicines}
          keyExtractor={item => item.id}
          estimatedItemSize={80}
          renderItem={({item}) => (
            <List.Item
              title={item.name}
              description={`库存: ${item.displayStock}`}
              left={props => (
                <List.Icon
                  {...props}
                  icon={isAudited(item.id) ? 'check-circle' : 'checkbox-blank-circle-outline'}
                  color={isAudited(item.id) ? theme.colors.primary : undefined}
                />
              )}
              onPress={() => handleMedicineSelect(item)}
              style={[
                styles.checklistItem,
                selectedMedicine?.id === item.id && styles.selectedChecklistItem,
              ]}
            />
          )}
        />
      </View>
    );
  };

  // Render center panel (form)
  const renderCenterPanel = () => {
    return <AuditForm />;
  };

  // Render right panel (discrepancies)
  const renderRightPanel = () => {
    if (discrepancies.length === 0) {
      return (
        <View style={styles.noDiscrepanciesContainer}>
          <Text variant="bodyMedium" style={styles.noDiscrepanciesText}>
            暂无差异记录
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.discrepanciesContainer}>
        {(discrepancies || []).map(record => (
          <View key={record.id} style={styles.discrepancyCard}>
            <View style={styles.discrepancyHeader}>
              <Text variant="titleSmall" numberOfLines={1}>
                {record.medicine?.name || '未知药品'}
              </Text>
              <Text
                variant="labelSmall"
                style={[
                  styles.discrepancyBadge,
                  {backgroundColor: record.discrepancy < 0 ? '#FFEBEE' : '#E8F5E9'},
                ]}>
                {record.discrepancy < 0 ? '盘亏' : '盘盈'}
              </Text>
            </View>
            <View style={styles.discrepancyDetails}>
              <Text variant="bodySmall" style={styles.discrepancyLabel}>
                账面: {record.expectedStock}
              </Text>
              <Text variant="bodySmall" style={styles.discrepancyLabel}>
                实盘: {record.actualStock}
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.discrepancyValue,
                  {color: record.discrepancy < 0 ? '#D32F2F' : '#2E7D32'},
                ]}>
                {record.discrepancy > 0 ? '+' : ''}{record.discrepancy}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TableSplitView
          leftPanel={renderLeftPanel()}
          centerPanel={renderCenterPanel()}
          rightPanel={renderRightPanel()}
          centerTitle="盘点输入"
          rightTitle={`差异记录 (${discrepancies.length})`}
        />
      </View>

      {/* Voice Bar */}
      <VoiceBar />

      {/* Complete Audit FAB */}
      {currentSession && currentSession.status === 'IN_PROGRESS' && (
        <FAB
          icon="check-bold"
          label="完成盘点"
          style={[styles.fab, {backgroundColor: theme.colors.primary}]}
          onPress={handleCompleteAudit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  noSessionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noSessionText: {
    marginBottom: 16,
  },
  startButton: {
    minWidth: 120,
  },
  checklistContainer: {
    flex: 1,
  },
  checklistHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  checklistItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedChecklistItem: {
    backgroundColor: '#E0F2F1',
  },
  noDiscrepanciesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noDiscrepanciesText: {
    color: '#999',
  },
  discrepanciesContainer: {
    flex: 1,
  },
  discrepancyCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  discrepancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  discrepancyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discrepancyDetails: {
    gap: 2,
  },
  discrepancyLabel: {
    color: '#666',
  },
  discrepancyValue: {
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
  },
});
