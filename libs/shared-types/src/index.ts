/**
 * BESONC Shared Types
 *
 * Single source of truth for all TypeScript types, enums, and constants
 * shared across customer/vendor/rider/admin apps and all 16 NestJS services.
 *
 * Mirrors the v3.1 plan's ID formats, service codes, city codes, and
 * state machines. All money is in pesewas (1 GHS = 100 pesewas).
 */

// ============================================================================
// USER TYPES
// ============================================================================

export type UserType = 'customer' | 'vendor' | 'rider' | 'admin';

export type CityCode = 'CC' | 'AC' | 'KS' | 'TK' | 'TM';

export const CityCodes = {
  CC: 'CC', // Cape Coast (launch)
  AC: 'AC', // Accra
  KS: 'KS', // Kumasi
  TK: 'TK', // Takoradi
  TM: 'TM', // Tema
} as const;

export const CityNames: Record<CityCode, string> = {
  CC: 'Cape Coast',
  AC: 'Accra',
  KS: 'Kumasi',
  TK: 'Takoradi',
  TM: 'Tema',
};

// ============================================================================
// SERVICE CODES (the 8 BESONC services — locked, no others)
// ============================================================================

export type ServiceCode = 'FO' | 'GR' | 'SH' | 'MK' | 'PH' | 'LD' | 'PR' | 'ER';

export const ServiceCodes = {
  FO: 'FO', // Food
  GR: 'GR', // Groceries
  SH: 'SH', // Shop
  MK: 'MK', // Market
  PH: 'PH', // Pharmacy & Health
  LD: 'LD', // Laundry
  PR: 'PR', // Parcel & Courier
  ER: 'ER', // Errands & Personal Assistant
} as const;

export const ServiceNames: Record<ServiceCode, string> = {
  FO: 'Food',
  GR: 'Groceries',
  SH: 'Shop',
  MK: 'Market',
  PH: 'Pharmacy & Health',
  LD: 'Laundry',
  PR: 'Parcel & Courier',
  ER: 'Errands & Personal Assistant',
};

export type ServiceEngine = 'catalogue' | 'request';
export const ServiceEngines: Record<ServiceCode, ServiceEngine> = {
  FO: 'catalogue',
  GR: 'catalogue',
  SH: 'catalogue',
  MK: 'catalogue',
  PH: 'catalogue',
  LD: 'catalogue',
  PR: 'request',
  ER: 'request',
};

// ============================================================================
// ID FORMATS
// ============================================================================

/**
 * Customer ID: YDC-YYYY-NNNNNN
 * Example: YDC-2026-000458
 */
export interface CustomerId {
  type: 'customer';
  value: string; // YDC-YYYY-NNNNNN
  year: number;
  sequence: number;
}

/**
 * Rider ID: YDR-YYYY-NNNN (per city per year)
 * Example: YDR-2026-0001
 */
export interface RiderId {
  type: 'rider';
  value: string; // YDR-YYYY-NNNN
  year: number;
  city: CityCode;
  sequence: number;
}

/**
 * Vendor ID: YDV-YYYY-NNNN (per city per year)
 * Example: YDV-2026-0123
 */
export interface VendorId {
  type: 'vendor';
  value: string; // YDV-YYYY-NNNN
  year: number;
  city: CityCode;
  sequence: number;
}

/**
 * Order ID: YDO-[CITY]-[SERVICE]-[YYYYMMDD]-[SEQ]
 * Example: YDO-CC-FO-20260321-0001
 */
export interface OrderId {
  type: 'order';
  value: string; // YDO-CC-FO-20260321-0001
  city: CityCode;
  service: ServiceCode;
  date: string; // YYYYMMDD
  sequence: number;
}

// ID format regexes (for validation)
export const ID_PATTERNS = {
  customer: /^YDC-\d{4}-\d{6}$/,
  rider: /^YDR-\d{4}-\d{4}$/,
  vendor: /^YDV-\d{4}-\d{4}$/,
  order: /^YDO-[A-Z]{2}-[A-Z]{2}-\d{8}-\d{4}$/,
} as const;

// ============================================================================
// ORDER STATE MACHINES
// ============================================================================

export type OrderState =
  // State Machine A: Standard Catalogue (Food, Groceries, Shop, Market, Pharmacy)
  | 'placed'
  | 'vendor_accepted'
  | 'vendor_rejected'
  | 'preparing'
  | 'ready_for_pickup'
  | 'rider_assigned'
  | 'rider_at_vendor'
  | 'picked_up'
  | 'in_transit'
  | 'arrived'
  | 'delivered'
  | 'vendor_cancelled'
  | 'customer_cancelled'
  | 'rider_unassigned'
  | 'payment_failed'
  // State Machine B extras
  | 'prescription_review'
  | 'prescription_rejected'
  | 'prescription_modified'
  // State Machine C extras (Laundry two-trip)
  | 'rider_assigned_pickup'
  | 'rider_at_customer_pickup'
  | 'picked_up_from_customer'
  | 'delivered_to_vendor'
  | 'vendor_received'
  | 'processing'
  | 'vendor_done'
  | 'rider_assigned_return'
  | 'rider_at_vendor_return'
  | 'picked_up_from_vendor'
  | 'return_in_transit'
  | 'delivered_to_customer'
  // State Machine D extras (Parcel)
  | 'rider_at_pickup'
  | 'arrived_at_dropoff'
  // State Machine E extras (Errand)
  | 'rider_en_route_to_task'
  | 'task_in_progress'
  | 'items_purchased'
  | 'arrived_at_customer'
  | 'topup_requested'
  | 'topup_approved'
  | 'topup_rejected'
  | 'item_unavailable'
  | 'item_substituted'
  | 'item_refunded';

