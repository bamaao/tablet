import React from 'react';
import {StatusBar, SafeAreaProvider} from 'react-native';
import {Provider} from 'react-redux';
import {PaperProvider, MD3LightTheme} from 'react-native-paper';
import {store} from './store';
import {AppNavigator} from './navigation/AppNavigator';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00695C',
    primaryContainer: '#4DB6AC',
    secondary: '#00695C',
    secondaryContainer: '#B2DFDB',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    error: '#BA1A1A',
    errorContainer: '#FFDAD6',
  },
};

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor={theme.colors.primary} />
          <AppNavigator />
        </SafeAreaProvider>
      </PaperProvider>
    </Provider>
  );
}

export default React.memo(App);
