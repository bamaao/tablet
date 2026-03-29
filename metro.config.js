const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const extraNodeModules = {
  '@': path.resolve(__dirname, './src'),
  '@/components': path.resolve(__dirname, './src/components'),
  '@/screens': path.resolve(__dirname, './src/screens'),
  '@/store': path.resolve(__dirname, './src/store'),
  '@/database': path.resolve(__dirname, './src/database'),
  '@/utils': path.resolve(__dirname, './src/utils'),
  '@/services': path.resolve(__dirname, './src/services'),
  '@/hooks': path.resolve(__dirname, './src/hooks'),
  '@/types': path.resolve(__dirname, './src/types'),
};

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules,
  },
  watchFolders: [],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
