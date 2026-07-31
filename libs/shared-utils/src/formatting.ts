/**
 * BESONC Formatting Utilities
 */

import { pesewasToGhs } from '@besonc/shared-types';

/** Format pesewas as GHS with 2 decimal places */
export function formatGHS(pesewas: number): string {
  return `GHS ${pesewasToGhs(pesewas).toFixed(2)}`;
}

/** Format pesewas as just the number (no currency) */
export function formatGHSAmount(pesewas: number): string {
  return pesewasToGhs(pesewas).toFixed(2);
}

/** Format a distance in meters as "1.2 km" or "850 m" */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format seconds as "35 min" or "1h 5min" */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return remainingMin === 0 ? `${hours}h` : `${hours}h ${remainingMin}min`;
}

/** Format ISO date as relative time ("2 min ago", "1h ago", "Yesterday") */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
}

/** Format a Ghana phone for display: +233241234567 -> +233 24 123 4567 */
export function formatGhanaPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\s|-/g, '');
  if (cleaned.startsWith('+233') && cleaned.length === 13) {
    return `+233 ${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  return phone;
}

/** Capitalize the first letter of a string */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
