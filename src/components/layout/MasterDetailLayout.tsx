/**
 * MasterDetailLayout Component
 *
 * A 30%/70% split layout designed for tablet landscape orientation.
 * Commonly used throughout the app for list/detail views.
 *
 * @example
 * <MasterDetailLayout
 *   master={<MedicineList />}
 *   detail={<OperationForm />}
 * />
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';

interface MasterDetailLayoutProps {
  /**
   * Content for the left (master) panel
   */
  master: React.ReactNode;

  /**
   * Content for the right (detail) panel
   */
  detail: React.ReactNode;

  /**
   * Width ratio for master panel (default: 0.3 = 30%)
   */
  masterRatio?: number;

  /**
   * Gap between panels (default: 16)
   */
  gap?: number;

  /**
   * Custom padding (default: 16)
   */
  padding?: number;

  /**
   * Optional style override
   */
  style?: any;
}

export const MasterDetailLayout: React.FC<MasterDetailLayoutProps> = ({
  master,
  detail,
  masterRatio = 0.3,
  gap = 16,
  padding = 16,
  style,
}) => {
  const detailFlex = Math.max(0.01, 1 - masterRatio);

  return (
    <View style={[styles.container, {padding, gap}, style]}>
      <View style={[styles.panel, {flex: masterRatio, minWidth: 0}]}>{master}</View>
      <View style={[styles.panel, {flex: detailFlex, minWidth: 0}]}>{detail}</View>
    </View>
  );
};

// ============================================================================
// THREE COLUMN LAYOUT (for Audit Screen)
// ============================================================================

interface ThreeColumnLayoutProps {
  /**
   * Content for the left column
   */
  left: React.ReactNode;

  /**
   * Content for the center column
   */
  center: React.ReactNode;

  /**
   * Content for the right column
   */
  right: React.ReactNode;

  /**
   * Width ratio for columns (default: 0.3, 0.4, 0.3)
   */
  ratios?: [number, number, number];

  /**
   * Gap between columns (default: 16)
   */
  gap?: number;

  /**
   * Custom padding (default: 16)
   */
  padding?: number;

  /**
   * Optional style override
   */
  style?: any;
}

export const ThreeColumnLayout: React.FC<ThreeColumnLayoutProps> = ({
  left,
  center,
  right,
  ratios = [0.3, 0.4, 0.3],
  gap = 16,
  padding = 16,
  style,
}) => {
  return (
    <View style={[styles.container, styles.threeColumn, {padding, gap}, style]}>
      <View style={[styles.panel, {flex: ratios[0], minWidth: 0}]}>{left}</View>
      <View style={[styles.panel, {flex: ratios[1], minWidth: 0}]}>{center}</View>
      <View style={[styles.panel, {flex: ratios[2], minWidth: 0}]}>{right}</View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
  },
  threeColumn: {
    justifyContent: 'space-between',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
