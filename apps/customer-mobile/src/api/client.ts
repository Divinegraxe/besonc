import { Platform } from 'react-native';

// On Android emulator, localhost = 10.0.2.2 (not the host machine's localhost).
// On iOS simulator, localhost works directly.
// On physical device, use the dev machine's LAN IP.
function getApiBaseUrl(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
}

export const API_BASE_URL = getApiBaseUrl();

let authToken: string | null = null;
export function setAuthToken(token: string | null) { authToken = token; }
export function getAuthToken(): string | null { return authToken; }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...init, headers });
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
