import { Injectable, Logger } from '@nestjs/common';
import { Pricing, ServiceCode, pesewasToGhs, ghsToPesewas, type ServiceEngine } from '@besonc/shared-types';

export interface QuoteRequest {
  service: ServiceCode;
  distanceMeters: number;
  itemTotalPesewas: number;
  /** For catalogue engine: total prep time; for request engine: estimated duration */
  durationMinutes?: number;
  /** Weight in kg for parcels */
  weightKg?: number;
  /** Surcharges for parcels */
  isFragile?: boolean;
  isConfidential?: boolean;
  /** Surge multiplier (1.0 = no surge) */
  surgeMultiplier?: number;
  /** Tip to rider (100% to rider, not part of platform revenue) */
  tipPesewas?: number;
}

export interface Quote {
  // Customer-facing breakdown
  itemTotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  surgeSurchargePesewas: number;
  platformTotalPesewas: number;
  tipToRiderPesewas: number;
  // What customer pays
  grandTotalPesewas: number;

  // Rider earnings (separate from customer payment)
  riderBasePayPesewas: number;
  riderPickupPayPesewas: number;
  riderDeliveryPayPesewas: number;
  riderTotalPayPesewas: number;

  // Vendor share
  vendorNetPesewas: number;

  // Platform revenue
  platformRevenuePesewas: number;

  // Distance & ETA
  distanceKm: number;
  estimatedMinutes: number;

  // Human-readable
  formatted: {
    itemTotal: string;
    deliveryFee: string;
    serviceFee: string;
    platformTotal: string;
    tipToRider: string;
    grandTotal: string;
    riderEarnings: string;
    vendorNet: string;
  };
}

/**
 * Pricing Service — calculates quotes using the v3.1 plan's locked numbers.
 * All money in pesewas. Customer pricing and rider payout are stored
 * separately per the plan's non-negotiable principle.
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  quote(req: QuoteRequest): Quote {
    const distanceKm = req.distanceMeters / 1000;
    const surge = req.surgeMultiplier ?? 1.0;

    // 1. Customer delivery fee (tiered)
    const deliveryFeeBase = this.calculateDeliveryFee(distanceKm, req.service, req.weightKg, req.isFragile, req.isConfidential);
    const surgeSurcharge = Math.round((deliveryFeeBase * (surge - 1.0)) * 100) / 100;
    const deliveryFee = Math.round(deliveryFeeBase * surge);

    // 2. Service fee (% of item total, with min/max)
    const serviceFee = this.calculateServiceFee(req.service, req.itemTotalPesewas);

    // 3. Tip (passed through)
    const tip = req.tipPesewas ?? 0;

    // 4. Customer total
    const platformTotal = deliveryFee + serviceFee + surgeSurcharge;
    const grandTotal = req.itemTotalPesewas + platformTotal + tip;

    // 5. Rider earnings
    const riderBase = Pricing.RIDER_BASE_PAY_PESEWAS;
    const riderPickup = Math.round(distanceKm * Pricing.RIDER_PICKUP_PER_KM_PESEWAS);
    const riderDelivery = Math.round(distanceKm * Pricing.RIDER_DELIVERY_PER_KM_PESEWAS);
    const riderTotal = riderBase + riderPickup + riderDelivery + tip;

    // 6. Vendor share (item total — service fee — platform commission)
    // For v1: vendor gets item total minus a 10% platform commission on item total
    const platformItemCommission = Math.round(req.itemTotalPesewas * 0.10);
    const vendorNet = req.itemTotalPesewas - platformItemCommission;

    // 7. Platform total revenue (delivery fee + service fee + surge + commission)
    const platformRevenue = platformTotal + platformItemCommission;

    return {
      itemTotalPesewas: req.itemTotalPesewas,
      deliveryFeePesewas: deliveryFee,
      serviceFeePesewas: serviceFee,
      surgeSurchargePesewas: surgeSurcharge,
      platformTotalPesewas: platformTotal,
      tipToRiderPesewas: tip,
      grandTotalPesewas: grandTotal,

      riderBasePayPesewas: riderBase,
      riderPickupPayPesewas: riderPickup,
      riderDeliveryPayPesewas: riderDelivery,
      riderTotalPayPesewas: riderTotal,

      vendorNetPesewas: vendorNet,
      platformRevenuePesewas: platformRevenue,

      distanceKm: Math.round(distanceKm * 100) / 100,
      estimatedMinutes: this.estimateMinutes(distanceKm, req.durationMinutes ?? 0),

      formatted: {
        itemTotal: this.fmt(req.itemTotalPesewas),
        deliveryFee: this.fmt(deliveryFee),
        serviceFee: this.fmt(serviceFee),
        platformTotal: this.fmt(platformTotal),
        tipToRider: this.fmt(tip),
        grandTotal: this.fmt(grandTotal),
        riderEarnings: this.fmt(riderTotal),
        vendorNet: this.fmt(vendorNet),
      },
    };
  }

  private calculateDeliveryFee(distanceKm: number, service: ServiceCode, weightKg?: number, isFragile?: boolean, isConfidential?: boolean): number {
    if (service === 'PR') {
      // Parcel: weight-based + distance + surcharges
      const baseWeightFee = (() => {
        if (!weightKg) return ghsToPesewas(10);
        if (weightKg <= 1) return ghsToPesewas(10);
        if (weightKg <= 5) return ghsToPesewas(15);
        if (weightKg <= 10) return ghsToPesewas(25);
        return ghsToPesewas(40);
      })();
      const distanceFee = this.tieredDistanceFee(distanceKm);
      let surcharges = 0;
      if (isFragile) surcharges += ghsToPesewas(10);
      if (isConfidential) surcharges += ghsToPesewas(5);
      return baseWeightFee + distanceFee + surcharges;
    }
    return this.tieredDistanceFee(distanceKm);
  }

  private tieredDistanceFee(distanceKm: number): number {
    for (const tier of Pricing.DELIVERY_FEE_TIERS) {
      if (distanceKm <= tier.maxKm) {
        return ghsToPesewas(tier.baseGhs) + Math.round(distanceKm * ghsToPesewas(tier.perKmGhs));
      }
    }
    return ghsToPesewas(Pricing.DELIVERY_FEE_TIERS[Pricing.DELIVERY_FEE_TIERS.length - 1].baseGhs);
  }

  private calculateServiceFee(service: ServiceCode, itemTotal: number): number {
    if (service === 'PR') return Pricing.SERVICE_FEE.PR.flatPesewas;
    if (service === 'ER') return Math.round(itemTotal * 0.08);
    const config = (Pricing.SERVICE_FEE as any)[service] ?? { percent: 5, minPesewas: 0, maxPesewas: Infinity };
    const fromPercent = Math.round(itemTotal * (config.percent / 100));
    return Math.max(config.minPesewas ?? 0, Math.min(config.maxPesewas ?? Infinity, fromPercent));
  }

  private estimateMinutes(distanceKm: number, prepMinutes: number): number {
    // Rough: 2 min per km travel + prep time
    return Math.round(prepMinutes + distanceKm * 2);
  }

  private fmt(pesewas: number): string {
    return `GHS ${pesewasToGhs(pesewas).toFixed(2)}`;
  }
}