export type OrderStateMachine = 'A' | 'B' | 'C' | 'D' | 'E';

export const OrderStateMachines: Record<ServiceCode, OrderStateMachine> = {
  FO: 'A',
  GR: 'A',
  SH: 'A',
  MK: 'A',
  PH: 'B',
  LD: 'C',
  PR: 'D',
  ER: 'E',
};

// ============================================================================
// MONEY
// ============================================================================

/** All money in BESONC is stored in pesewas. 1 GHS = 100 pesewas. */
export const PESEWAS_PER_GHS = 100;

export function ghsToPesewas(ghs: number): number {
  return Math.round(ghs * PESEWAS_PER_GHS);
}

export function pesewasToGhs(pesewas: number): number {
  return pesewas / PESEWAS_PER_GHS;
}

export function formatGHS(pesewas: number): string {
  return `GHS ${(pesewas / PESEWAS_PER_GHS).toFixed(2)}`;
}

// ============================================================================
// PRICING (Cape Coast launch — locked from dev plan)
// ============================================================================

export const Pricing = {
  // Customer
  CUSTOMER_BASE_DISPATCH_FEE_PESEWAS: ghsToPesewas(4), // GHS 4
  CUSTOMER_PER_KM_PESEWAS: ghsToPesewas(2), // GHS 2/km

  // Rider
  RIDER_BASE_PAY_PESEWAS: ghsToPesewas(4), // GHS 4
  RIDER_PICKUP_PER_KM_PESEWAS: ghsToPesewas(1.0), // GHS 1/km
  RIDER_DELIVERY_PER_KM_PESEWAS: ghsToPesewas(2.5), // GHS 2.50/km

  // Delivery fee tiers
  DELIVERY_FEE_TIERS: [
    { maxKm: 3, baseGhs: 5, perKmGhs: 1.5 },
    { maxKm: 7, baseGhs: 8, perKmGhs: 1.2 },
    { maxKm: 15, baseGhs: 12, perKmGhs: 1.0 },
    { maxKm: Infinity, baseGhs: 18, perKmGhs: 0.8 },
  ],

  // Service fees (% of item total, with min/max in pesewas)
  SERVICE_FEE: {
    FO: { percent: 5, minPesewas: ghsToPesewas(2), maxPesewas: ghsToPesewas(15) },
    GR: { percent: 4, minPesewas: 0, maxPesewas: Infinity },
    SH: { percent: 5, minPesewas: 0, maxPesewas: Infinity },
    MK_CATALOGUE: { percent: 5, minPesewas: 0, maxPesewas: Infinity },
    MK_SHOPPING_LIST: { percent: 7, minPesewas: 0, maxPesewas: Infinity },
    PH: { percent: 4, minPesewas: 0, maxPesewas: Infinity },
    LD: { percent: 5, minPesewas: 0, maxPesewas: Infinity },
    PR: { flatPesewas: ghsToPesewas(3) },
    ER: { percent: 8, minPesewas: 0, maxPesewas: Infinity, of: 'estimated_task_cost' },
  },

  // Rider withdrawal
  MIN_WITHDRAWAL_PESEWAS: ghsToPesewas(50),
  MAX_DAILY_WITHDRAWAL_PESEWAS: ghsToPesewas(2000),
  FREE_WITHDRAWALS_PER_DAY: 1,
  WITHDRAWAL_FEE_PESEWAS: ghsToPesewas(2),

  // Wallet limits (rider)
  WALLET_LIMIT_NEW_PESEWAS: ghsToPesewas(1000),
  WALLET_LIMIT_EXPERIENCED_PESEWAS: ghsToPesewas(3000),
  WALLET_LIMIT_SENIOR_PESEWAS: ghsToPesewas(5000),
} as const;

// ============================================================================
// PAYMENTS — Paystack
// ============================================================================

/**
 * Paystack bank codes for Ghana Mobile Money.
 * CRITICAL: Charge API uses LOWERCASE, Transfer Recipient API uses UPPERCASE.
 * See besonc-v3-plan.md Section 8.1.
 */
export const PaystackChargeProvider = {
  MTN: 'mtn',
  VODAFONE: 'vod', // 'Telecel' brand, 'vod' slug
  AIRTELTIGO: 'atl',
} as const;

export const PaystackTransferBankCode = {
  MTN: 'MTN',
  VODAFONE: 'VOD',
  AIRTELTIGO: 'ATL',
} as const;

export type PaystackMobileMoneyProvider = keyof typeof PaystackChargeProvider;

// ============================================================================
// REVENUE LEDGER (per v3.1 Path A — simple balance table)
// ============================================================================

/**
 * Reasons for ledger entries.
 * One row per money movement in the balance_ledger_entries table.
 */
export type LedgerReasonCode =
  | 'order_payment'
  | 'refund'
  | 'vendor_settlement'
  | 'rider_earning'
  | 'rider_payout'
  | 'cod_collection'
  | 'cod_remittance'
  | 'penalty'
  | 'promo_credit'
  | 'manual_adjustment'
  | 'wallet_topup'
  | 'service_fee'
  | 'tip'
  | 'platform_revenue';

export interface LedgerEntry {
  entryId: string;
  userId: string;
  userType: UserType;
  /** Positive = credit, negative = debit. Always in pesewas. */
  deltaPesewas: number;
  reason: LedgerReasonCode;
  referenceType?: 'order' | 'payout' | 'refund' | 'wallet_topup' | 'dispute';
  referenceId?: string;
  paystackRef?: string;
  createdAt: string; // ISO 8601
}

// ============================================================================
// COMMON API RESPONSE WRAPPERS
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
