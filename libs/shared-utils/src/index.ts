/**
 * BESONC Shared Utils
 *
 * Pure functions used across all apps. No I/O, no external deps.
 */

import { ID_PATTERNS, ServiceCode, type UserType } from '@besonc/shared-types';

export * from './formatting';
export * from './validation';
export * from './env';

/** Ghana phone number validation. Format: +233XXXXXXXXX or 0XXXXXXXXX */
export function isValidGhanaPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s|-/g, '');
  // +233 followed by 9 digits, OR 0 followed by 9 digits
  return /^(\+233|0)\d{9}$/.test(cleaned);
}

/** Normalize Ghana phone to international format (+233XXXXXXXXX) */
export function normalizeGhanaPhone(phone: string): string {
  const cleaned = phone.replace(/\s|-/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+233' + cleaned.slice(1);
  }
  return cleaned;
}

/** Mask phone for display: +233XX XXX 1234 -> +233XX XXX 1234 (last 4 visible) */
export function maskPhone(phone: string): string {
  if (phone.length < 8) return '***';
  return phone.slice(0, 6) + '***' + phone.slice(-2);
}

/** Generate a short, readable ID suffix (for support tickets, etc.) */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Sleep for ms (used in retries, tests) */
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Pick a random element from an array */
export function pickRandom<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('Cannot pick from empty array');
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Deep clone via JSON (safe for plain data, not for Date/Map/Set) */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Check if a string is a valid UUID v4 */
export function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
