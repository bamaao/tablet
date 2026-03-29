/**
 * MainScreen Component
 *
 * Entry point with tab navigation for the application.
 * Provides access to Inventory, Audit, and Prescription screens.
 */

import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {PaperProvider, useTheme, Snackbar, Dialog, Button} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {InventoryScreen} from './InventoryScreen';
import {AuditScreen} from './AuditScreen';
import {PrescriptionScreen} from './PrescriptionScreen';
import {SettingsScreen} from './SettingsScreen';
import {selectToastMessage, selectErrorDialog, clearMessages} from '@/store/slices/uiSlice';
import {useAppSelector, useAppDispatch} from '@/store/hooks';
import {loadMedicines, loadPrescriptions} from '@/store';

const Tab = createBottomTabNavigator();

export const MainScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const toastMessage = useAppSelector(selectToastMessage);
  const errorDialog = useAppSelector(selectErrorDialog);

  // TODO: Load data on mount after fixing database issues
  // React.useEffect(() => {
  //   dispatch(loadMedicines());
  //   dispatch(loadPrescriptions());
  // }, [dispatch]);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <View style={styles.container}>
            <Tab.Navigator
              screenOptions={{
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                tabBarStyle: {
                  backgroundColor: theme.colors.surface,
                  height: 60,
                  paddingBottom: 8,
                  paddingTop: 8,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarLabelStyle: {
                  fontSize: 12,
                },
              }}>
              <Tab.Screen
                name="Inventory"
                component={InventoryScreen}
                options={{
                  title: '库存管理',
                  tabBarLabel: '库存',
                  tabBarIcon: ({color, size}) => (
                    <Icon name="warehouse" size={size} color={color} />
                  ),
                }}
              />

              <Tab.Screen
                name="Audit"
                component={AuditScreen}
                options={{
                  title: '库存盘点',
                  tabBarLabel: '盘点',
                  tabBarIcon: ({color, size}) => (
                    <Icon name="clipboard-check" size={size} color={color} />
                  ),
                }}
              />

              <Tab.Screen
                name="Prescription"
                component={PrescriptionScreen}
                options={{
                  title: '处方抓药',
                  tabBarLabel: '处方',
                  tabBarIcon: ({color, size}) => (
                    <Icon name="bottle-tonic" size={size} color={color} />
                  ),
                }}
              />

              <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                  title: '设置',
                  tabBarLabel: '设置',
                  tabBarIcon: ({color, size}) => (
                    <Icon name="cog" size={size} color={color} />
                  ),
                }}
              />
            </Tab.Navigator>

            {/* Toast Snackbar */}
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

            {/* Error Dialog */}
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
      </SafeAreaProvider>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
