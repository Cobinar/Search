// metro.config.js
// Required for react-native-webrtc: React Native itself depends on
// event-target-shim@5, but react-native-webrtc depends on @6 — without this
// redirect, Metro resolves the wrong version for WebRTC's own code and the
// build breaks or calls behave incorrectly. This is a documented, known
// gotcha, not a defensive guess.
//
// If you already have a metro.config.js, merge resolver.resolveRequest in
// rather than overwriting your existing config.

const { getDefaultConfig } = require('expo/metro-config');
const resolveFrom = require('resolve-from');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('event-target-shim') &&
    context.originModulePath.includes('react-native-webrtc')
  ) {
    const eventTargetShimPath = resolveFrom(context.originModulePath, 'event-target-shim/index.js');
    return { type: 'sourceFile', filePath: eventTargetShimPath };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;