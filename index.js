/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

// Filter out react-native-voice NativeEventEmitter warnings (harmless 3rd party library warning)
const originalWarn = console.warn;
console.warn = function (...args) {
  const message = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
  if (
    message.includes('NativeEventEmitter') &&
    (message.includes('addListener') || message.includes('removeListeners'))
  ) {
    return; // Suppress this warning - it's from react-native-voice library
  }
  return originalWarn.apply(console, args);
};

AppRegistry.registerComponent(appName, () => App);
