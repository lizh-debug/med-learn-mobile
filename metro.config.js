// Metro config for .md file support
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'md' to source extensions so metro transpiles them as source (text)
config.resolver.sourceExts.push('md');

// Add 'md' to asset extensions as fallback
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'md');

module.exports = config;
