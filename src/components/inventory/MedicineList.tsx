/**
 * MedicineList Component
 *
 * A FlashList-based medicine browser with search and category filtering.
 * Redesigned according to UI prototype: search + category tabs + medicine cards.
 */

import React, {useState, useCallback, useEffect} from 'react';
import {View, StyleSheet, ListRenderItem, Alert, TouchableOpacity} from 'react-native';
import {Text, Searchbar, ProgressBar, Button, SegmentedButtons} from 'react-native-paper';
import {FlashList} from '@shopify/flash-list';
import {Medicine as MedicineType, MedicineCategory} from '@/types';
import {MedicineCard} from './MedicineCard';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {
  searchMedicines,
  selectMedicine,
  selectMedicines,
  selectInventoryLoading,
  selectSelectedMedicine,
  deleteMedicine,
} from '@/store/slices/inventorySlice';
import {showToast, showError} from '@/store/slices/uiSlice';

type CategoryFilter = 'all' | 'chinese' | 'western';

interface MedicineListProps {
  /**
   * Optional initial search query
   */
  initialQuery?: string;

  /**
   * Callback when a medicine is selected
   */
  onMedicineSelect?: (medicine: MedicineType) => void;

  /**
   * Show only low-stock medicines
   */
  showLowStockOnly?: boolean;

  /**
   * Show add button in header
   */
  showAddButton?: boolean;

  /**
   * Callback when add button is pressed
   */
  onAddPress?: () => void;
}

export const MedicineList: React.FC<MedicineListProps> = ({
  initialQuery = '',
  onMedicineSelect,
  showLowStockOnly = false,
  showAddButton = false,
  onAddPress,
}) => {
  const dispatch = useAppDispatch();
  const medicines = useAppSelector(selectMedicines);
  const loading = useAppSelector(selectInventoryLoading);
  const selectedMedicine = useAppSelector(selectSelectedMedicine);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Filter medicines based on props
  const filteredMedicines = React.useMemo(() => {
    let result = medicines || [];

    // Filter by category
    if (categoryFilter === 'chinese') {
      result = result.filter(m => m.category === MedicineCategory.CHINESE_HERB);
    } else if (categoryFilter === 'western') {
      result = result.filter(m =>
        m.category === MedicineCategory.WESTERN_MEDICINE ||
        m.category === MedicineCategory.CHINESE_PATENT
      );
    }

    // Filter by low stock
    if (showLowStockOnly) {
      result = result.filter(m => m.currentStock < m.minStock);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        m =>
          m.name.toLowerCase().includes(query) ||
          (m.pinyin && m.pinyin.toLowerCase().includes(query)) ||
          (m.location && m.location.toLowerCase().includes(query)),
      );
    }

    return result;
  }, [medicines, searchQuery, categoryFilter, showLowStockOnly]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        dispatch(searchMedicines(searchQuery));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, dispatch]);

  const handleMedicinePress = useCallback(
    (medicine: MedicineType) => {
      console.log('Medicine pressed:', medicine.name, medicine.id);
      dispatch(selectMedicine(medicine));
      onMedicineSelect?.(medicine);
    },
    [dispatch, onMedicineSelect],
  );

  const handleDeleteMedicine = useCallback(
    (medicine: MedicineType) => {
      Alert.alert(
        '确认删除',
        `确定要删除药品 "${medicine.name}" 吗？\n\n此操作将同时删除该药品的所有库存记录，且无法恢复。`,
        [
          {
            text: '取消',
            style: 'cancel',
          },
          {
            text: '删除',
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(deleteMedicine(medicine.id)).unwrap();
                dispatch(showToast(`已删除药品: ${medicine.name}`));
              } catch (error) {
                dispatch(showError({title: '删除失败', message: (error as Error).message}));
              }
            },
          },
        ],
      );
    },
    [dispatch],
  );

  const renderItem: ListRenderItem<MedicineType> = useCallback(
    ({item}) => {
      const isSelected = selectedMedicine?.id === item.id;
      return (
        <MedicineCard
          medicine={item}
          onPress={() => handleMedicinePress(item)}
          showStockWarning={item.currentStock < item.minStock}
          onDelete={() => handleDeleteMedicine(item)}
          isSelected={isSelected}
        />
      );
    },
    [handleMedicinePress, handleDeleteMedicine, selectedMedicine],
  );

  const getKey = useCallback((item: MedicineType) => item.id, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ProgressBar indeterminate color="#FF6600" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="搜索药品..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          autoCorrect={false}
          autoCapitalize="none"
          iconColor="#999999"
          placeholderTextColor="#999999"
          inputStyle={styles.searchInput}
        />
        {showAddButton && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <SegmentedButtons
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}
          buttons={[
            {
              label: '全部',
              value: 'all',
              style: categoryFilter === 'all' && styles.activeCategoryButton,
            },
            {
              label: '中草药',
              value: 'chinese',
              style: categoryFilter === 'chinese' && styles.activeCategoryButton,
            },
            {
              label: '西药',
              value: 'western',
              style: categoryFilter === 'western' && styles.activeCategoryButton,
            },
          ]}
          style={styles.categoryButtons}
          theme={{
            colors: {
              secondaryContainer: '#FF6600',
              onSecondaryContainer: '#FFFFFF',
            },
          }}
        />
      </View>

      {/* Medicine List */}
      {filteredMedicines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            {showLowStockOnly
              ? '没有库存不足的药品'
              : searchQuery.trim()
                ? '没有找到匹配的药品'
                : '暂无药品，点击右上角 + 添加'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredMedicines}
          renderItem={renderItem}
          keyExtractor={getKey}
          estimatedItemSize={80}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
        />
      )}

      {/* Footer Stats */}
      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.footerText}>
          共 {filteredMedicines.length} 种药品
          {showLowStockOnly && ' (库存不足)'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: {
    color: '#666666',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchbar: {
    flex: 1,
    elevation: 0,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    height: 40,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 36,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6600',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    marginTop: -2,
  },
  // Category
  categoryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryButtons: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#FF6600',
  },
  // List
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#999999',
    textAlign: 'center',
  },
  // Footer
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  footerText: {
    color: '#666666',
    textAlign: 'center',
    fontSize: 12,
  },
});
