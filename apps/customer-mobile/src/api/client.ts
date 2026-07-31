import { Platform } from 'react-native';

// API base URL resolution for the customer mobile app.
//
// On Android emulator: 10.0.2.2 = host machine's localhost.
// On iOS simulator:    localhost works (same machine).
// On physical device:  must be the dev machine's LAN IP. Set it once with:
//                        EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:3000 npx expo start --clear
//                      (the EXPO_PUBLIC_ prefix is required for build-time
//                       inlining — see Expo SDK 49+ docs).
//
// We also support a runtime override via AsyncStorage (`besonc.apiBaseUrl`)
// so you can change the backend URL without rebuilding the app. The
// LoginScreen has a "Backend URL" option in dev mode that sets this.
const DEFAULT_BASE_URL = (() => {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv;
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
})();

let apiBaseUrl: string = DEFAULT_BASE_URL;
export function getApiBaseUrl(): string { return apiBaseUrl; }
export async function loadApiBaseUrlOverride(): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const override = await AsyncStorage.getItem('besonc.apiBaseUrl');
    if (override && override.trim().length > 0) apiBaseUrl = override.trim();
  } catch {
    // ignore — AsyncStorage may not be available in tests
  }
}
export async function setApiBaseUrl(url: string): Promise<void> {
  apiBaseUrl = url;
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('besonc.apiBaseUrl', url);
  } catch {
    // ignore
  }
}

let authToken: string | null = null;
export function setAuthToken(token: string | null) { authToken = token; }
export function getAuthToken(): string | null { return authToken; }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const url = `${apiBaseUrl}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    throw new Error(
      `Could not reach the BESONC backend at ${apiBaseUrl}. ` +
      `On a physical phone, set EXPO_PUBLIC_API_BASE_URL=http://<your-mac-lan-ip>:3000 ` +
      `before starting Expo, or change the Backend URL in the login screen. ` +
      `(${message})`,
    );
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const message = json.error?.message ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
