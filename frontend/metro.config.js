const {
  withNativeWind: withNativeWind
} = require("nativewind/metro");

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.assetExts.push(
  // Audio formats
  'wav',
  'mp3',
  'flac',
  'm4a',
  'aac',
  'ogg',
  // Font formats
  'ttf',
  'otf',
  'woff',
  'woff2'
);

// Add support for SVG
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts.push('svg');

// Add path aliases
config.resolver.alias = {
  '@': path.resolve(__dirname, 'app'),
  '@/components': path.resolve(__dirname, 'app/components'),
  '@/screens': path.resolve(__dirname, 'app/screens'),
  '@/store': path.resolve(__dirname, 'app/store'),
  '@/utils': path.resolve(__dirname, 'app/utils'),
  '@/hooks': path.resolve(__dirname, 'app/hooks'),
  '@/theme': path.resolve(__dirname, 'app/theme'),
  '@/types': path.resolve(__dirname, 'app/types')
};

// Enable symlinks for monorepo support
config.resolver.unstable_enableSymlinks = true;

// Add node_modules resolution for better module finding
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '..', 'node_modules')
];

// Increase the maximum bundle size for development
config.transformer.maxWorkers = 2;

// Add support for web platform
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = withNativeWind(config, {
  input: "./global.css"
});