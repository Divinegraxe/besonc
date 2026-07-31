import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderState, OrderStateMachines, ServiceCode, type UserType } from '@besonc/shared-types';
import { randomUUID } from 'node:crypto';

export interface OrderItem {
  itemId: string;
  vendorId: string;
  name: string;
  pricePesewas: number;
  quantity: number;
  variantId?: string;
  addonSelections?: { addonId: string; optionId: string; priceDelta: number }[];
  notes?: string;
}

export interface AddressSnapshot {
  label: string;
  coordinates: { lat: number; lng: number };
  areaName: string;
  landmark?: string;
  deliveryInstructions?: string;
  contactPhone: string;
  recipientName?: string;
}

export interface Order {
  id: string;                          // YDO-CC-FO-20260731-0001
  customerId: string;
  riderId?: string;
  vendorIds: string[];                  // supports multi-vendor
  service: ServiceCode;
  stateMachine: 'A' | 'B' | 'C' | 'D' | 'E';
  state: OrderState;
  items: OrderItem[];
  deliveryAddress: AddressSnapshot;
  pickupAddress?: AddressSnapshot;       // for errands/parcels
  // Money
  itemTotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  tipPesewas: number;
  grandTotalPesewas: number;
  // Payment
  paymentMethod: 'momo' | 'card' | 'cash' | 'wallet';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentReference?: string;             // Paystack reference
  // Lifecycle
  createdAt: string;
  updatedAt: string;
  placedAt?: string;
  vendorAcceptedAt?: string;
  preparingAt?: string;
  readyForPickupAt?: string;
  riderAssignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  // Prep time
  estimatedPreparationMinutes: number;
  estimatedDeliveryAt?: string;
  // Notes
  customerNotes?: string;
  vendorNotes?: string;
  // Disputes
  hasDispute: boolean;
}

