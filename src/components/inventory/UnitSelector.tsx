/**
 * UnitSelector Component
 *
 * A unit toggle/selector for inventory operations.
 * Allows users to select the appropriate unit for their operation.
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {SegmentedButtons} from 'react-native-paper';
import {UnitType} from '@/types';

interface UnitSelectorProps {
  /**
   * Current selected unit
   */
  value: UnitType;

  /**
   * Callback when unit changes
   */
  onChange: (unit: UnitType) => void;

  /**
   * Available units to select from
   */
  availableUnits?: UnitType[];

  /**
   * Disable the selector
   */
  disabled?: boolean;

  /**
   * Optional style override
   */
  style?: any;
}

const DEFAULT_UNITS: UnitType[] = ['包', 'g', '斤', '两', '钱'];

export const UnitSelector: React.FC<UnitSelectorProps> = ({
  value,
  onChange,
  availableUnits = DEFAULT_UNITS,
  disabled = false,
  style,
}) => {
  const buttons = availableUnits.map(unit => ({
    label: unit,
    value: unit,
    disabled: false,
  }));

  return (
    <View style={[styles.container, style]}>
      <SegmentedButtons
        value={value}
        onValueChange={onChange}
        buttons={buttons}
        disabled={disabled}
      />
    </View>
  );
};

// ============================================================================
// PACKAGE UNIT SELECTOR (for unpack operations)
// ============================================================================

interface PackageUnitSelectorProps {
  /**
   * Package unit (e.g., "包")
   */
  packageUnit: UnitType;

  /**
   * Package size in base units
   */
  packageSize: number;

  /**
   * Base unit (e.g., "g")
   */
  baseUnit: UnitType;

  /**
   * Current selected unit
   */
  value: UnitType;

  /**
   * Callback when unit changes
   */
  onChange: (unit: UnitType) => void;

  /**
   * Optional style override
   */
  style?: any;
}

export const PackageUnitSelector: React.FC<PackageUnitSelectorProps> = ({
  packageUnit,
  packageSize,
  baseUnit,
  value,
  onChange,
  style,
}) => {
  // For unpack operations, we only show package unit and base unit
  const buttons = [
    {
      label: `${packageUnit} (${packageSize}${baseUnit})`,
      value: packageUnit,
    },
    {
      label: baseUnit,
      value: baseUnit,
    },
  ];

  return (
    <View style={[styles.container, style]}>
      <SegmentedButtons
        value={value}
        onValueChange={onChange}
        buttons={buttons}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
});
