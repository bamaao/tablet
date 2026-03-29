/**
 * Tab 级代码分割：首次进入对应 Tab 时再拉取 chunk，配合 Navigator lazy 减少首屏工作量。
 */
import React, {Suspense, lazy} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useTheme} from 'react-native-paper';

const InventoryLazy = lazy(() =>
  import('./InventoryScreen').then(m => ({default: m.InventoryScreen})),
);
const AuditLazy = lazy(() => import('./AuditScreen').then(m => ({default: m.AuditScreen})));
const PrescriptionLazy = lazy(() =>
  import('./PrescriptionScreen').then(m => ({default: m.PrescriptionScreen})),
);
const SettingsLazy = lazy(() =>
  import('./SettingsScreen').then(m => ({default: m.SettingsScreen})),
);

const TabFallback: React.FC = () => {
  const theme = useTheme();
  return (
    <View style={[styles.fallback, {backgroundColor: theme.colors.background}]}>
      <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel="加载中" />
    </View>
  );
};

function withSuspense(Lazy: React.LazyExoticComponent<React.FC>): React.FC {
  const Screen: React.FC = () => (
    <Suspense fallback={<TabFallback />}>
      <Lazy />
    </Suspense>
  );
  Screen.displayName = `Suspense(${Lazy.displayName ?? 'LazyTab'})`;
  return Screen;
}

export const InventoryTabScreen = withSuspense(InventoryLazy);
export const AuditTabScreen = withSuspense(AuditLazy);
export const PrescriptionTabScreen = withSuspense(PrescriptionLazy);
export const SettingsTabScreen = withSuspense(SettingsLazy);

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
