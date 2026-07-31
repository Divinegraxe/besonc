/**
 * BESONC Environment Variable Helpers
 *
 * Throws if a required env var is missing. Use at app/service startup.
 */

export class MissingEnvError extends Error {
  constructor(public readonly key: string) {
    super(`Missing required environment variable: ${key}`);
    this.name = 'MissingEnvError';
  }
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new MissingEnvError(key);
  }
  return value;
}

export function optionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value : defaultValue;
}

export function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}
