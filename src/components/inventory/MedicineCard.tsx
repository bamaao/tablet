/**
 * MedicineCard Component
 *
 * Displays a single medicine with its stock information.
 * Shows low-stock warning when stock is below minimum threshold.
 */

import React from 'react';
import {View, StyleSheet, GestureResponderEvent} from 'react-native';
import {Card, Text, Avatar, useTheme, MD3Colors} from 'react-native-paper';
import {Medicine as MedicineType} from '@/types';

interface MedicineCardProps {
  medicine: MedicineType;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  showStockWarning?: boolean;
  selected?: boolean;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  onPress,
  onLongPress,
  showStockWarning = false,
  selected = false,
}) => {
  const theme = useTheme();

  // Get category color
  const getCategoryColor = (): string => {
    switch (medicine.category) {
      case 'CHINESE_HERB':
        return '#4CAF50'; // Green
      case 'CHINESE_PATENT':
        return '#FF9800'; // Orange
      case 'WESTERN_MEDICINE':
        return '#2196F3'; // Blue
      case 'SUPPLIES':
        return '#9E9E9E'; // Gray
      default:
        return '#757575';
    }
  };

  // Get stock status color
  const getStockStatusColor = (): string => {
    if (medicine.currentStock === 0) {
      return '#F44336'; // Red - out of stock
    } else if (showStockWarning) {
      return '#FF9800'; // Orange - low stock
    }
    return '#4CAF50'; // Green - in stock
  };

  // Get stock status text
  const getStockStatusText = (): string => {
    if (medicine.currentStock === 0) {
      return '缺货';
    } else if (showStockWarning) {
      return '库存不足';
    }
    return '正常';
  };

  // Format stock display
  const formatStockDisplay = (): string => {
    const parts: string[] = [];

    if (medicine.packagedStock > 0) {
      parts.push(`${medicine.packagedStock}${medicine.packageUnit}`);
    }

    if (medicine.looseStock > 0) {
      parts.push(`${medicine.looseStock}${medicine.baseUnit}`);
    }

    if (parts.length === 0) {
      return `0${medicine.baseUnit}`;
    }

    return parts.join(' + ');
  };

  const categoryColor = getCategoryColor();
  const stockColor = getStockStatusColor();

  return (
    <Card
      style={[styles.card, selected && styles.selectedCard]}
      onPress={onPress}
      onLongPress={onLongPress}
      mode={selected ? 'contained' : 'elevated'}>
      <Card.Content style={styles.content}>
        {/* Left: Icon and Medicine Info */}
        <View style={styles.leftContainer}>
          <Avatar.Text
            size={48}
            label={medicine.name.substring(0, 1)}
            style={[styles.avatar, {backgroundColor: categoryColor}]}
            labelStyle={{color: '#FFFFFF', fontWeight: 'bold'}}
          />

          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text variant="titleMedium" style={styles.name}>
                {medicine.name}
              </Text>
              <Text
                variant="labelSmall"
                style={[styles.categoryBadge, {backgroundColor: categoryColor + '20'}]}>
                {getCategoryLabel(medicine.category)}
              </Text>
            </View>

            <Text variant="bodyMedium" style={styles.spec}>
              {medicine.packageSize}{medicine.baseUnit}/{medicine.packageUnit}
            </Text>

            {medicine.location && (
              <Text variant="bodySmall" style={styles.location}>
                位置: {medicine.location}
              </Text>
            )}
          </View>
        </View>

        {/* Right: Stock Info */}
        <View style={styles.stockContainer}>
          <Text variant="headlineSmall" style={[styles.stockAmount, {color: stockColor}]}>
            {formatStockDisplay()}
          </Text>

          <View
            style={[
              styles.statusBadge,
              {backgroundColor: stockColor + '20', borderColor: stockColor},
            ]}>
            <Text variant="labelSmall" style={[styles.statusText, {color: stockColor}]}>
              {getStockStatusText()}
            </Text>
          </View>

          {showStockWarning && medicine.minStock > 0 && (
            <Text variant="labelSmall" style={styles.warningText}>
              最低库存: {medicine.minStock}{medicine.baseUnit}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

// Helper function to get category label
function getCategoryLabel(category: string): string {
  switch (category) {
    case 'CHINESE_HERB':
      return '中药材';
    case 'CHINESE_PATENT':
      return '中成药';
    case 'WESTERN_MEDICINE':
      return '西药';
    case 'SUPPLIES':
      return '医疗用品';
    default:
      return '其他';
  }
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    marginHorizontal: 0,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#00695C',
  },
  content: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  spec: {
    color: '#666',
  },
  location: {
    color: '#999',
  },
  stockContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    minWidth: 100,
  },
  stockAmount: {
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontWeight: '600',
  },
  warningText: {
    color: '#FF9800',
  },
});
