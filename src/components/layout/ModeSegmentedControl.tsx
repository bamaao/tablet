/**
 * ModeSegmentedControl Component
 *
 * A segmented control for switching between inventory operation modes:
 * [入库] [出库] [拆包] [盘点]
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {SegmentedButtons, useTheme} from 'react-native-paper';
import {InventoryMode} from '@/types';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {setMode} from '@/store/slices/inventorySlice';

const MODES = [
  {label: '入库', value: InventoryMode.INBOUND},
  {label: '出库', value: InventoryMode.OUTBOUND},
  {label: '拆包', value: InventoryMode.UNPACK},
  {label: '盘点', value: InventoryMode.AUDIT},
];

export const ModeSegmentedControl: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const currentMode = useAppSelector(selectCurrentMode);

  const handleModeChange = (value: string) => {
    dispatch(setMode(value as InventoryMode));
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={currentMode}
        onValueChange={handleModeChange}
        buttons={MODES.map(mode => ({
          label: mode.label,
          value: mode.value,
        }))}
        style={styles.segmentedButtons}
        theme={theme}
      />
    </View>
  );
};

const selectCurrentMode = (state: {inventory: {currentMode: InventoryMode}}) =>
  state.inventory.currentMode;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  segmentedButtons: {
    backgroundColor: '#F5F5F5',
  },
});
