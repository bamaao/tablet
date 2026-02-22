/**
 * MainScreen Component
 *
 * Entry point with tab navigation for the application.
 * Provides access to Inventory, Audit, and Prescription screens.
 */

import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {PaperProvider, useTheme, Text, Snackbar, Dialog, Button} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {database} from '@/database';
import {seedDatabase} from '@/database';
import {loadMedicines, loadPrescriptions} from '@/store';
import {useAppDispatch} from '@/store/hooks';
import {InventoryScreen} from './InventoryScreen';
import {AuditScreen} from './AuditScreen';
import {PrescriptionScreen} from './PrescriptionScreen';
import {SettingsScreen} from './SettingsScreen';
import {selectToastMessage, selectErrorDialog, clearMessages} from '@/store/slices/uiSlice';
import {useAppSelector} from '@/store/hooks';

const Tab = createBottomTabNavigator();

export const MainScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const toastMessage = useAppSelector(selectToastMessage);
  const errorDialog = useAppSelector(selectErrorDialog);

  // Initialize database and load data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Seed database with initial data (for development)
        await seedDatabase();

        // Load initial data
        dispatch(loadMedicines());
        dispatch(loadPrescriptions());
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [dispatch]);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <NavigationContainer>
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
        </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
};
