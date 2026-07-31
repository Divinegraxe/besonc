/**
 * BESONC Validation Utilities
 */

import { ID_PATTERNS } from '@besonc/shared-types';

export function isValidCustomerId(id: string): boolean {
  return ID_PATTERNS.customer.test(id);
}

export function isValidRiderId(id: string): boolean {
  return ID_PATTERNS.rider.test(id);
}

export function isValidVendorId(id: string): boolean {
  return ID_PATTERNS.vendor.test(id);
}

export function isValidOrderId(id: string): boolean {
  return ID_PATTERNS.order.test(id);
}

/** Validate that a string is a positive integer */
export function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

/** Validate a GHS amount (must be > 0) */
export function isValidGHSAmount(amount: number): boolean {
  return typeof amount === 'number' && amount > 0 && Number.isFinite(amount);
}

/** Validate email (basic, server-side should also do MX check) */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
