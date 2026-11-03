const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
const previous = config.resolver.blockList;
// PC-only media tools and generated bundles must not enter Metro's module map.
config.resolver.blockList = [...(Array.isArray(previous) ? previous : previous ? [previous] : []), /[/\\]\.expo[/\\](?:audio-tools|ios-preflight|redesign-before-[^/\\\\]+|concept-release-[^/\\]+|deck-release-[^/\\]+|concept-lab-[^/\\]+)[/\\].*/];
module.exports = config;
