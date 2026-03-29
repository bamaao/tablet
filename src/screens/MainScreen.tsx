/**
 * MainScreen Component
 *
 * Entry point with tab navigation for the application.
 * Provides access to Inventory, Audit, and Prescription screens.
 */

import React, {useMemo} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {BottomTabNavigationOptions} from '@react-navigation/bottom-tabs';
import {useTheme, Snackbar, Dialog, Button} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTabletLayout} from '@/hooks/useTabletLayout';
import {
  InventoryTabScreen,
  AuditTabScreen,
  PrescriptionTabScreen,
  SettingsTabScreen,
} from './lazyTabScreens';
import {selectToastMessage, selectErrorDialog, clearMessages} from '@/store/slices/uiSlice';
import {useAppSelector, useAppDispatch} from '@/store/hooks';

const Tab = createBottomTabNavigator();

export const MainScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {isTabletLayout} = useTabletLayout();

  const toastMessage = useAppSelector(selectToastMessage);
  const errorDialog = useAppSelector(selectErrorDialog);

  const screenOptions = useMemo<BottomTabNavigationOptions>(
    () => ({
      lazy: true,
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: 'bold',
        ...(isTabletLayout ? {fontSize: 20} : {}),
      },
      tabBarStyle: {
        backgroundColor: theme.colors.surface,
        height: isTabletLayout ? 72 : 56,
        paddingBottom: isTabletLayout ? 10 : 6,
        paddingTop: isTabletLayout ? 10 : 6,
      },
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: '#757575',
      tabBarLabelStyle: {
        fontSize: isTabletLayout ? 14 : 12,
        fontWeight: isTabletLayout ? '600' : 'normal',
      },
    }),
    [theme.colors.primary, theme.colors.surface, isTabletLayout],
  );

  const iconSizeFor = (size: number) => (isTabletLayout ? 28 : size);

  const inventoryOptions = useMemo(
    () => ({
      title: '库存管理',
      tabBarLabel: '库存',
      tabBarIcon: ({color, size}: {color: string; size: number}) => (
        <Icon name="warehouse" size={iconSizeFor(size)} color={color} />
      ),
    }),
    [isTabletLayout],
  );

  const auditOptions = useMemo(
    () => ({
      title: '库存盘点',
      tabBarLabel: '盘点',
      tabBarIcon: ({color, size}: {color: string; size: number}) => (
        <Icon name="clipboard-check" size={iconSizeFor(size)} color={color} />
      ),
    }),
    [isTabletLayout],
  );

  const prescriptionOptions = useMemo(
    () => ({
      title: '处方抓药',
      tabBarLabel: '处方',
      tabBarIcon: ({color, size}: {color: string; size: number}) => (
        <Icon name="bottle-tonic" size={iconSizeFor(size)} color={color} />
      ),
    }),
    [isTabletLayout],
  );

  const settingsOptions = useMemo(
    () => ({
      title: '设置',
      tabBarLabel: '设置',
      tabBarIcon: ({color, size}: {color: string; size: number}) => (
        <Icon name="cog" size={iconSizeFor(size)} color={color} />
      ),
    }),
    [isTabletLayout],
  );

  return (
    <View style={styles.container}>
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen
          name="Inventory"
          component={InventoryTabScreen}
          options={inventoryOptions}
        />

        <Tab.Screen name="Audit" component={AuditTabScreen} options={auditOptions} />

        <Tab.Screen
          name="Prescription"
          component={PrescriptionTabScreen}
          options={prescriptionOptions}
        />

        <Tab.Screen name="Settings" component={SettingsTabScreen} options={settingsOptions} />
      </Tab.Navigator>

      <Snackbar
        visible={!!toastMessage}
        onDismiss={() => dispatch(clearMessages())}
        duration={3000}
        action={{
          label: '关闭',
          onPress: () => dispatch(clearMessages()),
        }}>
        {toastMessage}
      </Snackbar>

      <Dialog visible={!!errorDialog} onDismiss={() => dispatch(clearMessages())}>
        <Dialog.Title>{errorDialog?.title}</Dialog.Title>
        <Dialog.Content>
          <Text>{errorDialog?.message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => dispatch(clearMessages())}>确定</Button>
        </Dialog.Actions>
      </Dialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
