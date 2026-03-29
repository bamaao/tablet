/**
 * MedicineCard Component
 *
 * Displays a single medicine with its stock information.
 * * Redesigned according to UI prototype with improved visual hierarchy.
 */

import React, {useMemo, useCallback, memo} from 'react';
import {View, StyleSheet, GestureResponderEvent, TouchableOpacity} from 'react-native';
import {Text, useTheme, IconButton} from 'react-native-paper';
import {Medicine as MedicineType} from '@/types';
import {useAppSelector} from '@/store/hooks';
import {selectPackagedStockBySize, selectCurrentMode} from '@/store/slices/inventorySlice';
import {MODE_ACCENT} from '@/theme/inventoryDesign';

interface MedicineCardProps {
  medicine: MedicineType;
  onPress?: (event: GestureResponderEvent) => void;
  /** 列表场景传入：引用稳定，便于 React.memo */
  onSelectId?: (id: string) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  onDelete?: () => void;
  onDeleteId?: (id: string) => void;
  showStockWarning?: boolean;
  isSelected?: boolean;
}

const MedicineCardInner: React.FC<MedicineCardProps> = ({
  medicine,
  onPress,
  onSelectId,
  onLongPress,
  onDelete,
  onDeleteId,
  showStockWarning = false,
  isSelected = false,
}) => {
  const theme = useTheme();
  const currentMode = useAppSelector(selectCurrentMode);
  const selectionAccent = MODE_ACCENT[currentMode] ?? theme.colors.primary;

  // Get packaged stock grouped by size
  const packagedStockBySize = useAppSelector(state =>
    selectPackagedStockBySize(state, medicine.id)
  );

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
    return '#00A67D'; // Green - in stock (matching UI prototype)
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

  // Calculate total stock display
  const stockDisplay = useMemo(() => {
    const parts: string[] = [];

    // Calculate total packages
    let totalPackages = 0;
    let totalGrams = medicine.looseStock || 0;

    // Add packaged stock by size
    if (packagedStockBySize && packagedStockBySize.length > 0) {
      packagedStockBySize.forEach(({ packageSize, count }) => {
        totalPackages += count;
        totalGrams += packageSize * count;
      });
    }

    // Fallback to old format
    if (totalPackages === 0 && medicine.packagedStock > 0) {
      totalPackages = medicine.packagedStock;
    }

    // Format display
    if (totalPackages > 0 && totalGrams > 0) {
      return `${totalPackages}包 / ${totalGrams}g`;
    } else if (totalPackages > 0) {
      return `${totalPackages}${medicine.packageUnit}`;
    } else if (totalGrams > 0) {
      return `${totalGrams}${medicine.baseUnit}`;
    }

    return `0${medicine.baseUnit}`;
  }, [packagedStockBySize, medicine]);

  const categoryColor = getCategoryColor();
  const stockColor = getStockStatusColor();

  const handleCardPress = useCallback(
    (e: GestureResponderEvent) => {
      if (onSelectId) {
        onSelectId(medicine.id);
      } else {
        onPress?.(e);
      }
    },
    [onSelectId, onPress, medicine.id],
  );

  const handleDeletePress = useCallback(() => {
    if (onDeleteId) {
      onDeleteId(medicine.id);
    } else {
      onDelete?.();
    }
  }, [onDeleteId, onDelete, medicine.id]);

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={[
        styles.cardContainer,
        isSelected && styles.selectedCardContainer,
      ]}>
      <View
        style={[
          styles.card,
          isSelected && styles.selectedCard,
          isSelected && {
            borderColor: selectionAccent,
            backgroundColor: '#F7FBFA',
          },
        ]}>
        {/* Left: Medicine Icon */}
        <View
          style={[
            styles.medicineIcon,
            {backgroundColor: isSelected ? selectionAccent : categoryColor + '20'},
          ]}>
          <Text style={[styles.medicineIconText, {color: isSelected ? '#FFFFFF' : categoryColor}]}>
            {medicine.name.charAt(0)}
          </Text>
        </View>

        {/* Center: Medicine Info */}
        <View style={styles.infoContainer}>
          <Text variant="titleMedium" style={styles.medicineName} numberOfLines={1}>
            {medicine.name}
          </Text>
          <Text variant="bodySmall" style={styles.stockInfo}>
            {stockDisplay}
          </Text>
        </View>

        {/* Right: Stock Status */}
        <View style={styles.stockStatusContainer}>
          <Text variant="labelSmall" style={[styles.stockStatus, {color: stockColor}]}>
            {getStockStatusText()}
          </Text>
        </View>

        {/* Delete Button (shown on hover/long press) */}
        {(onDelete || onDeleteId) && (
          <IconButton
            icon="delete"
            size={16}
            onPress={handleDeletePress}
            style={styles.deleteButton}
            iconColor="#F44336"
          />
        )}
      </View>

      {/* Selected Indicator */}
      {isSelected && (
        <View style={[styles.selectedIndicator, {backgroundColor: selectionAccent}]} />
      )}
    </TouchableOpacity>
  );
};

export const MedicineCard = memo(MedicineCardInner);
MedicineCard.displayName = 'MedicineCard';

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 8,
    marginHorizontal: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedCardContainer: {
    // Additional styles for selected container if needed
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedCard: {
    backgroundColor: '#F5F9F8',
    borderWidth: 2,
  },
  medicineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicineIconText: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  medicineName: {
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  stockInfo: {
    color: '#666666',
  },
  stockStatusContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 60,
  },
  stockStatus: {
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    margin: 0,
    padding: 4,
    position: 'absolute',
    right: 4,
    top: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
});
