/**
 * MedicineList Component
 *
 * A FlashList-based medicine browser with search functionality.
 * Displays medicines with their stock status and low-stock warnings.
 */

import React, {useState, useCallback, useEffect} from 'react';
import {View, StyleSheet, ListRenderItem} from 'react-native';
import {Text, Searchbar, ProgressBar, MD3Colors} from 'react-native-paper';
import {FlashList} from '@shopify/flash-list';
import {Medicine as MedicineType, MedicineCategory} from '@/types';
import {MedicineCard} from './MedicineCard';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {searchMedicines, selectMedicine} from '@/store/slices/inventorySlice';

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
}

export const MedicineList: React.FC<MedicineListProps> = ({
  initialQuery = '',
  onMedicineSelect,
  showLowStockOnly = false,
}) => {
  const dispatch = useAppDispatch();
  const medicines = useAppSelector(selectMedicinesSorted);
  const loading = useAppSelector(selectInventoryLoading);

  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // Filter medicines based on props
  const filteredMedicines = React.useMemo(() => {
    let result = medicines;

    if (showLowStockOnly) {
      result = result.filter(m => m.currentStock < m.minStock);
    }

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
  }, [medicines, searchQuery, showLowStockOnly]);

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
      dispatch(selectMedicine(medicine));
      onMedicineSelect?.(medicine);
    },
    [dispatch, onMedicineSelect],
  );

  const renderItem: ListRenderItem<MedicineType> = useCallback(
    ({item}) => (
      <MedicineCard
        medicine={item}
        onPress={() => handleMedicinePress(item)}
        showStockWarning={item.currentStock < item.minStock}
      />
    ),
    [handleMedicinePress],
  );

  const getKey = useCallback((item: MedicineType) => item.id, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ProgressBar indeterminate />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="搜索药品名称、拼音或位置"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
      />

      {filteredMedicines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            {showLowStockOnly ? '没有库存不足的药品' : '没有找到匹配的药品'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredMedicines}
          renderItem={renderItem}
          keyExtractor={getKey}
          estimatedItemSize={100}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
        />
      )}

      {showLowStockOnly && (
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            共 {filteredMedicines.length} 种药品库存不足
          </Text>
        </View>
      )}
    </View>
  );
};

const selectMedicinesSorted = (state: {inventory: {medicines: MedicineType[]}}) =>
  [...state.inventory.medicines].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

const selectInventoryLoading = (state: {inventory: {loading: boolean}}) =>
  state.inventory.loading;

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
    color: '#666',
  },
  searchbar: {
    margin: 16,
    elevation: 0,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  footerText: {
    color: '#666',
    textAlign: 'center',
  },
});
