/**
 * BESONC Shared API Client
 *
 * Typed HTTP client for the BESONC BFFs. Used by all three mobile apps and
 * (optionally) the web apps. Auth token injected automatically from
 * the AsyncStorage-backed auth store.
 *
 * For v1 this is a thin fetch wrapper. In Sprint 7+ we replace it with
 * an auto-generated client from BFF OpenAPI specs.
 */

import type { ApiResponse } from '@besonc/shared-types';

export interface ApiClientConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null>;
  defaultHeaders?: Record<string, string>;
}

export class BesoncApiClient {
  constructor(private config: ApiClientConfig) {}

  async get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.request<T>('GET', path, undefined, params);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean>,
  ): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
    };

    if (this.config.getAuthToken) {
      const token = await this.config.getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;

    if (!res.ok || !json.success) {
      const message = json.error?.message ?? `HTTP ${res.status}`;
      const error = new BesoncApiError(message, res.status, json.error?.code, json.error?.details);
      throw error;
    }

    return json.data as T;
  }
}

export class BesoncApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'BesoncApiError';
  }
}
