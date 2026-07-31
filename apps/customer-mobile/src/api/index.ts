import { api } from './client';
import type { ServiceCode } from '../types';

export interface Vendor {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  type: 'business' | 'individual';
  city: string;
  category: ServiceCode;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  prepTimeMinutes: number;
  minimumOrderPesewas: number;
  deliveryFeePesewas: number;
  address: string;
  phone: string;
}

export interface Item {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  pricePesewas: number;
  imageUrl?: string;
  available: boolean;
  category: string;
  preparationMinutes: number;
  tags?: string[];
  addons?: any[];
  variants?: { id: string; name: string; priceDeltaPesewas: number }[];
}

export interface Order {
  id: string;
  customerId: string;
  vendorIds: string[];
  service: ServiceCode;
  state: string;
  stateMachine: string;
  items: { itemId: string; vendorId: string; name: string; pricePesewas: number; quantity: number }[];
  itemTotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  tipPesewas: number;
  grandTotalPesewas: number;
  paymentMethod: string;
  paymentStatus: string;
  estimatedDeliveryAt?: string;
  createdAt: string;
}

export interface Quote {
  grandTotalPesewas: number;
  itemTotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  estimatedMinutes: number;
  distanceKm: number;
  formatted: {
    grandTotal: string;
    itemTotal: string;
    deliveryFee: string;
    serviceFee: string;
  };
}

export const authApi = {
  requestOtp: (phone: string, deviceId: string) =>
    api.post<{ devOtp?: string }>('/api/v1/bff/customer/auth/otp', { phone, deviceId }),
  verifyOtp: (phone: string, otp: string, deviceId: string) =>
    api.post<{ token: string; userId: string }>('/api/v1/bff/customer/auth/verify', { phone, otp, deviceId }),
};

export const catalogueApi = {
  listVendors: (category: ServiceCode) => api.get<{ data: Vendor[] }>(`/api/v1/catalogue/vendors?category=${category}&openOnly=true`).then((r) => r.data ?? []),
  getVendor: (id: string) => api.get<Vendor>(`/api/v1/catalogue/vendors/${id}`),
  getVendorItems: (id: string) => api.get<Item[]>(`/api/v1/catalogue/items/by-vendor/${id}`),
};

export const pricingApi = {
  quote: (req: {
    service: ServiceCode;
    distanceMeters: number;
    itemTotalPesewas: number;
    durationMinutes?: number;
    weightKg?: number;
    isFragile?: boolean;
    tipPesewas?: number;
  }) => api.post<Quote>('/api/v1/pricing/quote', req),
};

export const orderApi = {
  create: (order: {
    customerId: string;
    service: ServiceCode;
    items: any[];
    deliveryAddress: any;
    paymentMethod: 'momo' | 'card' | 'cash' | 'wallet';
    itemTotalPesewas: number;
    deliveryFeePesewas: number;
    serviceFeePesewas: number;
    tipPesewas: number;
    grandTotalPesewas: number;
  }) => api.post<Order>('/api/v1/orders', order),
  getById: (id: string) => api.get<Order>(`/api/v1/orders/${id}`),
  listForCustomer: (customerId: string) => api.get<Order[]>(`/api/v1/orders/by-customer/${customerId}`),
  transition: (id: string, newState: string, meta?: { riderId?: string; paymentStatus?: 'paid' | 'failed' | 'refunded' }) =>
    api.patch<Order>(`/api/v1/orders/${id}/transition`, { newState, ...meta }),
};

export const paymentApi = {
  charge: (req: { orderId: string; customerId: string; customerEmail: string; amountPesewas: number; method: 'momo' | 'card' | 'cash'; phone?: string; provider?: 'mtn' | 'vod' | 'atl' }) =>
    api.post<{ reference: string; paystackStatus: string; paymentId: string }>('/api/v1/payments/charge', req),
};
