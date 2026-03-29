import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Provider} from 'react-redux';
import {PaperProvider} from 'react-native-paper';
import {store} from './store';
import {AppNavigator} from './navigation/AppNavigator';
import {appPaperTheme} from './theme/appTheme';

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <PaperProvider theme={appPaperTheme}>
        <SafeAreaProvider>
          <StatusBar
            barStyle="light-content"
            backgroundColor={appPaperTheme.colors.primary}
          />
          <AppNavigator />
        </SafeAreaProvider>
      </PaperProvider>
    </Provider>
  );
}

export default App;
