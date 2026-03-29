module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'module:@react-native/babel-preset',
        {
          useTransformReactJSX: true,
          lazyImport: true,
        },
      ],
    ],
    plugins: [
      ['@babel/plugin-proposal-decorators', {legacy: true}],
      'react-native-reanimated/plugin',
    ],
  };
};
