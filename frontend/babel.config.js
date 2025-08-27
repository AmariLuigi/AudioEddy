module.exports = function(api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", {
      jsxImportSource: "nativewind"
    }], "nativewind/babel"],
    plugins: [
      // Module resolver for path aliases
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './app',
            '@/components': './app/components',
            '@/screens': './app/screens',
            '@/store': './app/store',
            '@/utils': './app/utils',
            '@/hooks': './app/hooks',
            '@/theme': './app/theme',
            '@/types': './app/types'
          },
        },
      ],
      // Required for react-native-reanimated (must be last)
      'react-native-reanimated/plugin'
    ],
  };
};