const VALID_TRANSITIONS: Record<OrderState, OrderState[]> = {
  placed: ['vendor_accepted', 'vendor_rejected', 'payment_failed', 'customer_cancelled'],
  vendor_accepted: ['preparing', 'vendor_cancelled', 'customer_cancelled'],
  preparing: ['ready_for_pickup', 'vendor_cancelled'],
  ready_for_pickup: ['rider_assigned'],
  rider_assigned: ['rider_at_vendor', 'rider_unassigned'],
  rider_at_vendor: ['picked_up', 'rider_unassigned'],
  picked_up: ['in_transit'],
  in_transit: ['arrived'],
  arrived: ['delivered'],
  delivered: [],
  vendor_rejected: [],
  vendor_cancelled: [],
  customer_cancelled: [],
  rider_unassigned: ['rider_assigned'],
  payment_failed: [],
  prescription_review: ['vendor_accepted', 'prescription_rejected', 'prescription_modified'],
  prescription_rejected: [],
  prescription_modified: ['vendor_accepted', 'customer_cancelled'],
  // Laundry
  rider_assigned_pickup: ['rider_at_customer_pickup'],
  rider_at_customer_pickup: ['picked_up_from_customer'],
  picked_up_from_customer: ['delivered_to_vendor'],
  delivered_to_vendor: ['vendor_received'],
  vendor_received: ['processing'],
  processing: ['vendor_done'],
  vendor_done: ['rider_assigned_return'],
  rider_assigned_return: ['rider_at_vendor_return'],
  rider_at_vendor_return: ['picked_up_from_vendor'],
  picked_up_from_vendor: ['return_in_transit'],
  return_in_transit: ['delivered_to_customer'],
  delivered_to_customer: [],
  // Parcel
  rider_at_pickup: ['picked_up'],
  arrived_at_dropoff: ['delivered'],
  // Errand
  rider_en_route_to_task: ['task_in_progress'],
  task_in_progress: ['items_purchased', 'topup_requested', 'item_unavailable'],
  items_purchased: ['in_transit', 'item_substituted'],
  arrived_at_customer: ['delivered'],
  topup_requested: ['topup_approved', 'topup_rejected', 'task_in_progress'],
  topup_approved: ['items_purchased', 'task_in_progress'],
  topup_rejected: ['task_in_progress', 'item_refunded'],
  item_unavailable: ['task_in_progress', 'item_refunded'],
  item_substituted: ['in_transit'],
  item_refunded: [],
};

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly orders = new Map<string, Order>();
  private readonly byCustomer = new Map<string, string[]>();
  private readonly byVendor = new Map<string, string[]>();
  private readonly byRider = new Map<string, string[]>();
  private sequence = 1;

  constructor() {
    this.seed();
  }

  private seed(): void {
    // Create a couple of sample orders
    const o1: Order = {
      id: 'YDO-CC-FO-20260731-0001',
      customerId: 'YDC-2026-000001',
      vendorIds: ['YDV-2026-0001'],
      service: 'FO',
      stateMachine: 'A',
      state: 'delivered',
      items: [{ itemId: 'itm-001', vendorId: 'YDV-2026-0001', name: 'Banku & Tilapia', pricePesewas: 4500, quantity: 1 }],
      deliveryAddress: { label: 'Home', coordinates: { lat: 5.1100, lng: -1.2400 }, areaName: 'Pedu', landmark: 'Opposite Melcom', contactPhone: '+233241234567', recipientName: 'Test Customer' },
      itemTotalPesewas: 4500,
      deliveryFeePesewas: 700,
      serviceFeePesewas: 225,
      tipPesewas: 0,
      grandTotalPesewas: 5425,
      paymentMethod: 'momo',
      paymentStatus: 'paid',
      paymentReference: 'seed-001',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 + 1800000).toISOString(),
      placedAt: new Date(Date.now() - 86400000).toISOString(),
      vendorAcceptedAt: new Date(Date.now() - 86400000 + 60000).toISOString(),
      preparingAt: new Date(Date.now() - 86400000 + 120000).toISOString(),
      readyForPickupAt: new Date(Date.now() - 86400000 + 1500000).toISOString(),
      riderAssignedAt: new Date(Date.now() - 86400000 + 1500000).toISOString(),
      pickedUpAt: new Date(Date.now() - 86400000 + 1620000).toISOString(),
      deliveredAt: new Date(Date.now() - 86400000 + 1800000).toISOString(),
      estimatedPreparationMinutes: 25,
      estimatedDeliveryAt: new Date(Date.now() - 86400000 + 1800000).toISOString(),
      hasDispute: false,
    };
    this.orders.set(o1.id, o1);
    this.byCustomer.get(o1.customerId)?.push(o1.id) ?? this.byCustomer.set(o1.customerId, [o1.id]);
    this.byVendor.get(o1.vendorIds[0])?.push(o1.id) ?? this.byVendor.set(o1.vendorIds[0], [o1.id]);
  }

  create(input: {
    customerId: string;
    service: ServiceCode;
    items: OrderItem[];
    deliveryAddress: AddressSnapshot;
    pickupAddress?: AddressSnapshot;
    paymentMethod: 'momo' | 'card' | 'cash' | 'wallet';
    paymentReference?: string;
    customerNotes?: string;
    itemTotalPesewas: number;
    deliveryFeePesewas: number;
    serviceFeePesewas: number;
    tipPesewas: number;
    grandTotalPesewas: number;
  }): Order {
    const now = new Date().toISOString();
    const id = this.nextId(input.service);
    const vendorIds = Array.from(new Set(input.items.map((i) => i.vendorId)));
    const stateMachine = OrderStateMachines[input.service];
    // v1 estimate: each item takes a fixed 25 minutes of prep. We take
    // the max across all items. If the cart is empty we fall back to
    // 15 minutes (a sensible default for any vendor).
    const estimatedPreparationMinutes = input.items.length > 0
      ? Math.max(...input.items.map(() => 25))
      : 15;
    const order: Order = {
      id,
      customerId: input.customerId,
      vendorIds,
      service: input.service,
      stateMachine,
      state: 'placed',
      items: input.items,
      deliveryAddress: input.deliveryAddress,
      pickupAddress: input.pickupAddress,
      itemTotalPesewas: input.itemTotalPesewas,
      deliveryFeePesewas: input.deliveryFeePesewas,
      serviceFeePesewas: input.serviceFeePesewas,
      tipPesewas: input.tipPesewas,
      grandTotalPesewas: input.grandTotalPesewas,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === 'cash' ? 'pending' : 'pending', // both pending until confirm
      paymentReference: input.paymentReference,
      customerNotes: input.customerNotes,
      createdAt: now,
      updatedAt: now,
      placedAt: now,
      estimatedPreparationMinutes,
      estimatedDeliveryAt: new Date(Date.now() + estimatedPreparationMinutes * 60000 + 15 * 60000).toISOString(),
      hasDispute: false,
    };
    this.orders.set(id, order);
    this.indexOrder(order);
    this.logger.log(`Order created: ${id}`);
    return order;
  }

  private indexOrder(order: Order): void {
    if (!this.byCustomer.has(order.customerId)) this.byCustomer.set(order.customerId, []);
    this.byCustomer.get(order.customerId)!.push(order.id);
    for (const v of order.vendorIds) {
      if (!this.byVendor.has(v)) this.byVendor.set(v, []);
      this.byVendor.get(v)!.push(order.id);
    }
  }

  private nextId(service: ServiceCode): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const seq = String(this.sequence++).padStart(4, '0');
    return `YDO-CC-${service}-${dateStr}-${seq}`;
  }

  getById(id: string): Order | null {
    return this.orders.get(id) ?? null;
  }

  listByCustomer(customerId: string, limit = 20): Order[] {
    const ids = this.byCustomer.get(customerId) ?? [];
    return ids.slice(-limit).reverse().map((id) => this.orders.get(id)!).filter(Boolean);
  }

  listByVendor(vendorId: string, limit = 50): Order[] {
    const ids = this.byVendor.get(vendorId) ?? [];
    return ids.slice(-limit).reverse().map((id) => this.orders.get(id)!).filter(Boolean);
  }

  listByRider(riderId: string, limit = 50): Order[] {
    const ids = this.byRider.get(riderId) ?? [];
    return ids.slice(-limit).reverse().map((id) => this.orders.get(id)!).filter(Boolean);
  }

  listAvailableForRider(): Order[] {
    return Array.from(this.orders.values()).filter((o) => o.state === 'ready_for_pickup');
  }

  transition(orderId: string, newState: OrderState, meta?: { riderId?: string; paymentStatus?: 'paid' | 'failed' | 'refunded'; vendorId?: string }): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new NotFoundException('Order not found');
    const allowed = VALID_TRANSITIONS[order.state];
    if (!allowed || !allowed.includes(newState)) {
      throw new BadRequestException(`Invalid transition: ${order.state} -> ${newState}`);
    }
    const now = new Date().toISOString();
    const previous = order.state;
    order.state = newState;
    order.updatedAt = now;

    // Set timestamps for key transitions
    if (newState === 'vendor_accepted') order.vendorAcceptedAt = now;
    if (newState === 'preparing') order.preparingAt = now;
    if (newState === 'ready_for_pickup') order.readyForPickupAt = now;
    if (newState === 'rider_assigned') {
      order.riderAssignedAt = now;
      if (meta?.riderId) {
        order.riderId = meta.riderId;
        if (!this.byRider.has(meta.riderId)) this.byRider.set(meta.riderId, []);
        this.byRider.get(meta.riderId)!.push(orderId);
      }
    }
    if (newState === 'picked_up') order.pickedUpAt = now;
    if (newState === 'delivered') order.deliveredAt = now;
    if (newState === 'customer_cancelled' || newState === 'vendor_cancelled') order.cancelledAt = now;
    if (meta?.paymentStatus) order.paymentStatus = meta.paymentStatus;

    this.logger.log(`Order ${orderId}: ${previous} -> ${newState}`);
    return order;
  }

  /** All valid next states for a given order. */
  nextStates(order: Order): OrderState[] {
    return VALID_TRANSITIONS[order.state] ?? [];
  }
}
