/**
 * MedicineForm Component
 *
 * Form for adding and editing medicines (both Chinese herbs and Western medicines).
 */

import React, {useState} from 'react';
import {View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Divider,
  useTheme,
  SegmentedButtons,
} from 'react-native-paper';
import {useAppDispatch} from '@/store/hooks';
import {createMedicine, updateMedicine} from '@/store/slices/inventorySlice';
import {Medicine, MedicineCategory, UnitType} from '@/types';
import {showToast, showError} from '@/store/slices/uiSlice';

interface MedicineFormProps {
  /**
   * Existing medicine to edit (undefined for new medicine)
   */
  medicine?: Medicine;

  /**
   * Callback when form is submitted successfully
   */
  onSuccess?: () => void;

  /**
   * Callback to cancel form
   */
  onCancel?: () => void;
}

export const MedicineForm: React.FC<MedicineFormProps> = ({
  medicine,
  onSuccess,
  onCancel,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const isEditing = !!medicine;

  // Form state
  const [name, setName] = useState(medicine?.name || '');
  const [pinyin, setPinyin] = useState(medicine?.pinyin || '');
  const [category, setCategory] = useState<MedicineCategory>(
    medicine?.category || MedicineCategory.CHINESE_HERB,
  );
  const [baseUnit, setBaseUnit] = useState<UnitType>(medicine?.baseUnit || 'g');
  const [packageUnit, setPackageUnit] = useState<string>(medicine?.packageUnit || '包');
  const [packageSize, setPackageSize] = useState(medicine?.packageSize ? String(medicine.packageSize) : '500');
  const [minStock, setMinStock] = useState(medicine?.minStock ? String(medicine.minStock) : '1000');
  const [location, setLocation] = useState(medicine?.location || '');

  // Validate form
  const isValid =
    name.trim() &&
    packageSize &&
    parseFloat(packageSize) > 0 &&
    minStock &&
    parseFloat(minStock) >= 0;

  // Handle submit
  const handleSubmit = async () => {
    if (!isValid) return;

    try {
      const medicineData = {
        name: name.trim(),
        pinyin: pinyin.trim() || undefined,
        category,
        baseUnit,
        packageUnit,
        packageSize: parseFloat(packageSize),
        minStock: parseFloat(minStock),
        location: location.trim() || undefined,
      };

      if (isEditing && medicine) {
        await dispatch(
          updateMedicine({
            id: medicine.id,
            ...medicineData,
          }),
        ).unwrap();
        dispatch(showToast(`已更新药品: ${name}`));
      } else {
        await dispatch(createMedicine(medicineData)).unwrap();
        dispatch(showToast(`已添加药品: ${name}`));
      }

      onSuccess?.();
    } catch (error) {
      dispatch(showError((error as Error).message));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            {isEditing ? '编辑药品' : '添加新药品'}
          </Text>
        </View>

        <Divider />

        {/* Basic Info */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            基本信息
          </Text>

          {/* Category Selection */}
          <Text variant="bodyMedium" style={styles.label}>药品类型</Text>
          <SegmentedButtons
            value={category}
            onValueChange={(value) => setCategory(value as MedicineCategory)}
            buttons={[
              {label: '中草药', value: MedicineCategory.CHINESE_HERB},
              {label: '中成药', value: MedicineCategory.CHINESE_PATENT},
              {label: '西药', value: MedicineCategory.WESTERN_MEDICINE},
              {label: '耗材', value: MedicineCategory.SUPPLIES},
            ]}
            style={styles.segmentedButtons}
          />

          {/* Medicine Name */}
          <TextInput
            value={name}
            onChangeText={setName}
            label="药品名称 *"
            mode="outlined"
            style={styles.input}
            autoFocus={!isEditing}
            keyboardType="default"
            autoCorrect={true}
            autoCapitalize="sentences"
          />

          {/* Pinyin */}
          <TextInput
            value={pinyin}
            onChangeText={setPinyin}
            label="拼音（可选，用于语音搜索）"
            mode="outlined"
            style={styles.input}
            placeholder="例如: dang gui"
            keyboardType="default"
            autoCorrect={true}
            autoCapitalize="none"
          />
        </View>

        <Divider />

        {/* Unit & Package Info */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            单位与包装
          </Text>

          {/* Base Unit */}
          <Text variant="bodyMedium" style={styles.label}>基础单位</Text>
          <SegmentedButtons
            value={baseUnit}
            onValueChange={(value) => setBaseUnit(value as UnitType)}
            buttons={[
              {label: '克(g)', value: 'g'},
              {label: '毫升(ml)', value: 'ml'},
            ]}
            style={styles.segmentedButtons}
          />

          {/* Package Unit */}
          <TextInput
            value={packageUnit}
            onChangeText={setPackageUnit}
            label="包装单位"
            mode="outlined"
            style={styles.input}
            placeholder="例如: 包、盒、瓶"
            keyboardType="default"
            autoCorrect={true}
            autoCapitalize="sentences"
          />

          {/* Package Size */}
          <TextInput
            value={packageSize}
            onChangeText={setPackageSize}
            label={`每包含量 (${baseUnit}) *`}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text variant="bodySmall" style={styles.hint}>
            例如: 500 表示每包 500{baseUnit}
          </Text>
        </View>

        <Divider />

        {/* Stock & Location */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            库存设置
          </Text>

          {/* Minimum Stock */}
          <TextInput
            value={minStock}
            onChangeText={setMinStock}
            label={`最低库存预警 (${baseUnit}) *`}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text variant="bodySmall" style={styles.hint}>
            当库存低于此值时显示警告
          </Text>

          {/* Location */}
          <TextInput
            value={location}
            onChangeText={setLocation}
            label="存放位置（可选）"
            mode="outlined"
            keyboardType="default"
            autoCorrect={true}
            autoCapitalize="sentences"
          />
            style={styles.input}
            placeholder="例如: A1-01"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {onCancel && (
            <Button
              mode="outlined"
              onPress={onCancel}
              style={styles.button}>
              取消
            </Button>
          )}
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={!isValid}
            style={styles.button}
            buttonColor={theme.colors.primary}>
            {isEditing ? '保存修改' : '添加药品'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
    color: '#666',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  hint: {
    color: '#999',
    fontStyle: 'italic',
    marginTop: -8,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    flex: 1,
  },
});
