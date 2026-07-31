import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Expo dynamic config. `app.json` is the static source of truth; this file
 * is invoked AFTER Expo reads app.json and passed the normalized config as
 * `config`. We use it to:
 *   - override `apiBaseUrl` from the BESONC_API_BASE_URL env var (if set)
 *   - add any dev-time overrides
 *
 * If app.json and this file disagree, this file wins.
 */
const config = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  extra: {
    ...(config.extra ?? {}),
    apiBaseUrl: process.env.BESONC_API_BASE_URL ?? config.extra?.apiBaseUrl ?? 'http://localhost:3000',
  },
});

export default config;
