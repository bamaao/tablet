/**
 * TableSplitView Component
 *
 * A three-column layout specifically designed for the audit screen.
 * Provides an optimized layout for tablet landscape with:
 * - Left: Checklist (30%)
 * - Center: Input form (40%)
 * - Right: Discrepancies (30%)
 */

import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

interface TableSplitViewProps {
  /**
   * Content for the left panel (checklist)
   */
  leftPanel: React.ReactNode;

  /**
   * Content for the center panel (input form)
   */
  centerPanel: React.ReactNode;

  /**
   * Content for the right panel (discrepancies)
   */
  rightPanel: React.ReactNode;

  /**
   * Optional title for the center panel
   */
  centerTitle?: string;

  /**
   * Optional title for the right panel
   */
  rightTitle?: string;
}

export const TableSplitView: React.FC<TableSplitViewProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  centerTitle = '盘点输入',
  rightTitle = '差异记录',
}) => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.row}>
        {/* Left Panel - Checklist */}
        <View style={styles.leftPanel}>{leftPanel}</View>

        {/* Center Panel - Input Form */}
        <View style={styles.centerPanel}>
          <View style={styles.panelHeader}>
            <Text variant="titleMedium">{centerTitle}</Text>
          </View>
          <ScrollView style={styles.panelContent}>{centerPanel}</ScrollView>
        </View>

        {/* Right Panel - Discrepancies */}
        <View style={styles.rightPanel}>
          <View style={styles.panelHeader}>
            <Text variant="titleMedium">{rightTitle}</Text>
          </View>
          <ScrollView style={styles.panelContent}>{rightPanel}</ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  leftPanel: {
    flex: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  centerPanel: {
    flex: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rightPanel: {
    flex: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  panelHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  panelContent: {
    flex: 1,
    padding: 16,
  },
});
