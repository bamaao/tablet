/**
 * Fixes for common import issues
 */

// Fix for React Native Paper imports that might be missing
export const fixReactNativePaperImports = {
  Text: require('react-native-paper').Text,
  Button: require('react-native-paper').Button,
  TextInput: require('react-native-paper').TextInput,
  Card: require('react-native-paper').Card,
  List: require('react-native-paper').List,
  FAB: require('react-native-paper').FAB,
  Dialog: require('react-native-paper').Dialog,
  ProgressBar: require('react-native-paper').ProgressBar,
  Searchbar: require('react-native-paper').Searchbar,
  SegmentedButtons: require('react-native-paper').SegmentedButtons,
  Divider: require('react-native-paper').Divider,
  Portal: require('react-native-paper').Portal,
  IconButton: require('react-native-paper').IconButton,
  Snackbar: require('react-native-paper').Snackbar,
  useTheme: require('react-native-paper').useTheme,
  MD3LightTheme: require('react-native-paper').MD3LightTheme,
  MD3Colors: require('react-native-paper').MD3Colors,
};

// Fix for React Native Safe Area Context
export const safeAreaContextExports = {
  SafeAreaView: require('react-native-safe-area-context').SafeAreaView,
  useSafeAreaInsets: require('react-native-safe-area-context').useSafeAreaInsets,
  SafeAreaProvider: require('react-native-safe-area-context').SafeAreaProvider,
};

// Fix for React Native Gesture Handler
export const gestureHandlerExports = {
  GestureDetector: require('react-native-gesture-handler').GestureDetector,
  Gesture: require('react-native-gesture-handler').Gesture,
  ScrollView: require('react-native-gesture-handler').ScrollView,
};

// Fix for React Native Vector Icons
export const vectorIconsExports = {
  default: require('react-native-vector-icons').default,
  Icon: require('react-native-vector-icons').default,
};

export default {
  fixReactNativePaperImports,
  safeAreaContextExports,
  gestureHandlerExports,
  vectorIconsExports,
};
