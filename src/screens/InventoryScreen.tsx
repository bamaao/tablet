/**
 * InventoryScreen Component
 *
 * Main inventory management screen with stock in/out/unpack operations.
 * Uses a master-detail layout with medicine list and operation form.
 */

import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme, IconButton} from 'react-native-paper';
import {MasterDetailLayout} from '@/components/layout/MasterDetailLayout';
import {ModeSegmentedControl} from '@/components/layout/ModeSegmentedControl';
import {MedicineList} from '@/components/inventory/MedicineList';
import {InboundForm} from '@/components/forms/InboundForm';
import {OutboundForm} from '@/components/forms/OutboundForm';
import {AuditForm} from '@/components/forms/AuditForm';
import {UnpackModal} from '@/components/forms/UnpackModal';
import {VoiceBar} from '@/components/voice/VoiceBar';
import {InventoryMode} from '@/types';
import {useAppSelector} from '@/store/hooks';
import {selectCurrentMode} from '@/store/slices/inventorySlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const InventoryScreen: React.FC = () => {
  const theme = useTheme();
  const currentMode = useAppSelector(selectCurrentMode);

  const [showUnpackModal, setShowUnpackModal] = useState(false);

  // Render the appropriate form based on current mode
  const renderForm = () => {
    switch (currentMode) {
      case InventoryMode.INBOUND:
        return <InboundForm />;
      case InventoryMode.OUTBOUND:
        return <OutboundForm />;
      case InventoryMode.UNPACK:
        return (
          <View style={styles.unpackContainer}>
            <View style={styles.unpackContent}>
              <View style={styles.unpackIconContainer}>
                <Icon name="package-variant" size={48} color={theme.colors.primary} />
              </View>
              <View style={styles.unpackTextContainer}>
                <Text variant="titleMedium" style={styles.unpackTitle}>
                  拆包模式
                </Text>
                <Text variant="bodyMedium" style={styles.unpackDescription}>
                  将包装药品转换为散装单位
                </Text>
              </View>
              <Button
                mode="contained"
                onPress={() => setShowUnpackModal(true)}
                style={styles.unpackButton}>
                打开拆包
              </Button>
            </View>
          </View>
        );
      case InventoryMode.AUDIT:
        return <AuditForm />;
      default:
        return <InboundForm />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Mode Selector */}
      <ModeSegmentedControl />

      {/* Main Content */}
      <View style={styles.content}>
        <MasterDetailLayout
          master={<MedicineList showLowStockOnly={false} />}
          detail={renderForm()}
        />
      </View>

      {/* Voice Bar (Always visible) */}
      <VoiceBar />

      {/* Unpack Modal */}
      <UnpackModal
        visible={showUnpackModal}
        onDismiss={() => setShowUnpackModal(false)}
      />
    </View>
  );
};

const {Text, Button} = require('react-native-paper');

const selectCurrentMode = (state: {inventory: {currentMode: InventoryMode}}) =>
  state.inventory.currentMode;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  unpackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  unpackContent: {
    alignItems: 'center',
    gap: 24,
  },
  unpackIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unpackTextContainer: {
    alignItems: 'center',
  },
  unpackTitle: {
    fontWeight: '600',
  },
  unpackDescription: {
    color: '#666',
    textAlign: 'center',
  },
  unpackButton: {
    minWidth: 150,
  },
});
