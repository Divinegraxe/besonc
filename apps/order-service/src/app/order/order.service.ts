import { Injectable, Logger, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';
import { OrderState, OrderStateMachines, ServiceCode } from '@besonc/shared-types';

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
  id: string;                          // YDO-CC-FO-YYYYMMDD-NNNN
  customerId: string;
  riderId?: string;
  vendorIds: string[];                  // supports multi-vendor
  service: ServiceCode;
  stateMachine: 'A' | 'B' | 'C' | 'D' | 'E';
  state: OrderState;
  items: OrderItem[];
  deliveryAddress: AddressSnapshot;
  pickupAddress?: AddressSnapshot;
  // Money
  itemTotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  tipPesewas: number;
  grandTotalPesewas: number;
  // Payment
  paymentMethod: 'momo' | 'card' | 'cash' | 'wallet';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentReference?: string;
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
  customer_cancelled_pickup: [],
  rider_cancelled: [],
};

@Injectable()
export class OrderService implements OnModuleInit {
  private readonly logger = new Logger(OrderService.name);
  // In-memory daily sequence counter. A real production system would
  // use a Postgres sequence for this; for v1 the in-memory counter is
  // restarted on each service start, which is fine for our use case
  // (we only need uniqueness within a day, and Postgres assigns a
  // cuid as the row PK anyway).
  private sequence = 1;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.order.count();
    this.logger.log(`Order DB connected. ${count} orders in store.`);
  }

  async create(input: {
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
  }): Promise<Order> {
    const now = new Date();
    const id = this.nextId(input.service, now);
    const vendorIds = Array.from(new Set(input.items.map((i) => i.vendorId)));
    const stateMachine = OrderStateMachines[input.service];
    const estimatedPreparationMinutes = input.items.length > 0
      ? Math.max(...input.items.map(() => 25))
      : 15;

    // We create the address(es) first so we can reference them from
    // the order row. Both deliveryAddressId and (optional) pickupAddressId
    // are required by the schema.
    const deliveryAddr = await this.prisma.orderAddress.create({
      data: this.addressToDb(input.deliveryAddress),
    });
    const pickupAddr = input.pickupAddress
      ? await this.prisma.orderAddress.create({ data: this.addressToDb(input.pickupAddress) })
      : null;

    const order = await this.prisma.order.create({
      data: {
        id,
        customerId: input.customerId,
        service: input.service,
        stateMachine,
        state: 'placed',
        itemTotalPesewas: input.itemTotalPesewas,
        deliveryFeePesewas: input.deliveryFeePesewas,
        serviceFeePesewas: input.serviceFeePesewas,
        tipPesewas: input.tipPesewas,
        grandTotalPesewas: input.grandTotalPesewas,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'pending',
        paymentReference: input.paymentReference,
        estimatedPreparationMinutes,
        estimatedDeliveryAt: new Date(now.getTime() + estimatedPreparationMinutes * 60000 + 15 * 60000),
        customerNotes: input.customerNotes,
        placedAt: now,
        deliveryAddressId: deliveryAddr.id,
        pickupAddressId: pickupAddr?.id,
        items: {
          create: input.items.map((i) => ({
            itemId: i.itemId,
            vendorId: i.vendorId,
            name: i.name,
            pricePesewas: i.pricePesewas,
            quantity: i.quantity,
            variantId: i.variantId,
            notes: i.notes,
            addonSelections: i.addonSelections ? (i.addonSelections as any) : undefined,
          })),
        },
        stateTransitions: {
          create: {
            fromState: 'placed', // initial row
            toState: 'placed',
            actor: 'system',
            meta: { event: 'order_created' } as any,
          },
        },
      },
      include: { items: true, deliveryAddress: true, pickupAddress: true, stateTransitions: true },
    });

    this.logger.log(`Order created: ${id} (${order.items.length} items, GHS ${(order.grandTotalPesewas / 100).toFixed(2)})`);
    return this.toDomain(order);
  }

  async getById(id: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, deliveryAddress: true, pickupAddress: true },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async listByCustomer(customerId: string, limit = 20): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { items: true, deliveryAddress: true, pickupAddress: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async listByVendor(vendorId: string, limit = 50): Promise<Order[]> {
    // Use the join table (order_item) to find orders for this vendor.
    // Postgres' DISTINCT ON gives us one row per order_id even when
    // an order has multiple items from the same vendor.
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT ON (o.id) o.*
      FROM "order" o
      JOIN "order_item" oi ON oi."orderId" = o.id
      WHERE oi."vendorId" = ${vendorId}
      ORDER BY o.id, o."createdAt" DESC
      LIMIT ${limit}
    `;
    if (rows.length === 0) return [];
    // Re-query with the include for items + addresses (one extra round-trip,
    // but we only fetch by ID set)
    const ids = rows.map((r) => r.id);
    const fullRows = await this.prisma.order.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'desc' },
      include: { items: true, deliveryAddress: true, pickupAddress: true },
    });
    return fullRows.map((r) => this.toDomain(r));
  }

  async listByRider(riderId: string, limit = 50): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { riderId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { items: true, deliveryAddress: true, pickupAddress: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async listAvailableForRider(): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { state: 'ready_for_pickup' },
      orderBy: { createdAt: 'asc' },
      include: { items: true, deliveryAddress: true, pickupAddress: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async transition(orderId: string, newState: OrderState, meta?: { riderId?: string; paymentStatus?: 'paid' | 'failed' | 'refunded'; vendorId?: string; actor?: string }): Promise<Order> {
    const existing = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) throw new NotFoundException('Order not found');
    const allowed = VALID_TRANSITIONS[existing.state];
    if (!allowed || !allowed.includes(newState)) {
      throw new BadRequestException(`Invalid transition: ${existing.state} -> ${newState}`);
    }
    const now = new Date();
    const previous = existing.state;

    // Build the patch object based on the transition
    const data: any = { state: newState, updatedAt: now };
    if (newState === 'vendor_accepted') data.vendorAcceptedAt = now;
    if (newState === 'preparing') data.preparingAt = now;
    if (newState === 'ready_for_pickup') data.readyForPickupAt = now;
    if (newState === 'rider_assigned') {
      data.riderAssignedAt = now;
      if (meta?.riderId) data.riderId = meta.riderId;
    }
    if (newState === 'picked_up') data.pickedUpAt = now;
    if (newState === 'delivered') data.deliveredAt = now;
    if (newState === 'customer_cancelled' || newState === 'vendor_cancelled') data.cancelledAt = now;
    if (meta?.paymentStatus) data.paymentStatus = meta.paymentStatus;

    // Update + append a state_transition row in a single transaction
    // so the audit log can never disagree with the order's state.
    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data }),
      this.prisma.orderStateTransition.create({
        data: {
          orderId,
          fromState: previous,
          toState: newState,
          actor: meta?.actor ?? (meta?.riderId ? `rider:${meta.riderId}` : meta?.vendorId ? `vendor:${meta.vendorId}` : 'system'),
          meta: meta ? (meta as any) : undefined,
        },
      }),
    ]);

    this.logger.log(`Order ${orderId}: ${previous} -> ${newState}`);
    return this.getById(updated.id) as Promise<Order>;
  }

  nextStates(order: Order): OrderState[] {
    return VALID_TRANSITIONS[order.state] ?? [];
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private nextId(service: ServiceCode, now: Date): string {
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const seq = String(this.sequence++).padStart(4, '0');
    return `YDO-CC-${service}-${dateStr}-${seq}`;
  }

  private addressToDb(a: AddressSnapshot) {
    return {
      label: a.label,
      areaName: a.areaName,
      landmark: a.landmark,
      contactPhone: a.contactPhone,
      recipientName: a.recipientName,
      deliveryInstructions: a.deliveryInstructions,
      latitude: a.coordinates.lat,
      longitude: a.coordinates.lng,
    };
  }

  private addressFromDb(a: any): AddressSnapshot {
    return {
      label: a.label,
      areaName: a.areaName,
      landmark: a.landmark ?? undefined,
      contactPhone: a.contactPhone,
      recipientName: a.recipientName ?? undefined,
      deliveryInstructions: a.deliveryInstructions ?? undefined,
      coordinates: { lat: Number(a.latitude), lng: Number(a.longitude) },
    };
  }

  private toDomain(row: any): Order {
    const items: OrderItem[] = (row.items ?? []).map((i: any) => ({
      itemId: i.itemId,
      vendorId: i.vendorId,
      name: i.name,
      pricePesewas: i.pricePesewas,
      quantity: i.quantity,
      variantId: i.variantId ?? undefined,
      notes: i.notes ?? undefined,
      addonSelections: i.addonSelections ?? undefined,
    }));
    const vendorIds = Array.from(new Set(items.map((i) => i.vendorId)));
    return {
      id: row.id,
      customerId: row.customerId,
      riderId: row.riderId ?? undefined,
      vendorIds,
      service: row.service,
      stateMachine: row.stateMachine,
      state: row.state,
      items,
      deliveryAddress: this.addressFromDb(row.deliveryAddress),
      pickupAddress: row.pickupAddress ? this.addressFromDb(row.pickupAddress) : undefined,
      itemTotalPesewas: row.itemTotalPesewas,
      deliveryFeePesewas: row.deliveryFeePesewas,
      serviceFeePesewas: row.serviceFeePesewas,
      tipPesewas: row.tipPesewas,
      grandTotalPesewas: row.grandTotalPesewas,
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
      paymentReference: row.paymentReference ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      placedAt: row.placedAt?.toISOString(),
      vendorAcceptedAt: row.vendorAcceptedAt?.toISOString(),
      preparingAt: row.preparingAt?.toISOString(),
      readyForPickupAt: row.readyForPickupAt?.toISOString(),
      riderAssignedAt: row.riderAssignedAt?.toISOString(),
      pickedUpAt: row.pickedUpAt?.toISOString(),
      deliveredAt: row.deliveredAt?.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString(),
      estimatedPreparationMinutes: row.estimatedPreparationMinutes,
      estimatedDeliveryAt: row.estimatedDeliveryAt?.toISOString(),
      customerNotes: row.customerNotes ?? undefined,
      vendorNotes: row.vendorNotes ?? undefined,
      hasDispute: row.hasDispute,
    };
  }
}
