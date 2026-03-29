import {MD3LightTheme} from 'react-native-paper';

/** 全局 Paper 主题（单源，避免多处重复定义） */
export const appPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#12968B',
    primaryContainer: '#B2DFDB',
    onPrimaryContainer: '#004D40',
    secondary: '#12968B',
    secondaryContainer: '#E0F2F1',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    error: '#BA1A1A',
    errorContainer: '#FFDAD6',
  },
};
