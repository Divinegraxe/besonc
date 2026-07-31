import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Besonc Customer',
  slug: 'besonc-customer',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'besonc',
  userInterfaceStyle: 'light',
  splash: {
    backgroundColor: '#00A86B',
    resizeMode: 'contain',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'gh.besonc.customer',
  },
  android: {
    package: 'gh.besonc.customer',
    adaptiveIcon: {
      backgroundColor: '#00A86B',
    },
  },
  extra: {
    apiBaseUrl: 'http://localhost:3000',
  },
};

export default config;
