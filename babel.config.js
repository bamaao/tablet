module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      '@nozbe/watermelondb/decorators',
      {
        // Enable WatermelonDB decorators
        imports: true,
      },
    ],
    '@babel/plugin-proposal-decorators',
  ],
};
