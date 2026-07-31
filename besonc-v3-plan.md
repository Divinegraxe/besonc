# BESONC — Full Platform Plan v3.1

> **Audience:** Frontend & Backend Development Team
> **Platform:** Besonc — Multi-Vendor Delivery & Logistics App
> **Primary Launch City:** Cape Coast, Ghana
> **Version:** 3.1 — Aligns v2.0 architecture with the BESONC business rules, with critical corrections from internal review
> **Supersedes:** v1.0 (besonc.pdf), v2.0 (besonc-v2-plan.md), v3.0 (besonc-v3-plan.md)
>
> **Tech stack (locked):** Backend microservices in **NestJS**; mobile apps (Customer, Vendor, Rider) in **React Native**; web apps (Customer Web, Vendor Web, Admin) in **NextJS**.

---

## Table of Contents

1. [Platform Identity](#section-1-platform-identity)
2. [Identification & Numbering Systems](#section-2-identification--numbering-systems)
3. [The 8 Services — Detailed Catalogue](#section-3-the-8-services--detailed-catalogue)
4. [Order State Machines](#section-4-order-state-machines)
5. [Dispatch, Multi-Vendor & Multi-Customer Workflow](#section-5-dispatch-multi-vendor--multi-customer-workflow)
6. [Address & Location System (Ghana-Specific)](#section-6-address--location-system-ghana-specific)
7. [Pricing & Fees](#section-7-pricing--fees)
8. [Payments, Wallets, Refunds & Disputes](#section-8-payments-wallets-refunds--disputes)
9. [Rider Payout, COD, Withdrawal & Cash Remittance Control](#section-9-rider-payout-cod-withdrawal--cash-remittance-control)
10. [Vendor Onboarding, SLAs, Penalties & Vendor Plans](#section-10-vendor-onboarding-slas-penalties--vendor-plans)
11. [Customer, Rider, Admin App Feature Requirements](#section-11-customer-rider-admin-app-feature-requirements)
12. [Promotion, Referral & Growth System](#section-12-promotion-referral--growth-system)
13. [Errands Full Implementation](#section-13-errands-full-implementation)
14. [Data Handling SOP & Internal Operations](#section-14-data-handling-sop--internal-operations)
15. [Backup & Disaster Recovery](#section-15-backup--disaster-recovery)
16. [Technology Architecture & Integrations](#section-16-technology-architecture--integrations)
17. [Sprint Plan & Next Steps](#section-17-sprint-plan--next-steps)

---

## How to Read This Document

This v3.0 plan is the **canonical, complete BESONC plan** that fully incorporates:

- The original **besonc.pdf** (v1.0) — the 8-service three-sided marketplace architecture
- The **development_plan.md** — the full Ghana-specific business rules, SLAs, vendor/rider policies, COD remittance rules, refund framework, SLA penalties, vendor plans, and operations SOPs

Key correction vs. v2.0: the user is explicit that **Paystack is the only payment provider** (using just two APIs — **Payment/Charge** and **Transfer**) with the **internal ledger as the orchestrator** between them. We do **not** use Paystack's Subaccount/Split feature. SMS is **Hubtel only** (not Arkesel, not WhatsApp). Maps is **Google Cloud** (not Arkesel masking service, not generic "Google Maps SDK"). KYC for both vendors and riders is **Smile ID**.

The architecture is identical to v2.0; what changed is the **business rules, numbers, and third-party choices**.

---

## Section 1: Platform Identity

### What BESONC Is
A multi-service, three-sided marketplace platform for **Cape Coast, Ghana** that lets customers order from vendors and have orders fulfilled by riders, plus a two-sided "request" model for errands and parcels. The platform orchestrates the discovery, ordering, payment, dispatch, delivery, and dispute resolution.

### Three User Types
- **Customers** (Cape Coast residents, prefixed `YDC-`)
- **Vendors** (Business + Individual types, prefixed `YDV-`)
- **Riders** (motorbike/bicycle/car, prefixed `YDR-`)

### Two Service Engines
- **Catalogue Engine** (6 services) — three-party (customer ↔ vendor ↔ rider), fixed pricing
- **Request Engine** (2 services) — two-party (customer ↔ rider), pre-auth + settlement

### 8 Launch Services

| # | Service | Engine | Vendor | State machine |
|---|---|---|---|---|
| 1 | Food | Catalogue | Yes | A |
| 2 | Groceries | Catalogue | Yes | A |
| 3 | Shop | Catalogue | Yes | A (prepaid only) |
| 4 | Market | Catalogue (hybrid) | Optional | A |
| 5 | Pharmacy & Health | Catalogue | Yes (verified only) | B |
| 6 | Laundry | Catalogue | Yes | C (two trips) |
| 7 | Parcel & Courier | Request | No | D |
| 8 | Errands & Personal Assistant | Request | No | E |

**These are the only 8 services BESONC operates. No others are planned, phased, or in scope.**

---

## Section 2: Identification & Numbering Systems

### Customer ID — `YDC-YYYY-NNNNNN`
- **YDC** = Besonc Customer
- **YYYY** = year of account creation
- **NNNNNN** = 6-digit global sequential number (NOT city-based)
- Auto-generated at signup, invisible to customer, used for order history, refunds, chargebacks, support tickets
- Example: `YDC-2026-000458`

### Rider ID — `YDR-YYYY-NNNN`
- **YDR** = Besonc Rider
- **YYYY** = year of onboarding
- **NNNN** = 4-digit sequential number, **per city per year**
- Sequence starts from 0001 in each city each year, never re-used even if rider is deactivated
- Generated only after **full verification** (valid national ID, approved onboarding, bike verification)
- Permanent, linked to wallet, COD records, performance logs
- Example: First Cape Coast rider in 2026 → `YDR-2026-0001`

### Vendor ID — `YDV-YYYY-NNNN`
- **YDV** = Besonc Vendor
- **YYYY** = year of vendor onboarded
- **NNNN** = 4-digit sequential number, **per city per year**
- Starts from 0001 per city per year, never reused, permanent
- Generated after vendor verification + approval
- Example: `YDV-2026-0123`

### Order ID — `YDO-[CITY]-[SERVICE]-[YYYYMMDD]-[SEQ]`
- **YDO** = Besonc Order
- **CITY** = 2–3 letter city code
- **SERVICE** = service code (see below)
- **YYYYMMDD** = order date
- **SEQ** = 4-digit running sequence (per city/service/date, recommended for cleaner operations tracking)

**Service codes (only the 8 BESONC services):**
| Code | Service |
|---|---|
| FO | Food |
| GR | Groceries |
| MK | Market |
| PH | Pharmacy |
| PR | Parcel |
| SH | Shop |
| ER | Errands |
| LD | Laundry |

**City codes:** `CC` (Cape Coast), `AC` (Accra), `KS` (Kumasi), `TK` (Takoradi), `TM` (Tema).

**Examples:**
- `YDO-CC-FO-20260321-0001` — Besonc Order, Cape Coast, Food, 21 March 2026, Order #1
- `YDO-AC-PR-20260321-0017` — Besonc Order, Accra, Parcel, 21 March 2026, Order #17
- `YDO-KS-PH-20260321-0045` — Besonc Order, Kumasi, Pharmacy, 21 March 2026, Order #45

**Backend must also store separately** (not exposed in the visible Order ID): internal UUID, customer ID, vendor ID, rider ID, payment type, payment status, dispute status. The Order ID is auto-generated, unique, sequence-incremented, with city code and service code from approved lists and date from system timestamp.

---

## Section 3: The 8 Services — Detailed Catalogue

### ENGINE 1 — Catalogue-Based Services

These 6 services share one order-flow template. They differ only in catalogue structure and minor state variations.

#### SERVICE 1: FOOD
- **Purpose:** Ready-to-eat meals & drinks
- **Vendor types:** Restaurants, chop bars, local food joints, fast food, street food, night vendors, home kitchens, bakeries, drinks/beverages
- **Catalogue structure:** Vendor → Category → Item (with addons: protein, extras, drinks)
- **Special rules:** Vendor must accept/reject within **3 minutes** (max 5 min auto-cancel). Vendor sets EPT (10/15/20/30 min). Rider waiting time at pickup must not exceed **5 minutes**.

#### SERVICE 2: GROCERIES
- **Purpose:** Daily household shopping
- **Vendor types:** Supermarkets, mini-marts, corner shops
- **Catalogue structure:** Same as Food but with units (per piece, per kg, per pack) and quantity selector
- **Substitution preference per item:** Customer sets "allow substitution" or "refund if unavailable"

#### SERVICE 3: SHOP
- **Purpose:** Non-food retail shopping
- **Vendor types:** Electronics, phones/accessories, fashion, beauty, hair/salon supplies, stationery/books
- **Catalogue structure:** Items with variants (size, color) instead of addons, multiple images
- **Payment rule:** **ALL shop orders are prepaid only — no COD allowed**

#### SERVICE 4: MARKET
- **Purpose:** Traditional African market shopping (Makola, Kejetia, Kaneshie, Kotokuraba, etc.)
- **Hybrid model:**

**Mode A — Catalogue Browse** (onboarded vendors)
```
Vendor (Auntie Ama - Makola Market) → Category → Item
  (price per bowl / per basket / per bag)
```

**Mode B — Shopping List** (non-onboarded sellers — long tail)
```
Shopping List Order:
  ├── Target Market: Makola Market
  ├── Items: "Tomatoes - 1 big bowl", "Onions - 1 bag", ...
  ├── Item images (optional, for clarity)
  └── Special Instructions: "Pick firm, not soft"
```

System estimates cost from market price data + delivery fee → customer prepays as pre-authorization. Rider assigned, goes to market, buys items, uploads receipt photos. Settlement on delivery: difference handled (15% tolerance auto, beyond = customer approval).

#### SERVICE 5: PHARMACY & HEALTH (HIGH-RISK category)
- **Vendor types:** Licensed pharmacies only (stricter onboarding)
- **State machine adds:** `prescription_review` between `placed` and `vendor_accepted`
- **Mandatory verification before onboarding:**
  - Valid Business Registration Certificate
  - Ghana Card of Owner / Responsible Pharmacist
  - Tax Identification Number (TIN)
  - Pharmacy Council License (active & valid, not expired)
  - Facility License
  - Responsible Pharmacist License Number verified with Pharmacy Council
  - Annual renewal confirmed
  - FDA registration (if applicable)
- **Prescription flow:** Customer uploads prescription image → order enters `prescription_review` → pharmacist reviews → accept, reject, or suggest alternatives → customer approves/rejects
- **Pharmacy must enforce:**
  - Prescription upload feature enabled
  - Pharmacist must validate prescription before fulfillment
  - No delivery without pharmacist approval
  - System log of prescription validation stored
  - Age verification for restricted medicines
- **Controlled & restricted medicines:**
  - Narcotics & controlled drugs: NOT permitted via delivery (unless special future license)
  - No antibiotic sales without prescription
  - No codeine or restricted drugs without pharmacist validation
  - Alcohol-based products age-restricted
- **Packaging & delivery standards:**
  - Tamper-proof packaging required
  - Proper labeling with pharmacy name
  - Temperature-sensitive items packaged properly
  - Sealed before rider pickup
- **Rider restrictions:**
  - Must NOT open packages
  - Must NOT modify medicine packaging
  - Must NOT advise on medical usage
  - Delivery PIN mandatory
  - Proof-of-delivery required
- **Data protection:** Prescription data HIPAA-like handling, access limited to pharmacy & admin only, NO prescription data visible to rider
- **Audit & monitoring:** Quarterly license revalidation, random compliance checks, automatic suspension on expired license or sale of controlled drugs
- **Quarterly re-validation required**

#### SERVICE 6: LAUNDRY PICKUP & DROP-OFF
- **Vendor types:** Laundry services, dry cleaning
- **Catalogue structure:** Per-item pricing (Shirt GHS 8) or per-bag pricing (Small GHS 50, Medium GHS 80, Large GHS 120)
- **Two-trip state machine:** Trip 1 (customer→laundry), Trip 2 (laundry→customer)
- **📗 NEW:** Same-rider round-trip bonus of GHS 5

### ENGINE 2 — Request-Based Services

#### SERVICE 7: PARCEL & COURIER DELIVERY
- **Purpose:** Sending items from A to B
- **Form:** Pickup location, drop-off location, contacts for both, package category, weight estimate, description, fragile flag, special instructions
- **Pricing (FIXED at checkout):** Weight-based base + distance + surcharge (fragile/confidential) + platform fee
- **Receiver notification:** SMS with tracking link even without app

#### SERVICE 8: ERRANDS & PERSONAL ASSISTANT
- **Purpose:** "Do it for me" — rider performs a task
- **Sub-categories:** Buy & deliver, bill payments (ECG, Water, Internet), pick up forgotten items, queue services, school/hostel errands, document drop-off
- **Form:** Errand type, description, item list, locations, contacts, budget cap, special instructions
- **Pricing (ESTIMATED at checkout):** Estimated item cost + Errand Service Fee (GHS 15) + Delivery Fee
- **Customer prepays full estimate as pre-authorization** via Paystack
- **Settlement:** If actual ≤ estimate → refund difference; if > estimate by ≤15% → auto-charge; if > 15% → top-up request, customer approves/rejects (90-second window)
- **📗 CRITICAL: Riders never use personal money.** Funds for "Buy" errands are held in Besonc escrow. Rider uses a Besonc-generated payment method (see Section 8).

---

## Section 4: Order State Machines

Every state transition writes to a per-service `outbox_events` table in the **same database transaction** as the state change. A **Debezium CDC connector** tails the WAL and publishes events to RabbitMQ. Consumers must be idempotent using `event_id` as dedup key (24h TTL in Redis).

### State Machine A — Standard Catalogue (Food, Groceries, Shop, Market-catalogue, Pharmacy without prescription)

```
placed → vendor_accepted → preparing → ready_for_pickup
       → rider_assigned → rider_at_vendor → picked_up → in_transit
       → arrived → delivered
```

| State | Who triggers | What happens | SLA / timeout |
|---|---|---|---|
| `placed` | System (after payment) | Order created, vendor notified (push + loud sound) | — |
| `vendor_accepted` | Vendor | Customer notified, dispatch begins | **3 min** (5 min auto-reject) |
| `preparing` | Vendor | Customer sees "being prepared" | Vendor-set EPT, max 45 min |
| `ready_for_pickup` | Vendor | Dispatch assigns rider | — |
| `rider_assigned` | System (dispatch) | Customer + vendor notified with rider details | — |
| `rider_at_vendor` | Rider tap or geo-fence | Vendor notified to hand over | — |
| `picked_up` | Rider | Customer notified, live tracking starts | — |
| `in_transit` | Automatic | Customer sees movement | — |
| `arrived` | Rider tap or geo-fence | Customer notified | — |
| `delivered` | Rider + confirm | Order complete, payment settled, rating prompt | — |

**Failure states:**
| State | Who | Result |
|---|---|---|
| `vendor_rejected` | Vendor at `placed` | Full refund to original method, no penalty (first 5/month) |
| `vendor_cancelled` | Vendor at `accepted` or `preparing` | 100% refund before preparing; 50% after; vendor reason required |
| `customer_cancelled` | Customer | Per cancellation rules |
| `rider_unassigned` | System (all declined) | Retry with broader radius |
| `payment_failed` | System (MoMo timeout) | Auto-cancel after 5 min |

### State Machine B — Pharmacy with Prescription
Same as A, with one extra initial state:
```
placed → prescription_review → (vendor_accepted | prescription_rejected | prescription_modified)
```

`prescription_modified` lets the pharmacist propose changes (generic alternative, different dosage). Customer sees in app, has **24 hours** to approve/reject. Auto-reject after 24h.

### State Machine C — Laundry (Two Trips)
**Trip 1:** placed → vendor_accepted → rider_assigned_pickup → rider_at_customer_pickup → picked_up_from_customer → delivered_to_vendor → vendor_received → processing

**Trip 2** (auto-triggered when vendor taps "Done"): vendor_done → rider_assigned_return → rider_at_vendor_return → picked_up_from_vendor → return_in_transit → delivered_to_customer

**📗 NEW:** Customer sees real-time "Laundry in progress" status during `processing` with vendor-set ETA. Vendor can push status updates: "Washing" → "Drying" → "Ironing" → "Packing".

### State Machine D — Parcel
```
placed → rider_assigned → rider_at_pickup → picked_up
       → in_transit → arrived_at_dropoff → delivered
```

📗 NEW: For "confidential" parcels: signature required on receiver's phone. For "fragile" parcels: rider must tap "Handle with care" acknowledgement.

### State Machine E — Errand
```
placed → rider_assigned → rider_en_route_to_task → task_in_progress
       → items_purchased [uploads receipts] → in_transit
       → arrived_at_customer → delivered
```

**Additional states:** `topup_requested`, `topup_approved`, `topup_rejected`, `item_unavailable`, `item_substituted`, `item_refunded`. **Auto top-up threshold:** if overrun ≤ 15% auto-charge; beyond 15% requires customer approval with 90-second window.

---

## Section 5: Dispatch, Multi-Vendor & Multi-Customer Workflow

### 5.1 Core Dispatch Principles (NON-NEGOTIABLE)

**Customer pricing and rider payout are calculated separately.** Splitting an order must not create hidden post-checkout charges for the customer. The route engine prioritizes customer delivery promise, safety, route efficiency, rider fairness, and vendor readiness accuracy **before** delivery margin. A profitable route that creates high refund risk or unfair rider work is **rejected**.

```
Customer Delivery Fee = Base Dispatch Fee
                      + (Distance × Customer Per KM Rate)
                      + Category Load Adjustment
                      + Surge Adjustment

Rider Payout = Rider Base Pay
             + (Pickup Distance × Rider Pickup Per KM Rate)
             + (Delivery Distance × Rider Delivery Per KM Rate)
             + Rider Load/Handling Allowance
             + Applicable Incentives
```

**Cape Coast launch pricing (locked by the business rules):**
- Base Dispatch Fee: **GHS 4**
- Customer Per KM Rate: **GHS 2 per km**
- Rider Base Pay: **GHS 4**
- Rider Pickup Distance Rate: **GHS 1.00 per km**
- Rider Delivery Distance Rate: **GHS 2.50 per km**

### 5.2 The Vendor Countdown + Competitive Acceptance Model

This is the **definitive** dispatch model, derived from the BESONC development plan and validated against Uber Eats / DoorDash best practices.

**Step 1 — Vendor accepts order:** Customer places order → vendor receives notification → vendor must accept, reject, or mark unavailable within the SLA window (food/pharmacy 2-5 min, others within 5 min). On accept: status → `ACCEPTED – PREPARING`.

**Step 2 — Vendor sets EPT:** Vendor selects Estimated Preparation Time (10/15/20/30 min). The countdown timer starts immediately. EPT is **binding**. Vendor may increase EPT only with genuine delay (logged for SLA review). Vendor must not mark "Ready for Dispatch" if the order is not fully prepared, packed, labelled, accurate, and available for pickup.

**Step 3 — Rider pre-assignment triggers:**
- **Rule A (Countdown Threshold):** When 5 minutes remain on countdown → rider assignment begins
- **Rule B (Early Completion):** Vendor marks "Ready for Dispatch" at any time → assignment begins immediately

This ensures riders arrive just-in-time, not too early or too late.

**Step 4 — Initial rider pool (0-2 km):**
- Search radius: 0-2 km from the **best pickup start point** (selected by route optimization, not just first vendor)
- Only eligible riders included: online, active, verified, not suspended, not cash-blocked, within radius, not exceeding decline/timeout limits, vehicle-suitable, no active route conflict

**Step 5 — Rider ranking:**
Each rider scored dynamically by: route optimization fit → distance to pickup → idle time → rating → completion/reliability history → decline/timeout behaviour → vehicle suitability → COD eligibility → current workload → pickup punctuality.

**Step 6 — Competitive acceptance (multi-rider dispatch):**
- Request sent to **multiple top-ranked eligible riders simultaneously**
- First qualified rider to accept within the acceptance window (10-20 seconds) gets the order
- All other open alerts cancelled immediately on assignment lock
- Configurable wave size by city, rider density, category, demand
- Shorter windows for food/urgent; longer for heavy goods/long-distance/low-density

**Step 7 — Assignment locking:**
- Accepted → order immediately locked, other alerts cancelled, customer + vendor notified, audit logged
- Declined/timed out → recorded, rider excluded from later waves for same order, repeated → priority reduction/cooldown
- Order request may remain active in pool for **up to 5 minutes** before radius expansion or admin intervention

**Step 8 — Radius expansion:**
- If no accept in initial 2 km → expand in +2 km increments
- Already-declined riders remain excluded
- Continue until: rider accepts, max radius reached, or admin intervention
- Configurable by city/category/vehicle

### 5.3 Multi-Vendor Single-Customer Order (Hybrid Cart)

For an order with multiple vendors for one customer, the system must:

- Group vendors below the **10-minute threshold** where route optimization supports one route
- Split vendors above the 10-minute threshold
- Apply this rule at the **pre-rider-assignment decision point**: when one vendor reaches the trigger, the system checks remaining vendors' countdowns
- Vendors within a recommended **2 km pickup cluster radius** of each other (or close to the customer's route) are eligible
- All vendors must accept/reject within SLA window (food/pharmacy 10-30 min, standard 30 min)
- Vendors must not mark ready unless fully prepared
- **Vendor-caused delay = SLA event** = may affect ranking, visibility, refund responsibility, or order allocation
- **Each vendor remains responsible** for their own acceptance, prep, accuracy, stock, packaging, handover
- **Customer sees ONE master order with vendor-level progress**
- If split: customer message "Some items are ready earlier, so we are sending them first..."
- **No hidden split-delivery fees** caused by operational split (vendor-caused refunds under vendor SLA rules)

**Example:**
- Vendor A marks Ready, system starts 10-min countdown
- Vendor B has <10 min remaining + route-compatible → grouped with A in Rider 1's route
- Vendor C has >10 min remaining → split, assigned to Rider 2 later when C's countdown triggers

### 5.4 Multi-Customer Batch Delivery

- One rider completes deliveries for different customers in one optimized route
- Only batch when: customer delivery windows still met, item safety, rider load, COD risk, route efficiency all OK
- Batching MUST improve or preserve route efficiency and customer promises — never just because orders are geographically close
- **Default max batch size: 2-3 customer orders** at launch
- Each batch has a max permitted customer delay threshold
- **Customer experience:** if no meaningful delay, customer doesn't need to know; if delay, show neutral message: "Your rider is completing nearby deliveries on an optimised route. Your estimated arrival time has been updated."

### 5.5 Rider Route & Confirmation Flow

1. Navigate to assigned vendor
2. Confirm pickup (PIN/QR/photo)
3. Confirm item collected
4. Proceed to next vendor if grouped route valid
5. Deliver to customer
6. Complete via PIN/QR/photo/signature

Riders can manually skip a vendor pickup in multi-pickup routes, but **are NOT paid** for the skipped task. The system detects and adjusts the rider delivery fee, and the skipped vendor is re-assigned to a new rider if already ready.

### 5.6 Delivery Matching Engine — Decision Options

The engine evaluates vendor distance, vendor clustering, pickup distance, delivery distance, rider-to-pickup ETA, vendor-to-customer ETA, each vendor's remaining countdown, below-10-min grouping, above-10-min split, route optimization score, customer promised time, customer priority, item category, item sensitivity, batch size, rider availability, online status, verification, COD block, rider cash limit, vehicle suitability, load capacity, rider reliability, decline behaviour, current workload, surge status, category adjustment, customer delivery fee, rider payout, delivery margin, refund risk, fraud risk, cancellation risk, manual restrictions.

**Decision options:** Assign one rider for multi-pickup | Hold and wait briefly | Auto-group vendors below 10 min | Split vendors above 10 min | Trigger competitive acceptance | Expand radius | Assign separate riders from start | Escalate to manual review.

### 5.7 Exception & Safety Rules
- Do NOT combine vendors in opposite directions from customer
- Exception rules override optimization
- **If split is safer/more customer-friendly, split even if one route is cheaper**
- High-value COD / electronics / pharmacy / risky categories may require PIN, signature, QR, or photo

### 5.8 Rider Performance Monitoring (KPIs)
- Avg rider waiting time at pickup
- Avg vendor prep accuracy vs countdown
- % orders grouped vs split
- % multi-customer batches delivered within promised time
- Avg customer delay from batching
- Delivery margin per order and per batch
- Rider earnings per active hour
- Rider decline/timeout rate
- Vendor late-ready rate
- Refunds/cancellations/complaints from delay or wrong fulfilment
- COD remittance delay rate
- Manual override rate and reason categories

### 5.9 Required Dispatch Audit Logs
Order ID, vendor ID, vendor acceptance time + EPT, countdown trigger used (5-min or Ready), rider pool radius, riders notified, rider ranking score, accept/decline/timeout/lock timestamps, radius expansion history, admin override reason + user + timestamp.

---

## Section 6: Address & Location System (Ghana-Specific)

> Implementation: **Google Cloud Maps Platform** (Maps SDK for React Native + Web, Places API, **Routes API** for distance/ETA, Geocoding API for reverse-geocoding). One provider, one billing account, one API key per environment. **No route data caching** (Google ToS Section 1.4(e) forbids it; see Distance Calculation below).

### Design Goals
Zero user confusion. No guessing addresses. Minimal calls. Ghana-ready. Automatic where possible. Receiver confirms when needed.

### CASE 1: User ordering for themselves (most common)

**Step 1 — Auto Home Location:** App requests location permission on first open. Automatically sets Home address = phone's GPS. Shows message: "We've set your delivery location based on your current position."

**Step 2 — User confirms or adjusts pin:** Map shows pin at GPS location. Options: ✅ Confirm | ✏️ Adjust pin | 🏷️ Save as "Home". One tap.

**Step 3 — Optional landmark:** Short text: "Opposite Melcom" / "Behind Vodafone office". GPS is primary; landmark is helper only.

**Step 4 — Auto-save:** After first order, address saved as Home. Next time, app auto-selects Home. No map needed unless they want to change.

### CASE 2: User ordering for someone else (remote order)

**Step 1 — User selects "Send to someone else".** App switches flow.

**Step 2 — Delivery city selection:** "Where is this delivery going?" — Cape Coast / Accra / Others. Map centers on delivery city, not phone location.

**Step 3 — Receiver details:** Name, phone, optional GhanaPostGPS digital address. Shows message: "We'll ask the receiver to confirm their delivery location."

**Step 4 — Receiver confirms location:** Receiver receives message via **Hubtel SMS** (per business rules — no WhatsApp): "A delivery has been ordered for you via BESONC. Please confirm your delivery location." Options: 📍 Share live location (best) | 📌 Drop a pin.

**Step 5 — Address finalization:** Receiver confirms → Besonc now has GPS + optional landmark + receiver phone.

**If receiver doesn't respond:** Auto reminder after 5-10 min → support follow-up → call receiver (last resort).

### Address Data Structure
```json
{
  "label": "Home" | "Hostel" | "Office" | "Other",
  "coordinates": { "lat": 5.6037, "lng": -0.1870 },
  "ghanapost_address": "CC-123-4567",  // optional
  "area_name": "Cape Coast",  // reverse geocoded
  "landmark": "Behind MTN mast",  // optional
  "delivery_instructions": "Call when you arrive, blue gate on the left",  // optional
  "contact_phone": "+233XXXXXXXXX"
}
```

**📗 Every order stores:** GPS coordinates (mandatory), label, optional landmark, receiver phone, optional instructions. **Written addresses are never mandatory.**

### Rider Navigation Rules (strict)
1. Navigate to GPS pin first
2. Use landmark only when close
3. If stuck: in-app chat → request live location → call (last resort)

### Automation Summary

| Scenario | Location Source |
|---|---|
| Ordering for self | Phone GPS (auto) |
| Ordering for self later | Saved Home (or adjust to current location) |
| Ordering for someone else | Receiver live location |
| Receiver unavailable | Support-assisted |

### Distance Calculation (CRITICAL — no route caching)

All distances use **road distance via Google Routes API** (`Compute Route Matrix`, the modern replacement for the legacy Distance Matrix API). Fallback: straight-line × 1.4 (Ghana road winding factor) when Routes API is unavailable.

**Cache policy (compliant with Google Maps Platform ToS):**
- **Cache Place IDs indefinitely** (Google explicitly allows this)
- **Cache individual route results: FORBIDDEN.** Google Maps Platform Service Specific Terms Section 1.4(e) prohibits caching data to evade billing tracking. Section 1.4(a) allows only short-term transient caching for network performance.
- **No 24h route cache, no Redis route cache, no vendor→zone precomputed tables of route data.** Every dispatch route = a fresh Routes API call.
- **Allowed:** caching *computed* dispatch decisions (rider assignment, ETA) after the API call returns. Not allowed: caching the raw route data itself.

**Cost reduction strategy (without violating ToS):**
1. **Haversine pre-filter:** Before calling Routes API, compute straight-line (Haversine) distance from vendor to all online riders. Send only the **top 10-15 nearest** (by Haversine) to Routes API. This typically cuts API call size by 80-90%.
2. **Routes API (not Distance Matrix):** Google's current recommended API. Per-element pricing same as Distance Matrix ($5 per 1,000 elements) but traffic-aware, better field masks, and the path Google is investing in. Distance Matrix is legacy since March 2025.
3. **ETA caching for customer-visible display only:** The customer app can briefly cache the *last shown ETA* (e.g., 30 seconds) to debounce during active tracking. The server must still re-call Routes API for any dispatch decision.
4. **Set daily quota in Google Cloud Console** at the equivalent of the previous $200/month free credit to prevent billing shock.
5. **ML-predicted historical ETA (post-launch):** After 3+ months of data, train a simple model on (vendor, customer zone, time of day, day of week) → historical average travel time. Use as fallback when Routes API is unavailable or for low-priority ETA refreshes.

**Routes API element math (sanity check):**
- 1 dispatch = top-10 rider candidates × 1 vendor = **10 elements** (Haversine pre-filter)
- 500 orders/day × 10 = 5,000 elements/day = 150,000/month = **~$750/month at $5/1K**
- 5,000 orders/day = $7,500/month at the same per-element cost
- $200 free credit no longer applies (March 2025 pricing change); Essentials tier now has 10,000 free events/month per SKU

### Service Code for City Codes
- `CC` = Cape Coast (launch)
- `AC` = Accra, `KS` = Kumasi, `TK` = Takoradi, `TM` = Tema (future)

---

## Section 7: Pricing & Fees

### What Customer Pays at Checkout
```
Item Total (items + addons/variants)
+ Delivery Fee
+ Service Fee
+ Surge Multiplier (applied to delivery fee, transparently shown)
+ Tip (optional, 100% to rider, suggested amounts GHS 2/5/10/custom)
- Promo discount
= Total
```

### Delivery Fee Tiers
```
0-3 km:    GHS 5 base + GHS 1.5/km
3-7 km:    GHS 8 + GHS 1.2/km
7-15 km:   GHS 12 + GHS 1.0/km
15+ km:    GHS 18 + GHS 0.8/km
```

### Service Fee by Service
| Service | Service Fee |
|---|---|
| Food | 5% (min GHS 2, max GHS 15) |
| Groceries | 4% |
| Shop | 5% |
| Market (catalogue) | 5% |
| Market (shopping list) | 7% (higher — platform manages buying) |
| Pharmacy | 4% |
| Laundry | 5% |
| Parcel | GHS 3 flat |
| Errand | 8% of estimated task cost |

### Rider Earnings (Complete Structure)
| Component | Source | To rider |
|---|---|---|
| Base delivery fee (Cape Coast: GHS 4) | Pricing Service | 100% |
| Pickup distance (GHS 1.00/km) | Pricing Service | 100% |
| Delivery distance (GHS 2.50/km) | Pricing Service | 100% |
| Load/handling allowance | Per category | 100% |
| Surge bonus (>1.0×) | Platform | 100% of surge amount |
| Batching bonus (if batched) | Platform | +40% of base fee |
| Round-trip bonus (laundry same rider) | Platform | GHS 5 flat |
| Tip | Customer | **100%** (0% commission) |
| Quest/incentive bonus | Platform | 100% |

**📗 CRITICAL: rider payout is NOT commission-based.** Customer delivery fee and rider payout are stored as separate values for reporting, margin analysis, and audit review. Riders are NOT charged commission on earnings.

**Target earnings:** GHS 8-15/hour base, GHS 15-25/hour during peaks with tips.

### Tips (built-in v3)
- Suggested amounts: GHS 2, 5, 10, custom
- Default at checkout: GHS 5
- Can be modified until 1 hour after delivery
- Credited to rider wallet **immediately on delivery**, separately from delivery fee
- **100% to rider, 0% platform commission** (industry standard)
- Shown in rider's expected earnings **before** they accept the broadcast

### Parcel Pricing
```
Base fee by weight:
  0-1 kg:   GHS 10
  1-5 kg:   GHS 15
  5-10 kg:  GHS 25
  10-20 kg: GHS 40

+ Distance fee (same tier system)
+ Surcharges: Fragile +GHS 10, Confidential +GHS 5
+ Insurance (optional): GHS 5 per GHS 500 coverage
+ Platform fee: GHS 3 flat

Rider gets 80% of total parcel fee
Platform gets 20%
```

### Errand Pricing
```
Errand Cost = Estimated Item Cost + Errand Service Fee (GHS 15) + Delivery Fee
Customer pays full estimate as pre-authorization
```

### Surging Pricing
- Static surcharges on Delivery Fee for peak/off-peak
- Admin can adjust
- v1 launch: static only; v2: real-time demand-based (deferred)

### Promotions
Built-in v3 (per the dev plan). Critical for growth.
- First-order discount, free delivery, vendor-funded discounts, referral credit, time-bound campaigns, min order spend
- Each promo has code (nullable for auto-apply), name, type, value, max discount, min order, service types, vendor IDs, zones, start/end dates, usage limits, funding source (platform/vendor/split), budget cap
- **Anti-abuse:** One coupon per phone, per device fingerprint, per payment method. Velocity check: max 3 promo orders in 24h per user. New accounts (<7 days): only first_order promo.

---

## Section 8: Payments, Wallets, Refunds & Disputes

> **CRITICAL ARCHITECTURAL DECISION (per user):** Paystack is the **only** payment provider. We use only **two** Paystack APIs: **Payment/Charge** (to receive money from customers) and **Transfer** (to send money to vendors and riders). The **internal ledger is the orchestrator** between these two APIs. We do **not** use Paystack Subaccounts, Transaction Splits, or any other splitting feature. Besonc's own ledger is the source of truth for "who has what money" at all times.
>
> **Ledger implementation:** v1 (Cape Coast launch) uses a simple per-user `user_balances` table + immutable `balance_ledger_entries` audit log, with double-entry enforced via daily reconciliation jobs. v2 (post-launch) migrates to a full double-entry ledger with platform accounts, per-user accounts, and external accounts. See 8.3.

### 8.1 Payment Methods

| Method | Customer Pay | Vendor/Rider Payout (via Paystack Transfer API) |
|---|---|---|
| Mobile Money (MTN, Telecel, AT) | ✅ via Paystack Charge with `mobile_money` provider | ✅ via Paystack Transfer with `mobile_money` recipient |
| Bank Card (Visa, Mastercard) | ✅ via Paystack Charge | ✅ via Paystack Transfer with bank recipient |
| Bank Transfer | ✅ via Paystack Charge with bank | ✅ via Paystack Transfer |
| Cash on Delivery (COD) | ✅ rider collects cash | ❌ n/a (reconciled via Besonc ledger only) |
| Besonc Wallet | ✅ | ❌ n/a (no Paystack for wallet→order) |

**Paystack bank codes for Ghana Mobile Money (CRITICAL — the values differ between Charge and Transfer Recipient APIs):**

| Telco | `mobile_money.provider` (Charge API) | `bank_code` (Transfer Recipient API) |
|---|---|---|
| MTN Mobile Money | `mtn` (lowercase) | `MTN` (uppercase) |
| Telecel Cash (formerly Vodafone) | `vod` (lowercase) | `VOD` (uppercase) |
| AirtelTigo Money | `atl` (lowercase) | `ATL` (uppercase) |

**Why this matters:** Paystack's `POST /charge` rejects unknown `mobile_money.provider` values, and `POST /transferrecipient` rejects unknown `bank_code` values. If the Payment Service hard-codes one set, the other API call fails. Implementation rule:

```typescript
// payment-service/src/paystack/codes.ts

// Used in POST /charge → body.mobile_money.provider
export const CHARGE_PROVIDER = {
  MTN: "mtn",
  VODAFONE: "vod",        // "Telecel" is the brand; "vod" is Paystack's slug
  AIRTELTIGO: "atl",
} as const;

// Used in POST /transferrecipient → body.bank_code
export const TRANSFER_BANK_CODE = {
  MTN: "MTN",
  VODAFONE: "VOD",
  AIRTELTIGO: "ATL",
} as const;

// For Ghana bank transfers (ghipss), fetch dynamically:
// GET /bank?currency=GHS&type=ghipss  → returns live bank list
```

Never hard-code the same string for both APIs. Single translation function in the Payment Service enforces this.

### 8.2 Paystack API Usage (Two APIs Only)

**API 1 — Payment/Charge** (`POST /charge`)
For receiving money from customers. Supports:
- Mobile money: `{ currency: "GHS", mobile_money: { phone, provider: "mtn" } }`
- Card: standard Paystack card charge
- Bank: standard Paystack bank charge

**API 2 — Transfer** (`POST /transfer`)
For sending money to vendors and riders. Supports:
- Mobile money recipient: `POST /transferrecipient` with `{ type: "mobile_money", account_number: phone, bank_code: "MTN", currency: "GHS" }` — note **`bank_code` is UPPERCASE** (`MTN`/`VOD`/`ATL`); see 8.1 for the lowercase `provider` used in the Charge API
- Bank recipient: `POST /transferrecipient` with `{ type: "ghipss", account_number, bank_code, currency: "GHS" }` — `bank_code` fetched dynamically from `GET /bank?currency=GHS&type=ghipss`
- Then `POST /transfer` with `{ source: "balance", amount, recipient: recipient_code, reference }`
- Per-transfer fees: **GHS 1 per MoMo transfer, GHS 8 per bank transfer** (Ghana pricing)
- Min GHS 1, max GHS 50,000 per transfer
- For batch payouts: `POST /transfer/bulk` with up to 100 transfers per batch (max per call)

**Internal ledger is the orchestrator.** Every Paystack Charge/Transfer creates a corresponding double-entry ledger entry. The ledger is the source of truth; Paystack is the money movement layer.

### 8.3 Ledger Model — v1 Simple Balance, v2 Double-Entry

**v1 (Cape Coast launch): Simple per-user balance table**

For Cape Coast launch, the ledger is a **single `user_balances` table** with full audit trail. The double-entry property is enforced by **reconciliation jobs**, not at write time. This ships in 2-3 weeks instead of 3-6 months.

**Schema:**
```sql
CREATE TABLE user_balances (
  user_id        UUID PRIMARY KEY,       -- customer, rider, or vendor id
  user_type      TEXT NOT NULL,          -- 'customer' | 'rider' | 'vendor'
  balance_pesewas BIGINT NOT NULL DEFAULT 0,  -- always in pesewas (1 GHS = 100 pesewas)
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE balance_ledger_entries (  -- immutable audit log
  entry_id       UUID PRIMARY KEY,
  user_id        UUID NOT NULL,
  user_type      TEXT NOT NULL,
  delta_pesewas  BIGINT NOT NULL,        -- positive = credit, negative = debit
  reason_code    TEXT NOT NULL,          -- 'order_payment' | 'refund' | 'vendor_settlement' | 'rider_earning' | 'rider_payout' | 'cod_collection' | 'cod_remittance' | 'penalty' | 'promo_credit' | 'manual_adjustment'
  reference_type TEXT,                   -- 'order' | 'payout' | 'refund' | 'wallet_topup'
  reference_id   UUID,
  paystack_ref   TEXT,                   -- Paystack reference (charge_id or transfer_id)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON balance_ledger_entries (user_id, created_at DESC);
CREATE INDEX ON balance_ledger_entries (reference_type, reference_id);
```

**Money movement model:**
1. Every money event (customer charge, refund, vendor settlement, rider earning, rider payout, COD collection, COD remittance) = **one row in `balance_ledger_entries`** with the delta in pesewas
2. `user_balances.balance_pesewas` is the running total, updated atomically with the ledger insert
3. **Idempotency:** `paystack_ref` (or `reference_id` for non-Paystack events) is unique — a duplicate webhook does not double-count
4. **Reconciliation job (daily, 02:00 GMT):**
   - Sum `balance_ledger_entries` per user → must equal `user_balances.balance_pesewas`
   - Sum all customer-side deltas + vendor-side deltas + rider-side deltas + platform revenue deltas → must net to zero (no money created or destroyed)
   - Variance → alert finance team, block withdrawals until resolved
5. **Source of truth:** `balance_ledger_entries` is the source of truth for any audit. `user_balances` is a materialized view-style cache for fast reads.

**v2 (post-launch, when finance team and audit requirements demand it): full double-entry ledger**

The full double-entry ledger with `PLATFORM_REVENUE`, `PLATFORM_INCENTIVE_POOL`, `PAYSTACK_INFLOW`, `PAYSTACK_OUTFLOW`, `CUSTOMER_WALLET_{id}`, `RIDER_WALLET_{id}`, `VENDOR_PENDING_SETTLEMENT_{id}` accounts is the v2 target. It enforces debit = credit at write time instead of via reconciliation. The v1 ledger is forward-compatible: each v1 `balance_ledger_entries` row maps 1:1 to a pair of v2 double-entry entries. Migration is a backfill job, not a rewrite.

**Example flow — Prepaid Food Order (GHS 50 item + GHS 8 delivery + GHS 3 service = GHS 61):**

```
1. Customer pays GHS 61 via MoMo (Paystack Charge):
   balance_ledger_entries row:
     user_id: customer, delta: +6100 pesewas, reason: 'order_payment',
     reference_type: 'order', reference_id: order_uuid, paystack_ref: 'charge_xyz'

2. Order delivered. Besonc owes vendor GHS 50 (item cost), rider GHS 8 (delivery fee), keeps GHS 3 (service fee):
   Vendor settlement row:
     user_id: vendor, delta: -5000, reason: 'vendor_settlement',
     reference_type: 'order', paystack_ref: 'transfer_abc'
   Rider earning row:
     user_id: rider, delta: +800, reason: 'rider_earning',
     reference_type: 'order'
   Platform revenue row:
     user_id: 'PLATFORM_REVENUE', delta: +300, reason: 'service_fee',
     reference_type: 'order'

3. Rider requests withdrawal of GHS 8:
   Rider payout row:
     user_id: rider, delta: -800, reason: 'rider_payout',
     paystack_ref: 'transfer_def'
   Platform outflow row:
     user_id: 'PLATFORM_FLOAT', delta: -800, reason: 'rider_payout',
     paystack_ref: 'transfer_def'

Net: customer -6100, vendor -5000, rider 0, platform_revenue +300, platform_float -800, paystack_inflows +6100, paystack_outflows -5800. All matches.
```

**📗 KEY:** The BESONC `balance_ledger_entries` table is the source of truth. The admin dashboard reads from it. Paystack webhooks write to it via the outbox + CDC pattern (Section 4). Reconciliation jobs ensure no discrepancy.

### 8.4 Customer Wallet
**📗 Built-in v3 (was refund-only in v1, top-up capable in v2 — kept as v2):**
- Funded by: direct top-up via Paystack, refunds, cancelled order reversals, promo credits, service credits
- Used to: pay for orders (full or partial), combined with another payment method
- Withdrawn to: mobile money via Paystack Transfer (GHS 1 fee, GHS 20 minimum)

### 8.5 Cash on Delivery (COD)

**📗 Strict rider rules (non-negotiable per dev plan):**

**Eligibility:**
- Order value ≤ GHS 200
- Service: NO COD for Shop, Laundry, items >GHS 500
- Customer history: <3 completed orders → COD limit GHS 50
- Rider COD balance: rider cannot be assigned COD if unremitted >GHS 300
- Time: No COD after 9pm

**📗 NEW: Pre-collection authorization.** When a COD order is placed, the customer's wallet or a payment method is pre-authorized as backup. If the rider reports "customer refused/unreachable", the system auto-charges the backup. Reduces rider exposure.

### 8.6 Refunds (per dev plan, with corrections)

**📗 Refund default = ORIGINAL PAYMENT METHOD** (not wallet).

```
Refund priority:
  1. Original payment method (MoMo via Paystack Transfer, card via Paystack Refund API)
  2. Besonc Wallet (opt-in, instant)

Processing timelines:
  - Wallet → Instant
  - MoMo via Paystack Transfer → 1-5 business days
  - Card → 3-10 business days (Paystack)
  - Third-party processing fees may be non-refundable
```

**Strict rule:** Riders **never** issue cash refunds. COD refunds are centrally processed to prevent rider fraud. Refund methods for COD: wallet credit or admin-initiated Paystack Transfer.

### 8.7 Refund Initiation & Fault Determination (per dev plan)

**Customer must:** select order, choose predefined reason, provide evidence, submit within policy window.

**Acceptable grounds:** Damaged/defective, wrong/missing item, non-delivery, rider misconduct, vendor error, double charge, system malfunction.

**System validation (automated):** Order exists & is delivered/completed, payment confirmed, refund window not expired, customer not flagged for abuse, evidence uploaded, no duplicate claim. If validation fails → auto-reject + fraud log. If passes → admin review queue.

**Admin reviewers access:** Full order timeline, GPS tracking logs, rider status logs, vendor prep logs, delivery proof, payment ledger entries, customer evidence, prior complaint history.

**Fault framework:**
- **Vendor fault** (incorrect item, missing, spoiled, defective, out-of-stock after accept) → vendor earnings reversed, commission adjusted, risk score updated
- **Rider fault** (wrong address, tampering, misconduct, cash mishandling, no attempt) → delivery fee reversed, possible penalty, possible suspension
- **Platform fault** (double charge, miscalculation, pricing error, app malfunction) → platform absorbs, vendor/rider protected
- **Customer fault** (wrong address, unavailable, change of mind, false claim, abuse) → refund denied, account flagged, possible restriction

**Refund decision matrix:** Full / Partial / Service fee waiver / Store credit (Wallet) / Rejection. Each decision records: liability party, financial breakdown, notes, approval authority ID.

### 8.8 Earnings Reversal
- Vendor Fault → vendor earnings deducted, commission reversed (via ledger)
- Rider Fault → rider delivery fee reversed, rider wallet adjusted
- Platform Fault → platform absorbs cost
- All reversals logged in internal wallet + payout balance + monthly audit
- No manual adjustments permitted outside system

### 8.9 Fraud Monitoring
- Every refund updates customer/vendor/rider risk score
- Automated triggers: excessive refund frequency, high dispute ratio, pattern detection, chargeback correlation
- Besonc may: suspend accounts, restrict COD, require prepaid only, block repeat offenders

### 8.10 In-App Support (NEW in v3)
- "?" button on every active order → opens issue hub
- Categories: Late delivery, wrong/missing item, item damaged, payment issue, technical issue, rider behaviour
- Self-serve refund flow: "I didn't receive my order" → verify delivery proof → auto-refund or escalate
- Auto-compensation rules:
  - Order > 30 min late → GHS 5 credit to wallet
  - Order > 60 min late → 50% refund OR GHS 15 credit (customer chooses)
  - Item missing (vendor confirmed) → item value refund + GHS 5 credit
  - Rider no-show → full refund + GHS 10 credit + rider strike
  - Wrong item (vendor confirmed) → item refund or redelivery
- Disputes tracked in `disputes` table, SLA 48h resolution
- Customer sees issue status in real-time

### 8.11 Disputes
- Customer opens dispute within time window
- Issue types: wrong item, missing item, item damaged, rider misconduct, overcharge, no receipt
- System creates SupportTicket + DisputeCase, requests evidence
- Admin reviews: full timeline, GPS, vendor prep logs, delivery proof, payment ledger, customer evidence, prior history
- Vendor/Rider response window enforced
- Admin may escalate to Senior Operations, request additional evidence
- All communication logged

---

## Section 9: Rider Payout, COD, Withdrawal & Cash Remittance Control

> This section is **largely verbatim** from the BESONC business rules and must be followed strictly.

### 9.1 Core Principle

**The rider earnings and payout record is a controlled internal financial ledger.** It is NOT a stored balance, wallet, escrow, or rider-owned funds account. It records rider earnings, company funds collected in the field, penalties, adjustments, remittances, fees, holds, reversals, and approved withdrawals.

When an order is marked Delivered, eligible earnings are auto-recorded in the earnings record, subject to validation, internal compliance, and confirmation that the relevant customer payment has settled through Paystack. Earnings are subject to review for: dispute, suspected fraud, system mismatch, reversed transactions, refund exposure, or breach.

### 9.2 Earnings Record Structure (Separated Components)

**A. Earnings Record** — earnings due to rider from platform activity (delivery payouts, distance pay, bonuses, incentives). Becomes withdrawable only when fully cleared against liabilities, deductions, settlement, and compliance restrictions.

**B. Cash Collected (COD Liability / Rider Custody Record)** — cash collected from customers on COD orders. NOT rider earnings. **Company money in rider custody** until remitted. System maintains a **negative/liability view** of COD collections and uses it in all withdrawal, restriction, and reconciliation logic.

**Core withdrawal formula:**
```
Available Payout Amount = Cleared Earnings
                        – Outstanding COD Liability
                        – Penalties
                        – Other Approved Deductions
                        + Approved Manual Credits
```

**If COD liability > cleared earnings, withdrawal is BLOCKED** until rider remits, remittance is verified, and liability is cleared.

**Example (GHS 100 COD, GHS 12 earning):**
- Immediately after delivery: Earnings +GHS 12, COD -GHS 100, Net -GHS 88
- Rider must remit GHS 88 before net moves to a positive (withdrawable) state
- After successful remittance: Earnings GHS 12, COD GHS 0, Available GHS 12

### 9.3 Settlement Timing (Paystack Ghana reality)

Paystack Ghana is **T+1 for collections** (customer payment lands in our Paystack balance next business day) and **per-transfer** for payouts. The dev plan's "instant settlement" is aspirational, not a property Paystack provides. We reconcile by **buffering** the float.

| Order Type | Settlement Window (when earnings become Available) |
|---|---|
| Food / Groceries / Errands | T+1 from delivery (next business day) |
| Shop, Pharmacy, Market | T+1 from delivery |
| High-risk / special cases | T+1+ (held for review) |
| COD orders | After cash remittance is verified + window passes |

**Why T+1, not "instant":**
- Paystack Ghana's `POST /charge` settles customer funds to our Paystack balance the **next business day** (T+1) — not instantly. Source: https://paystack.com/gh/pricing
- Each payout via `POST /transfer` costs **GHS 1** to MoMo or **GHS 8** to bank, with **min GHS 1, max GHS 50,000 per transfer**. Source: https://paystack.com/docs/api/transfer/
- If a rider earned GHS 8 on a delivery and we paid out instantly, the GHS 1 transfer fee = 12.5% of the earning. Not viable.

**Operational solution: Buffered float at Paystack Balance.** Maintain a pre-funded float at Paystack (or at our Ghana bank account linked to Paystack manual payouts) sufficient to cover 2-3 days of expected rider withdrawals. When a rider requests withdrawal, we transfer from this float, not from incoming customer funds. This decouples payout from T+1 collection. Float is topped up weekly from settled funds.

**After settlement window + checks:** earnings move from Pending Balance to Available Balance. **COD orders do not move to available until COD liability is remitted, verified, and cleared.**

Settlement controls:
- Only delivered orders qualify for payout creation
- Cancelled/failed/refunded/disputed orders held for review
- COD requires remittance confirmation before full withdrawal
- High-risk orders delayed to T+1+
- Manual release requires reason code, approver name, timestamp, audit note

**Daily batch payout (10:00 GMT):**
- One Paystack `POST /transfer/bulk` call per day, up to **100 transfers per batch** (Paystack's hard limit)
- Pays all riders with Available ≥ GHS 50 and no restrictions
- GHS 1 × N transfers in Paystack fees (absorbed by Besonc, not the rider)
- Riders receive a single "Daily payout" notification

**On-demand withdrawal (limited):**
- Senior Riders (≥ 500 completed deliveries, KYC-verified, no flags): up to GHS 200/day instant withdrawal, 1 free/day then GHS 2 fee to rider + GHS 1 to Paystack
- New / Experienced Riders: must use daily batch, no on-demand withdrawal
- Both subject to 24/7 availability, Paystack uptime, and the system controls in 9.4

### 9.4 Withdrawal Availability & Payout Processing

**Withdrawal is available 24/7** after order completion, subject to system controls, account status, settled funds, and Paystack availability.

**Conditions to process withdrawal:**
- ✅ Minimum withdrawal threshold: **GHS 50**
- ✅ Sufficient cleared Available Payout Amount after deductions
- ✅ No unresolved restriction (COD, dispute, fraud flag, identity check, account mismatch, etc.)

**5A. Withdrawal Methods:**
- **Mobile Money** (MTN, Telecel, AirtelTigo) — processed via **Paystack Transfer API** with `mobile_money` recipient type
- **Bank transfer** — processed via **Paystack Transfer API** with `nuban` recipient type

**5B. Withdrawal Fee:** 1 free withdrawal per day. After that: **GHS 2 per withdrawal** (or as updated). Paystack per-recipient transfer fees apply additionally (cannot be bundled).

**5C. Daily Withdrawal Limit:** Maximum **GHS 2,000 per rider account per day**. Above this → admin approval required. Besonc may set lower limits for specific riders/categories/risk profiles.

**5D. Paystack Collect-then-Payout Model (Buffered Float):**
1. Customer pays via Paystack Charge → T+1 settlement → our Paystack balance
2. Besonc maintains a **pre-funded float** (GHS 30,000-100,000) at Paystack balance to cover rider withdrawals independent of daily collection
3. Float is replenished weekly from settled customer funds, after accounting for vendor settlement, platform revenue, and operating float reserve
4. Riders see the float-backed balance as "Available" — they do not see Paystack, the buffer, or settlement timing
5. **Besonc must not describe the earnings record as a wallet, stored balance, escrow, or rider-owned funds.** Legal review before launch to confirm the float + ledger model is not a stored-value facility under Bank of Ghana / Payment Systems and Services Act 2019 (Act 987).

**5E. Paystack Transfer Fees (Ghana):**
- MoMo: **GHS 1 per transfer**
- Bank (ghipss): **GHS 8 per transfer**
- Per-transfer fees apply on every `POST /transfer` and every line in `POST /transfer/bulk` (bulk is a single API call but each of the up to 100 transfers is still GHS 1/GHS 8)
- For 200 daily rider payouts via MoMo: GHS 200/day in Paystack fees, GHS 6,000/month — absorbed by Besonc, not passed to the rider (the rider's GHS 2/withdrawal fee from 9.4 #5B is separate)
- Payouts require settled funds; **T+1** settlement cycle is the **minimum** delay between customer payment and payout availability

**5F. Bulk Transfer Strategy (Cost Control):**
- Daily batch payout at 10:00 GMT uses `POST /transfer/bulk` (max 100 transfers per batch)
- At 50-100 active riders/day, this is 1 API call instead of 100
- For larger rider counts, multiple batches in parallel (max 5 concurrent batches = 500 transfers per cycle)
- Every transfer still incurs its GHS 1 / GHS 8 fee — bulk saves API overhead, not Paystack fees

**5G. Refund/Reversal Treatment:** Customer refunds/reversals/chargebacks may reduce Besonc's Paystack balance, pending settlement, or internal earnings records. Transaction fees may not be refundable. Where refund affects an order before rider payout, Besonc may delay/reduce/reverse/block the related payout.

### 9.5 COD Remittance Rules (Strict)

**Riders must NEVER use personal money for any business purpose** (no "fronting" cash for vendors, no personal MoMo for items).

**Daily Remittance:**
- All COD funds remitted **same day of collection**
- Methods: MoMo deposit to Besonc-designated account, or physical handover to authorized Besonc supervisor
- Riders must upload proof of deposit or supervisor confirmation in app

**Remittance Timelines:**
- **Same-day:** Mandatory
- **Maximum delay:** 24 hours (only with staff approval)
- **Any delay beyond 24 hours** = policy breach

**📗 Rider Wallet Limits (tiered):**
| Rider Category | Daily Wallet Limit |
|---|---|
| New Rider | GHS 1,000 |
| Experienced Rider | GHS 3,000 |
| Senior Rider | GHS 5,000 |

When 90% of limit reached: **mandatory remittance same business day**. When limit reached: **new COD assignments suspended** until remittance verified. Operations may reduce/freeze/review limits for repeated breaches.

**Remittance Violation Penalties:**
| Delay | Action |
|---|---|
| 24 hours | Written warning + immediate remittance follow-up |
| 48 hours | Temporary suspension from COD |
| 72 hours | Formal investigation by Operations + Finance |
| >72 hours | Contract review, possible termination/deactivation |

Where fraud, theft, deliberate withholding, falsified proof, or misuse suspected: management review, possible referral to law enforcement.

**Prohibited Actions:**
- Using COD funds for personal expenses, loans, purchases
- Holding COD cash overnight without documented approval
- Transferring COD to personal bank/mobile money/third-party accounts
- Altering delivery status, order value, receipt details, or remittance evidence
- Delaying remittance after reaching limit
- Splitting COD to conceal total

**Penalties:** Written warning → temporary suspension → deduction/offset → permanent deactivation/contract termination → legal action/law enforcement.

**Exception Handling:** All exceptions documented and approved by Operations Manager before deadline. Valid: network downtime, MoMo/bank outage, security incident, emergency. Repeated exceptions → wallet limit review, possible COD removal.

**Audit & Monitoring:** COD subject to daily reconciliation, random audits, system monitoring, supervisor spot checks, management review. Discrepancies escalated immediately, remain open until resolved.

### 9.6 Fraud, Risk Protection & Account Review

Besonc may delay, reject, reverse, or hold a withdrawal where flagged. Funds may be held 24-48 hours (or longer for investigation/regulator/Paystack).

**Risk review triggers:** False/disputed delivery confirmation, abnormal withdrawal patterns, customer complaints, refund requests, pre-payout disputes, high-value orders needing verification, multiple failed payouts, account mismatch, suspicious signals, conduct placing platform funds at risk.

**Suspension grounds:** Credible evidence of fraud, attempted fraud, misrepresentation, account misuse.

### 9.7 Penalties, Adjustments & Rider Visibility

Earnings record may record approved deductions: late remittance penalties, cancellation charges (where policy permits), validated customer compensation recoveries, damage claims, prior posting errors.

**Every deduction must:** be logged, reason-coded, visible to admin. **No commission deduction** on rider earnings. Any deduction must have clear operational reason, policy rule, evidence, approval record.

Rider sees: amount, date, reason, supporting category, payout record impact. Admin sees: who created, reviewed, approved the adjustment.

### 9.8 Escalation Triggers & Risk Monitoring

Auto-alerts on: COD exposure above threshold, repeated non-remittance, abnormal negative payout positions, excessive cancellations, delivery confirmation anomalies, suspicious GPS/timing patterns, unusual manual adjustment frequency, repeated payout discrepancies.

Cases routed by severity to finance/operations admins, with compliance/senior management for serious/repeated incidents.

### 9.9 Admin Dashboard for Payout Control

Required metrics: total rider COD liabilities, pending vs processed payouts, ageing of overdue remittances, net payout exposure by rider/region, daily remittance performance, unresolved exception cases, blocked riders, high-risk alerts, reconciliation status.

### 9.10 Settlement, Reconciliation & Audit Alignment

All rider earnings, COD liability, and payout entries reconcile to internal and external records: Paystack balance, bank statements, MoMo payout reports, Paystack transaction logs, remittance receipts, internal order-completion and payout reports.

**Daily reconciliation is the minimum standard.** Mismatches logged, assigned for investigation, resolved within defined control timeline.

### 9.11 Roles & Responsibilities
- **Finance:** Reconciliation, payout approval governance, exception review, cash exposure reporting
- **Operations:** Rider enforcement, remittance follow-up, dispatch restrictions, first-line investigation
- **Product/Engineering:** Ledger logic, access controls, audit logs, Paystack transfer records, automated restriction rules
- **Customer Support:** May view earnings history, raise dispute cases. **MUST NOT** directly alter earnings/payout/liability records
- Manual adjustment authority: limited to specifically authorized personnel under documented approval controls

### 9.12 Exception Handling & Audit Trail

All failed remittances, disputed deductions, manual corrections, reversal requests, blocked payout cases → recorded in exception workflow with case status, owner, action history, timestamps, resolution notes. **No exception resolved outside the system of record.**

---

## Section 10: Vendor Onboarding, SLAs, Penalties & Vendor Plans

### 10.1 Two Vendor Types (Distinction is Critical)

**Business Vendor** — registered business, shops, brands, commercial vendors with valid business registration documents. Subject to: business registration certificate, certificate of incorporation, TIN, business address, authorised representative, category-specific compliance documents.

**Individual Vendor** — personal sellers, side hustlers, unregistered traders without business registration. Subject to: Ghana Card or accepted national ID, selfie verification, location, payment details, **no business documents required** at launch.

📗 A vendor must not falsely claim Business Vendor status. Besonc reserves the right to request documents, reclassify, or refuse classification.

**Internal operational differences (per dev plan):**
| Area | Individual Vendor | Business Vendor |
|---|---|---|
| Business registration required | No | Yes |
| Personal ID verification | Yes where required | Yes (representative ID may apply) |
| Listing limits | Lower at launch | Higher |
| Category access | Standard, lower-risk | Broader, subject to compliance |
| Risk controls | Higher (stricter moderation) | Standard to enhanced |
| Payout controls | Tighter | Based on category and performance |
| Premium plan access | Yes | Yes |

### 10.2 Vendor Onboarding Flow

**Steps:**
1. Phone + OTP
2. Choose vendor type: Business or Individual
3. Fill business/personal details
4. Upload required documents (per type)
5. **Smile ID KYC** — Ghana Card verification + liveness check + AML/PEP screening (for both types)
6. **Business vendors only:** Business registration certificate, TIN, owner/director ID, authorised representative info
7. **Pharmacy:** Pharmacy Council license + Responsible Pharmacist license + annual renewal verification + cold chain confirmation
8. **Food:** Food handlers permit
9. Submit for review → status `pending_review`
10. Admin reviews (24-48h SLA) → approve / reject (with reason) / request more info
11. Approved → vendor sets up catalogue, opens for business

📗 **Admin can request additional documents at any time.** Failure to provide may delay onboarding, lead to rejection, restricted category access, suspension, or reclassification.

### 10.3 Vendor Service Level Agreement (SLA) — Comprehensive

**2.1 Order Acceptance Time:**
- **Standard target:** Accept/reject/mark unavailable within **5 minutes** of notification
- **Maximum window:** No order unaccepted for more than 30 minutes
- **Critical categories** (food, perishables, pharmacy, gas, water, urgent errands): **2-5 minutes** where practicable
- **Non-critical/scheduled orders:** Up to 24 hours after receipt, or 1 hour before scheduled fulfillment, whichever is earlier
- **Not accepted within window** → auto-reassignment, cancellation, or escalation

**2.2 Preparation Time Accuracy:**
- EPT must be accurate, realistic, based on actual kitchen/store/staffing capacity
- Orders must be ready on or before EPT
- Update EPT + notify Besonc operations on genuine delay
- **Rider waiting time at pickup should not exceed 5 minutes**
- Vendors must not mark ready before fully prepared, packed, labelled, available

**2.3 Order Accuracy:** ≥ **98% target**. Correct items, quantities, sizes, variants, specs. Proper packaging. High-value goods checked against serial/IMEI/model. Substitutions only with customer or Besonc operations approval.

**2.4 Cancellation Rate:** Vendor-initiated cancellations **< 3% per 30 days**

**2.5 Refund Cooperation:** Vendors respond to refund/dispute/investigation requests within **24 hours** unless shorter required. Preserve records, receipts, packing evidence, product photos, serial numbers, stock logs, rider handover. Failure to provide evidence → claim may be decided for customer.

**2.6 Operating Hours:** Vendors must not accept orders outside stated hours unless they can fulfill within service standard. App must reflect real-time business status. Pause/close store promptly when unable to fulfill.

### 10.4 Penalty Framework (per dev plan, exact)

**3.1 Order Acceptance Penalties:**
| Violation | Action |
|---|---|
| Order unattended > 5 min | System warning / performance notice |
| Order unattended > 10 min | Auto-reassignment, cancellation review, ranking impact |
| Repeated late acceptance in 7-day period | Visibility reduction, order allocation limits, operational penalty |
| Accepting while unavailable/out of stock | Refund reversal, customer compensation recovery, temporary suspension |

**3.2 Preparation Delay Penalties:**
| Violation | Penalty |
|---|---|
| Rider waits 3-5 min | Warning |
| Rider waits 6-10 min | **GHS penalty or ranking drop** |
| Repeated delays (3×/week) | Temporary suspension |

**3.3 Order Accuracy Failures:**
| Issue | Action |
|---|---|
| Wrong/missing item | Refund + vendor reversal |
| Repeated errors | Penalty + visibility reduction |
| Severe repeat issues | Suspension |

**3.4 Cancellations:**
| Frequency | Action |
|---|---|
| 1-2 in 30 days | Warning |
| 3-4 in 30 days | Penalty |
| ≥5 in 30 days | Suspension |

**3.5 Rider Waiting Abuse:** Vendor may be charged **idle compensation**, ranking reduced, order allocation limited, pickup process reviewed.

**3.6 Repeat offenders may be restricted from high-value orders, lose COD eligibility, or be terminated.**

### 10.5 Vendor Credits & Incentives

Vendors with strong performance may receive:
- Higher visibility
- Priority order allocation
- Reduced commission (temporary campaigns)
- Promotional boosts

**Monthly eligibility:**
- Acceptance rate ≥ 97%
- Prep-time accuracy ≥ 95%
- Cancellation rate ≤ 2%
- Customer rating ≥ 4.5
- Refund-related fault rate within platform limits

### 10.6 Dispute Resolution

Vendors may dispute penalties, refund reversals, or operational findings **within 48 hours** of notification. Evidence via vendor dashboard or official support channel: order photos, stock records, rider handover confirmation, CCTV, customer communication, receipts, serial numbers, dispatch logs.

Besonc may request additional clarification. Admin decision is final unless escalated internally.

### 10.7 Vendor Plans (Two-Tier Model)

**STANDARD PLAN — FREE**
- Get listed on Besonc
- Receive customer orders
- Manage orders from vendor dashboard or app
- Upload and manage products, menus, services
- Access Besonc delivery support
- Receive payouts based on approved payout structure
- Standard platform visibility
- Standard vendor support

**PREMIUM PLAN — GHS 150/month or GHS 1,530/year (save 15%)**
Everything in Standard, plus:
- Improved visibility
- Stronger placement opportunities
- Story/status updates
- Promotional support and campaign participation
- Featured offers / highlight opportunities
- Better business insights and analytics
- Faster support response
- More tools to increase discovery and engagement
- (Internal: reduced commission, priority support, custom payout, contract pricing, multi-branch)

### 10.8 Vendor Code of Conduct & Terms (high-level)

Vendors must: Operate honestly, accurate descriptions/pricing/availability, treat customers/riders/staff respectfully, prepare accurately and on time, follow platform rules, use customer data only for fulfillment, cooperate in dispute resolution, comply with Ghanaian laws.

**Vendor can be suspended/terminated for:** Policy violations, fraud/misrepresentation, repeated complaints, regulatory non-compliance, payment misconduct, data misuse, off-platform evasion, failure to cooperate with audits.

### 10.9 Marketplace Listing Rules (vendor applies)

- Listing accuracy mandatory (name, description, price, images, category, availability)
- Real images of actual product (stock images only for factory-sealed items)
- No misleading titles, no hidden defects, no fake brands
- Correct category placement
- Out-of-stock items must be marked immediately
- Price shown must match actual selling price
- Repeated "out of stock after acceptance" → penalty
- Auto listing checks: image verification, price anomaly detection, category mismatch alerts, duplicate detection

### 10.10 Pharmacy-Specific Compliance (full checklist per dev plan)

**Already onboarding-time required (from Section 3 — see Service 5).**

In addition to standard pharmacy onboarding:
- Quarterly license revalidation
- Random compliance checks
- Complaint tracking log
- Suspension procedure for violations

**Automatic suspension triggers:** Expired pharmacy license, sale of controlled drugs illegally, repeated customer complaints about wrong medication, regulatory authority investigation.

### 10.11 SLA Review & Updates

SLA may be updated periodically. Vendors notified in advance. Continued use implies acceptance. Besonc may adjust acceptance windows, refund liability rules, penalty thresholds, or category-specific obligations based on operational needs, fraud trends, customer protection requirements, or applicable law.

---

## Section 11: Customer, Rider, Admin App Feature Requirements

### 11.1 Customer App & Web (Feature List)

**A. Onboarding & Account:**
- Phone/email login, OTP via **Hubtel SMS** (per business rules)
- Social login: Google, Apple, Facebook (optional)
- Profile: name, phone, email, photo (optional)
- Manage profile: edit, change password/PIN, manage saved profiles, dark mode, sign out
- KYC (optional, for VIP/business or high-value orders): ID upload, address details

**B. Home Screen & Service Selection:**
- Service tiles: **Food, Shop, Market, Pharmacy, Courier/Parcel, School Delivery, Laundry, Errands** (the 8 BESONC services)
- Search bar (vendors and items)
- Location selector: auto-detect, manual, saved (Home, Work, School, Hostel)
- Promotional banners, featured/nearby vendors

**C. Ordering Flow (Food/Shop/Market/Pharmacy):**
- Category → Vendor → Product flow
- Vendor profile: logo, name, location, hours, rating/reviews
- Products: photos, description, price, variants
- Cart: add/remove, quantity, notes to vendor
- **Delivery type: Standard / Express (20 min - 1 hour) / Scheduled**
- Payment method: MoMo, Card, COD (if allowed)

**D. Courier/Parcel/Errand Flow:**
- "Send a Parcel" / "Run an Errand" screens
- Pickup address (map + manual), drop-off address, contacts, package type, description, photo upload
- Pricing: automatic by distance + service type
- Special instructions
- For errands: description, budget cap, item images

**E. Real-Time Tracking & Order Management:**
- Real-time rider tracking on map
- Status: Pending → Accepted → Picked Up → On the Way → Delivered
- ETA updates
- In-app chat with rider, vendor, support
- Push notifications (via Firebase): order accepted, rider assigned, rider nearby, delivered
- Cancel order (within allowed time)
- Rate & review: rider rating, vendor rating, comment

**F. Payments, Wallet & Receipts:**
- Link MoMo (via Paystack) and bank card
- **Besonc Wallet (now top-up capable)** — load via Paystack Charge, use to pay
- Order summary + downloadable receipt
- Refund handling (auto-wallet credit or original method)

**G. Promotions & Subscriptions:**
- Enter promo codes
- See active discounts
- Subscription/VIP plans: monthly delivery plans with lower fees, priority support, night delivery
- Loyalty points: earn per order, redeem for discounts

**H. Scheduling & History:**
- Schedule future deliveries
- Order history (filter by service type)
- Reorder button
- Favourites (vendors, items)

**J. Support & Settings:**
- In-app help center: FAQs, common issues
- Contact support: in-app chat, **Hubtel SMS**, phone (no WhatsApp per business rules)
- Settings: language, notification preferences, payment methods, privacy/ToS, delete account

### 11.2 Rider App (Feature List)

**A. Registration & Onboarding:**
- Phone, email, address
- **Smile ID KYC**: Ghana Card verification + liveness check + AML screening
- Document upload: Ghana Card, driver's license, bike/car registration, vehicle photo, insurance
- **Device lock:** Account bound to one device; new device = OTP + admin re-approval (anti-account-sharing fraud)
- Admin approval (24-48h SLA)
- Training tutorial

**B. Availability & Job Handling:**
- Go Online/Offline switch
- Receive delivery requests with full details (pickup, drop-off, expected earnings incl. tip, COD exposure, batch info)
- Accept/Decline within 10-20 second window
- Batch add-on accept for batched deliveries

**C. Trip Management:**
- Trip details: customer name/phone, pickup address (Google Maps navigation), drop-off, notes
- Status updates: accepted → on the way to pickup → arrived at pickup → picked up → on the way to customer → arrived → delivered
- Photo proof of delivery (doorstep), customer signature/PIN

**D. Rider Wallet & Earnings:**
- **Internal ledger view only** (not a wallet, per dev plan)
- Today's earnings, completed trips, weekly/monthly breakdown
- COD balance owed to Besonc (visible separately as liability)
- Cash vs digital tracking

**E. Ratings & Performance:**
- Average rating from customers
- Breakdown of feedback (late, politeness, handling)
- Performance metrics: acceptance rate, completion rate, on-time rate
- **Performance-based incentives**: bonus levels, badges (Top Rider, 5-Star)

**F. Notifications & Support:**
- New order alerts (sound, vibration)
- Policy/area updates
- **SOS / emergency contact** button
- Support chat or call for delivery issues

**G. Manage profile & Settings:** Edit, change password, update motor details, dark mode, sign out, language, notification preferences, payment methods, delete account

### 11.3 Admin Dashboard (Feature List)

**A. User Management:**
- Customers: list, search, filter, view profile/orders/issues, block/suspend
- Riders: approve/reject, status, performance, COD balance, payments, **device history** (unbind if needed)
- Vendors: approve/reject, manage branches, performance, **commission rate adjustment per vendor**

**B. Live Operations & Map:**
- Live map of active riders + active deliveries
- List of all current trips with service type, rider, ETA, city
- **Manually assign rider to order** (with justification note)
- Reassign if current rider has a problem

**C. Order & Service Management:**
- View all orders (filter by status/date/service/city)
- View order details, customer/vendor/rider/route
- Cancel/modify orders (admin override)
- Configure service types per city (turn on/off)

**D. Pricing & Fees:**
- Edit delivery fee tiers, peak surcharges, night surcharges
- Different rates per service type or vehicle
- Free delivery campaigns (e.g., if order > GHS X)

**E. Finance & Reporting:**
- Overview dashboard: daily/weekly/monthly revenue, orders per service, cash vs digital
- Rider settlements: who owes cash, who we owe bonuses
- Vendor settlements: sales, commissions, net payable
- Payout history
- Profit & loss overview
- Export CSV/Excel for accounting

**F. Promotions, Campaigns & Notifications:**
- Create promo codes (%, fixed, conditions, dates)
- Run campaigns ("Free Delivery Weekend", "First Order Discount")
- Send push notifications to all customers, riders, vendors, or specific segments

**G. Issue Management & Escalation:**
- Track complaints: late delivery, wrong items, rider behaviour, vendor issues
- Case handling: assign to support, chat log, resolution notes
- Refund/compensation control: full/partial, wallet credit

**H. Settings & Configuration:**
- Multi-city setup, active services per city
- App content: T&Cs, Privacy Policy, FAQs
- Roles & permissions: Super Admin, City Manager, Support Staff, Finance/Admin
- Integration management: Paystack, Hubtel, Google Maps, Smile ID

---

## Section 12: Promotion, Referral & Growth System

### 12.1 Ghana Market Context
- Customers respond strongly to instant, simple, visible rewards
- MoMo widely used, but rewards should be **in-app credit** to reduce cash abuse
- Smaller incentives work if simple to understand
- Social media is the primary sharing channel
- Multiple SIM/device abuse risk is HIGH → fraud controls essential

### 12.2 Customer Referral Program (Launch)

**Offer:** Invite a friend → You both get GHS 20 Besonc credit.
- Referrer: GHS 10 in-app credit
- New customer: GHS 10 discount on first qualifying order
- Minimum order value: GHS 30
- Unlock: first successful delivery completed and not refunded
- Type: in-app credit only (NOT MoMo cash)

**Rules:**
- Referred customer must be new (unique phone + device fingerprint)
- Reward unlocks only after first successful, non-refunded delivery
- Cancelled/refunded/failed/duplicate/suspicious orders don't qualify
- Credit expires in 14 days
- Credit usable only on Besonc orders (not withdrawable)
- Besonc may restrict for high-risk categories or suspected abuse

### 12.3 Rider Referral Program (Milestone-Based)

**Offer:** Up to GHS 200 for referrer, GHS 200 for new rider. **Paid on milestones, not signup.**

| Milestone | Reward | Condition |
|---|---|---|
| 25 completed deliveries | GHS 100 | Completed, verified, not disputed |
| 50 completed deliveries | GHS 200 | Rider active, verified, in good standing |

**Conditions:** New rider must pass Smile ID KYC + vehicle review + operational approval. Suspended/inactive/investigated/duplicate accounts block reward. COD issues, failed deliveries, fraud flags, account sharing block reward. Reward subject to Accounts + Operations controls before withdrawal.

### 12.4 Vendor Referral Program

**Offer:** Up to GHS 200 for referrer. Unlock: new vendor completes **20 real customer orders**.

**Conditions:** Vendor must complete onboarding + menu setup + payment setup + operational approval. Only **real orders** count (not test, not internal). Cancelled/refunded due to vendor fault don't count. Premium categories (pharmacy, electronics, fulfilment, corporate) may require management approval.

### 12.5 Referral Code Formats (by role)
- Customer: `YDC123` (uses customer ID)
- Rider: `YDR123` (uses rider ID)
- Vendor: `YDV123` (uses vendor ID)

### 12.6 Viral Boost Campaigns
- **Weekly Customer Challenge:** Invite 3 friends this week → extra GHS 20 Besonc credit (unlocks after all invited complete qualifying deliveries, weekly capped, selected zones)
- **Launch Ambassador Campaign:** Campus/rider/vendor ambassadors with milestone-based rewards linked to real orders, active riders, productive vendors

### 12.7 Anti-Fraud & Abuse Controls
- Require unique phone number for each referred account
- Detect duplicate or suspicious device fingerprints
- Detect repeated use of same payment method, MoMo number, delivery address, GPS pattern, or device
- Block self-referrals and linked-account referrals
- Do not reward cancelled, refunded, failed, fake, internally created, or suspicious orders
- Monthly referral caps per customer/rider/vendor/phone/device/payment account
- Flag unusual referral velocity, repeated first-order-only behaviour, duplicate addresses, suspicious clusters
- Hold rewards for manual review when risk signals detected

### 12.8 App & System Requirements
- Every customer/rider/vendor gets unique referral code
- Easy to copy, share, display as QR
- Referral dashboard: total invites, pending/approved/rejected rewards, expiry, history
- Track: source, code, phone, device fingerprint, order status, payment status, delivery status, refund status, reward eligibility
- Reward statuses: Pending, Qualified, Approved, Credited, Expired, Rejected, Under Review
- Admin can pause, cap, review, approve, reject, or reverse with reason codes

### 12.9 Cost Control
- Customer: GHS 5-20 range, in-app credit only, first-successful-delivery required
- Rider: GHS 50-200 range, milestone-based
- Vendor: GHS 50-200 range, 20 real orders required
- Review monthly: CAC, repeat order rate, fraud rate, retention, delivery margin, growth target, budget

### 12.10 Common Mistakes to Avoid
- Paying referral rewards instantly through MoMo before qualifying action
- Unlimited referrals without monthly caps
- Rewarding sign-ups instead of completed deliveries/orders
- Allowing same-device, same-phone, linked-account referrals
- Ignoring refund/cancellation/chargeback before approval
- High-value rewards without fraud monitoring
- Failing to expire unused credit

### 12.11 Reporting & KPI Tracking (Weekly during launch, monthly after)
- Total referral invites sent
- Sign-ups
- First orders completed by referred customers
- Repeat order rate of referred customers
- Referral reward cost per successful customer
- Rider/vendor referral activation/conversion rate
- Fraud flags, rejected rewards, abuse rate
- Referral revenue contribution + delivery margin impact

### 12.12 Accounts & Operations Controls
- Weekly reconciliation of approved referral credits + reward liabilities
- Operations reviews suspicious patterns before reward release
- Reward reversals logged with reason code + approval owner
- Referral costs posted to marketing/growth expense account
- In-app credits tracked separately from cash payouts
- Rider/vendor cash rewards require approval before payment

---

## Section 13: Errands Full Implementation

### 13.1 Errand Types Supported
- Pickup & Drop-off (pick from A, deliver to B)
- Buy & Deliver (purchase within budget, deliver)
- Bill Payment / Top-up (ECG, water, data)
- Queue / Pick-up Services
- Return / Exchange
- Multi-stop Errands (max 3-5 configurable stops)

### 13.2 Customer Flow

1. **Open Errands tile** → Choose type (Pickup / Buy & Deliver / Bill Payment / Return / Other)
2. **Fill Errand Form:**
   - Errand title
   - Detailed instructions
   - Item list (if buying): name, brand/spec, quantity, optional photo
   - Locations: pickup location (if pickup), delivery location, store/market (if buying), shop preference
   - Contacts: sender (pickup), recipient (drop-off)
   - Timing: Standard / Express / Scheduled
   - Notes to rider: gate, landmark, "call before arrival"
3. **Budget & Spending Control (for Buy errands):**
   - Set purchase budget cap (GHS 50 / 100 / 200)
   - Substitution rules: "Call me if not available" / "Allow similar option"
   - Receipt photo required: YES (default) / NO
4. **Pricing & Checkout:**
   - Service type: Errand
   - Delivery fee estimate
   - Errand handling fee (time/complexity)
   - Service fee
   - Total
   - Payment method: Wallet / MoMo / Card (recommended) / COD (low-risk errands only)
5. Confirm order

### 13.3 System Flow
1. **Create records:** Order (type=ERRAND), Errand details, OrderPricingBreakdown, OrderStatusHistory
2. For Buy errands: create **PurchaseHold** (escrow in Besonc wallet)
3. **Dispatch rider** by proximity, availability, reliability, fairness rotation, rating (tie-breaker only)
4. Rider offer includes: pickup/drop-off, expected earnings, budget cap, proof requirements

### 13.4 Rider Flow
1. Accept job (logged: offer time, accept/decline, assignment)
2. Status updates: "Heading to pickup" / "Arrived at pickup/shop"
3. **For Pickup & Drop-off (no purchase):** Collect item → confirm pickup (with optional photo) → head to drop-off → confirm recipient identity (call if needed) → collect Delivery PIN/QR → mark delivered
4. **For Buy & Deliver (with purchase):**
   - **9B-1:** If item unclear/unavailable → "Request clarification" → customer approves substitution
   - **9B-2:** **Rider cannot spend above budget cap** unless customer approves. Top-up request → customer approves/rejects in-app. System logs approval.
   - **9B-3:** Upload receipt photo + enter purchase amount → system validates against hold/budget
   - **9B-4:** Proceed to drop-off → PIN/QR → delivered
5. **For Bill Payment:** Customer provides meter/account number, amount limit, provider. Rider uploads receipt/screenshot + reference number. Mark paid.

### 13.5 Completion & Money Flow
- Delivery cannot complete without: delivery proof (PIN/QR/photo/signature), receipt proof (if purchase), amount reconciled (if wallet hold)
- **For wallet hold (Buy errands):**
  - Purchase amount < hold → unused amount released back to customer
  - Purchase amount > hold → blocked unless approved earlier
  - **Rider never handles refunds for purchase** — system does it
- Settlement allocation:
  - Rider earning
  - Platform service fee
  - **No vendor earning if vendor not in system** (market buying) — item cost is customer expense, platform only earns service fee

### 13.6 Critical Rule: Riders Never Use Personal Money

**Riders must NEVER use personal money for any business purpose.** This includes:
- Fronting cash for "Buy" errands
- Personal MoMo to pay for items
- Personal bank transfers

**For "Buy" errands, the system holds funds in the customer wallet (escrow).** Rider uses a Besonc-generated payment method:
- Admin-assisted MoMo release (controlled)
- QR/OTP-based vendor payment
- Cash advance from Besonc operations (controlled)

**If no Besonc-approved payment method is available, the errand cannot proceed.**

### 13.7 Proof When Receipts Are Unavailable (Ghana reality)

When vendors (especially in markets) don't provide receipts, **alternative proof is allowed** (at least one required):
- Clear photo of purchased items
- Photo of vendor stall/shopfront
- Handwritten vendor note (optional)
- Rider voice note explaining purchase
- GPS + timestamped photos

System allows "No receipt – Market vendor" flag with photo evidence.

### 13.8 What If All Items Exceed Budget?
- Rider requests budget increase
- **If customer rejects:**
  - Rider buys nothing
  - Errand marked "Unfulfilled – Budget Rejected"
  - Rider must NOT buy partial items unless customer explicitly approves
  - **Rider compensation:** Base errand handling fee + distance fee (one way)
  - **Customer:** Full refund of item budget; non-refundable service fee may apply

### 13.9 Errand Handling Fee Tiers
| Errand Type | Base Handling Fee |
|---|---|
| Simple pickup/drop | Low |
| Buy & deliver | Medium |
| Multiple items/shops | High |
| Queue / bill payment | Very High |

Plus time component: First 30 mins included; additional time billed per 15-30 min block.

### 13.10 Queue & Waiting Errands
- Customer pays estimated wait time upfront
- **Maximum wait limit:** 2 hours
- If exceeded: rider requests extension, additional waiting fee applies, rider may exit and still be paid

### 13.11 Recipient Unavailable at Delivery
- Rider waits 10-15 minutes
- Attempts call + in-app message
- If no response: Delivery marked Failed – Recipient Unavailable
- Items: Returned to vendor (if possible) OR Besonc hub OR held by rider (tracked)
- **Customer pays:** Delivery fee + handling fee; item refund depends on vendor policy

### 13.12 Errand Value Limits (by user trust)
| User Type | Max Errand Value |
|---|---|
| New users | GHS 300 |
| Verified users | GHS 1,000 |
| Trusted users | GHS 3,000+ |
| Absolute cap | GHS 5,000 (manual review) |

**"New user" definition:** < 7 days since signup OR < 3 completed orders OR no verified ID OR no successful payment history.

### 13.13 Failed Errand Compensation
If failure is not rider's fault:
- Handling fee ✓
- Distance fee ✓
- Waiting fee (if applicable) ✓

### 13.14 Required Database Entities
- Order
- Errand
- OrderStatusHistory
- OrderAttachment
- DeliveryProof
- PurchaseHold / BudgetApproval
- ReceiptProof (or part of attachment)
- SupportTicket + DisputeCase

### 13.15 Multi-Stop Errands
- Price = Base handling fee + Distance (total) + Time (total) + Per-stop surcharge
- Max stops: 3-5 (configurable)
- If one stop fails: rider continues remaining stops if logical; successful stops paid, failed stop refunded

### 13.16 Return Refused by Shop
- Return eligibility must be verified before dispatch
- If refused: rider compensated, item returned to customer or hub

### 13.17 Refund Handling for Returns
- Cash refund → rider submits → customer wallet credited
- Store credit → customer notified (no cash equivalent)
- Exchange → new delivery handled as separate job

### 13.18 Required Delivery Proof
- **Must have:** Delivery PIN/QR proof
- **Receipt proof for buy errands**
- **Budget cap + approvals for increases**
- **Full audit logs** for approvals, purchases, delivery proof
- **Rider cannot "complete" without proof steps**

---

## Section 14: Data Handling SOP & Internal Operations

### 14.1 Purpose
Defines how Besonc staff must access, collect, use, store, share, retain, and protect personal data. Supports compliance with **Ghana Data Protection Act, 2012 (Act 843)** and the Data Protection Commission.

### 14.2 Scope
Applies to all Besonc personnel: Admin, Support, Operations, Finance, Compliance, IT, Engineering, Product, Security. Covers all data subjects: customers, vendors, riders, employees, contractors, applicants.

### 14.3 Data Access Principle
**Core Principle: Least Privilege and Need-to-Know.** Staff may only access minimum personal data necessary for assigned duties. Access must be tied to defined business purpose, approved system role, legitimate operational need. **Browsing, curiosity access, informal checking of accounts is strictly prohibited.**

**Role-based access:**
- **Support Admin:** Tickets, order status, limited customer contact, complaint history
- **Operations Admin:** Rider and vendor operational profiles, assigned orders, route/delivery status
- **Finance Admin:** Transaction references, payouts, COD reconciliation, refund logs
- **Super Admin:** Elevated access, subject to monitoring and accountability

All access logged and auditable.

### 14.4 Authentication & Session Security
- Approved company-managed accounts only
- Strong unique passwords, no sharing, no personal-company reuse
- **MFA (OTP) for sensitive actions** (password reset, payout approvals, user changes, high-risk admin tasks)
- **No account sharing**
- Auto session expiry
- Lost/stolen device → immediate report → account disabled, sessions revoked

### 14.5 Data Viewing & Use Rules
**Authorized use only** for service delivery, issue resolution, complaint investigation, financial transactions, legal obligations. **Prohibited:** Downloading/exporting lists without approval, screenshots of sensitive info, sharing via personal email/cloud/messaging, marketing use without legal basis.

**Misuse** = disciplinary action, suspension, investigation, contract sanctions, termination, regulatory/legal action.

### 14.6 Customer Support Data Handling
- **Verify identity** before disclosing/changing account info
- OTP, recent order, registered phone
- **Mask financial info** (never full card numbers)
- **Limit discussion** to necessary info
- **Never request/record:** Full MoMo PIN, card CVV, password, OTP
- Escalate suspected fraud to supervisor

### 14.7 Rider and Vendor Data Handling
- ID documents, licenses, bank details stored securely
- Access restricted to authorized personnel
- **Downloads and sharing restricted and monitored**
- No disclosure outside Besonc except via approved processes
- **Offboarding:** Disable accounts, revoke credentials, archive (don't immediately delete)

### 14.8 Payment and Financial Data
- Processed only via approved providers (Paystack, Smile ID for KYC)
- **Staff MUST NOT access/request/store/disclose** full card numbers, MoMo PINs, CVVs, passwords
- Refunds/reversals only via authorized dashboards
- COD reconciliations supported by evidence

### 14.9 Data Storage & Retention
- Retain only as long as necessary for purpose + legal/regulatory/tax/audit/dispute requirements
- **Orders and transactions:** Minimum period for finance/audit/statutory
- **Support tickets:** Operational and investigation period
- **Inactive accounts:** Archived in line with legal basis
- **Call recordings, CCTV:** Limited period unless preserved for investigation
- **Deletion/anonymization:** Controlled and authorized, with audit traceability

### 14.10 Data Sharing with Third Parties
Only share when: lawful basis, necessary for service, recipient is approved and under contractual controls, minimum necessary. **Informal/undocumented sharing is strictly prohibited.**

### 14.11 Data Breach & Incident Response
Any suspected/confirmed loss, unauthorized access, disclosure, alteration, misuse, compromise = **security incident** escalated immediately.

Response: Contain (disable access, revoke sessions, isolate) → Notify internal owner → Assess scope/impact → Preserve evidence → Document fully → Determine regulatory notification (Data Protection Commission if required under Act 843) → Implement corrective actions → Log and track to closure.

### 14.12 Staff Training & Acknowledgement
- Onboarding training before access granted
- Refresher periodically and on major changes
- Documented completion and acknowledgement
- Records stored in HR/compliance repository

### 14.13 Audit, Monitoring & Enforcement
- Periodic access reviews and audit checks
- Review of admin logs, transaction trails, exception reports
- Breaches → corrective action, disciplinary, contractual, escalation

### 14.14 Responsibilities & Accountability
- All staff: understand and comply
- Line managers: ensure role-appropriate access, complete offboarding, escalate breaches
- Compliance, Legal, IT, Security, system owners: oversight, high-risk advice, remediation

### 14.15 Document Control & Review
- Owner: Compliance, Legal, or assigned policy owner
- Review at least annually and on major changes
- Version-controlled, communicated to stakeholders

### 14.16 Operations System (SOPs from dev plan)

**SOP — Order Flow (All Services):**
1. Customer places order (select service, address, payment)
2. Vendor receives notification, accepts/rejects (alternatives suggested if rejected)
3. Rider gets request, accepts (next rider if rejected)
4. Rider arrives, checks items, confirms pickup, starts trip
5. Live tracking (rider follows map, customer tracks, admin monitors)
6. Drop-off: customer receives, rider confirms via signature/photo/PIN
7. Payment settlement (digital via Paystack or COD remittance)

**SOP — Customer Support:**
- Channels: in-app chat, **Hubtel SMS**, phone, email (no WhatsApp per business rules)
- Issue categories: late rider, wrong item, vendor issue, payment, technical, rider behaviour
- Support actions: call, get evidence, escalate, solve within 15 minutes
- Close case or escalate to Ops Manager
- Log history, add to metrics

**SOP — Rider Daily Routine:**
- Pre-shift: vehicle check (fuel, brakes, tires), clean delivery bag
- On shift: accept orders quickly, follow map, communicate professionally, submit proof
- End shift: submit cash collected, report issues, check earnings

**SOP — Vendor Onboarding:**
- Registration → menu upload → training → test order → live

**SOP — Cash Collection & Remittance:**
- Riders collect cash for COD
- System logs all COD
- End of day: rider submits cash, supervisor checks app vs cash, discrepancies investigated
- Penalties: missing cash = deduction, repeated = termination

**Performance KPIs:**
- Developer: 99% uptime, <48h bug resolution, 2-week release cycle
- Rider: 80-90% on-time, 4.5+ rating, low cancellation
- Vendor: 90%+ acceptance, <10 min prep
- Support: <30s response, <15 min resolution
- City Manager: rider availability, delivery time, complaint reduction

**Risk & Compliance:** Fraud, cash theft, rider accidents, food contamination, app downtime, vendor misconduct. Controls: daily cash audit, GPS monitoring, background checks, API monitoring, vendor suspension.

---

## Section 15: Backup & Disaster Recovery

### 15.1 Purpose
Protects critical data, recovers systems, minimises downtime and data loss, ensures business continuity across Ghana.

### 15.2 Scope
Databases (orders, users, payments, wallets), application code & infrastructure, third-party configurations, admin/operational systems, audit logs, legal records.

### 15.3 Disaster Scenarios
- **Technical:** Server/cloud outage, DB corruption, deployment failure, network failure
- **Security:** Data breach, ransomware, credential compromise
- **Operational:** Power outages, hardware failure, office inaccessibility
- **External:** Natural disasters, ISP outages, **Paystack / Hubtel / Google Maps / Smile ID downtime**

### 15.4 Data Classification
| Data Type | Examples | Criticality |
|---|---|---|
| Core transaction | Orders, payments, wallets | Critical |
| Identity | Users, vendors, riders | Critical |
| Configuration | Pricing, settlement rules | High |
| Logs & audit | Payment logs, admin actions | High |
| Media | Images, receipts | Medium |
| Analytics | Metrics, dashboards | Medium |

### 15.5 Backup Strategy
- **Databases:**
  - Incremental: every 15-30 minutes
  - Full: daily
  - Retention: 30 days daily, 12 months monthly
  - **Storage:** Encrypted cloud, separate region from production
- **Application code:** Private GitHub repos
- **Infrastructure-as-Code:** Version controlled
- **Container images:** Secure registry
- **Third-party configurations:** Secret manager (Paystack keys, Hubtel keys, Google Maps key, Smile ID key)
- **Admin/legal documents:** Encrypted cloud drive, restricted access

### 15.6 Recovery Objectives
- **RPO:** ≤ 30 minutes
- **RTO:** ≤ 4 hours for critical systems
- **Full Platform Restore:** ≤ 24 hours

### 15.7 Disaster Recovery Procedure
1. **Incident declaration:** Super Admin declares, DR plan activated
2. **System isolation:** Suspend affected services, lock transactions if needed
3. **Data restoration:** Latest clean backup, verify integrity, validate wallet balances
4. **Application restore:** Redeploy containers, restore env vars, smoke tests
5. **Payment & operations check:** Reconcile payment records, verify settlements, resume flow
6. **Communication:** Internal update, external notice if needed, **regulatory notice if data involved (Data Protection Commission)**

### 15.8 Payment-Specific Safeguards
- **Payment ledger is append-only** (matches our outbox + double-entry design)
- Journal entries used to reconcile balances
- Withdrawals frozen during recovery
- Manual review before reactivation

### 15.9 COD Contingency
- Rider cash records backed up in real-time
- Outstanding cash tracked per rider
- Manual reconciliation if downtime
- **COD disabled temporarily during recovery if required**

### 15.10 Roles
- Super Admin: Declare disaster, approvals
- Tech Lead: Restore systems
- Finance Admin: Reconcile payments
- Ops Admin: Rider/vendor coordination
- Support Admin: User communication

### 15.11 Testing & Maintenance
- Backup restore tests **quarterly**
- DR simulations **annually**
- Backup failures investigated immediately
- Documentation updated after major incidents

### 15.12 Security & Compliance
- All backups encrypted (at rest and in transit)
- Access restricted by role
- Logs retained for audits
- Aligned with **Ghana Data Protection Act, 2012 (Act 843)**

### 15.13 Document Control
Owner: Super Admin / Tech Lead. Review cycle: Annually.

---

## Section 16: Technology Architecture & Integrations

### 16.1 Third-Party Integrations (THE DECISIONS)

| Function | Provider | APIs Used | Why |
|---|---|---|---|
| **Payments (charge)** | **Paystack** | `POST /charge` (mobile_money, card, bank) | Native Ghana support, all 3 MoMo networks |
| **Payouts (transfer)** | **Paystack** | `POST /transferrecipient` + `POST /transfer` | Mobile money + bank transfers to MTN, Telecel, ATL, banks |
| **Internal money movement** | Besonc ledger | (our own) | Source of truth, orchestrator between Charge and Transfer |
| **SMS OTP & notifications** | **Hubtel** | Hubtel SMS API | Per business rules (NOT Arkesel, NOT WhatsApp) |
| **Maps & location** | **Google Cloud** | Maps SDK (React Native + Web), Places API, **Routes API** (`Compute Route Matrix`, replaces legacy Distance Matrix), Geocoding | Per business rules (NOT generic "Google Maps SDK"). No route caching — Google ToS forbids it. |
| **Vendor & Rider KYC** | **Smile ID** | Document verification + liveness + AML/PEP | Per business rules |
| **Address lookup** | GhanaPostGPS | (for optional digital address field) | Per addressing system |
| **Push notifications** | Firebase | FCM (Android), APNs (iOS) | Standard |

**⚠️ Critical constraint:** Paystack's Subaccount / Transaction Split features are **NOT used**. We use only Charge + Transfer. Our internal ledger orchestrates everything.

### 16.2 Paystack Bank Codes for Ghana

See Section 8.1 — the values **differ between Charge and Transfer Recipient APIs**:

- `POST /charge` uses `mobile_money.provider` with **lowercase**: `mtn`, `vod`, `atl`
- `POST /transferrecipient` uses `bank_code` with **uppercase**: `MTN`, `VOD`, `ATL`
- For Ghana bank transfers (ghipss), fetch dynamically: `GET /bank?currency=GHS&type=ghipss`

Both must be defined in a single constants module with a translation function — never hard-code the same string for both APIs.

### 16.3 System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                            │
│  Customer App (React Native)  | Customer Web (NextJS)         │
│  Vendor App (React Native)    | Vendor Web (NextJS)           │
│  Rider App (React Native)     | Admin Web (NextJS)            │
└─────────────────────┬────────────────────────────────────────┘
                      │ HTTPS / WSS
                      ▼
┌──────────────────────────────────────────────────────────────┐
│              CDN + EDGE (Cloudflare)                          │
└─────────────────────┬────────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────────┐
│           API GATEWAY (NestJS)                                │
│  JWT, rate limiting, RBAC, CORS, circuit breaker              │
└─────────────────────┬────────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                  4 BFFs (NestJS)                               │
│  Customer BFF | Vendor BFF | Rider BFF | Admin BFF            │
└─────────────────────┬────────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────────┐
│           EVENT BUS (RabbitMQ via Debezium CDC)              │
└─────────────────────┬────────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────────┐
│              MICROSERVICES (13, all NestJS)                    │
│  Auth | User | Catalogue | Order | Dispatch | Tracking        │
│  Payment | Notification | Chat | Media | Search               │
│  Pricing | Admin                                             │
└─────────────────────┬────────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────────┐
│         SHARED INFRASTRUCTURE                                 │
│  PostgreSQL (per-service DB) | Redis (cache, geo, queue)     │
│  TimescaleDB (tracking history) | S3/DO Spaces (media)         │
│  Debezium CDC | Paystack + Hubtel + Google + Smile ID          │
└──────────────────────────────────────────────────────────────┘
```

### 16.4 Microservices (13) — Updated Responsibilities

| # | Service | DB | Purpose | Key Events |
|---|---|---|---|---|
| 1 | Auth Service | auth_db (PG) | OTP (via Hubtel), Google, Apple, JWT, 2FA, device lock | user.logged_in, user.device_changed |
| 2 | User Service | user_db (PG) | Profiles, addresses, **Smile ID KYC**, devices, ratings, two vendor types | user.created, user.kyc_approved, rating.created |
| 3 | Catalogue Service | catalogue_db (PG) | Stores (Business + Individual), items, addons, variants, hours | item.created, item.availability_changed |
| 4 | Order Service | order_db (PG) | Cart, order state machine, scheduled orders, group cart, **disputes** | order.* (every state) |
| 5 | Dispatch Service | dispatch_db (PG) | **10-min vendor grouping, 5-min countdown trigger**, competitive acceptance, batching, reassignment | dispatch.broadcast, dispatch.batched |
| 6 | Tracking Service | Redis + TimescaleDB | Live GPS, geo-fence, ETA, rider_location_updated | tracking.eta_updated |
| 7 | Payment Service | payment_db (PG) | **Paystack Charge + Transfer (two APIs only)**, ledger, wallets, COD reconciliation, refunds | payment.*, refund.*, cod.* |
| 8 | Notification Service | notification_db (PG) | **Hubtel SMS**, push, in-app, email | notification.sent |
| 9 | Chat Service | chat_db (PG + Redis) | WebSocket chat, images, voice | chat.message_sent |
| 10 | Media Service | media_db (PG) + S3 | Image upload, compression, **receipt photos for errands** | media.uploaded |
| 11 | Search Service | (read replica) | Vendor/item search, autocomplete, ranking | — |
| 12 | Pricing Service | pricing_db (PG) | Delivery fee (GHS 5/8/12/18 tiers), service fee, commission, promos, **Cape Coast launch rates** | pricing.commission_calculated |
| 13 | Admin Service | (uses others) | Back-office, reports, KYC review, dispute arbitration, surge control | — |

### 16.5 Saga + Outbox + Debezium CDC

Every state change writes business data + outbox event in the **same DB transaction**. Debezium tails the PostgreSQL WAL and publishes to RabbitMQ. Consumers are idempotent (event_id dedup in Redis, 24h TTL).

```typescript
await db.transaction(async (tx) => {
  await tx.orders.update({ status: 'vendor_accepted' });
  await tx.outbox_events.insert({ event_type: 'order.vendor_accepted', ... });
});
// Debezium CDC publishes async
```

### 16.6 Double-Entry Ledger Implementation

Every Paystack Charge/Transfer event triggers a corresponding ledger entry. The ledger is the source of truth. Paystack webhooks update the ledger via outbox + CDC (eventually consistent, with idempotency keys).

**Reconciliation:** Daily. Paystack balance vs BESONC ledger. Any variance → investigation.

### 16.7 Service Mesh & Observability (Phase 2)
- **Linkerd** (lighter than Istio) for mTLS, retries, circuit breaking
- **Loki + Prometheus + Grafana + Jaeger + Sentry** for logs, metrics, traces, errors
- Feature flags via **Unleash**

### 16.8 Ghana-Specific Tech Concerns
- **Network reliability:** Offline-first rider app (caches orders, syncs on reconnect)
- **Power outages (dumsor):** Stateless services, quick restart, rider app <3s launch
- **Battery life:** Rider app reports battery; deprioritize at <20%, auto-offline at <10%
- **MoMo reliability:** 5-min prompt timeout, retry once with backoff, multi-network failover
- **Bandwidth:** App < 30MB Android, WebP images, paginated catalogues
- **Multilingual:** v1 English, Phase 2 Twi, Ga, Ewe, Hausa, Dagbani

---

## Section 17: Sprint Plan & Next Steps

### 17.1 Sprints 1-2: Foundation
- API Gateway (auth, rate limiting, routing, circuit breaker)
- Auth Service (Hubtel SMS OTP, Google, Apple, JWT, 2FA, **device lock**)
- User Service (profiles, addresses, **Smile ID KYC**, devices, two vendor types)
- All 4 BFF skeletons
- Database setup (per-service DBs)
- RabbitMQ + Debezium CDC
- Redis + TimescaleDB
- **Observability stack (Loki, Prometheus, Grafana, Jaeger, Sentry)**
- **Feature flag service (Unleash)**
- **Shared React Native packages** (api client, models, auth, ui components, state management, offline sync, analytics)
- CI/CD pipelines

### 17.2 Sprints 3-4: Core Commerce
- Catalogue Service (Business + Individual vendors, items, addons, variants, hours, **prep time**)
- **Pricing Service** (Cape Coast launch rates: GHS 4 base, GHS 2/km customer, GHS 4 + GHS 1/km + GHS 2.50/km rider)
- Order Service (cart, order creation, state machine A, **disputes**)
- **Payment Service** (Paystack Charge + Transfer, ledger, wallets, COD reconciliation, refunds)
- Media Service (image upload, compression, **receipt photos**)
- **Smile ID KYC integration** (vendor + rider)

### 17.3 Sprints 5-6: Delivery Engine
- Dispatch Service (**5-min countdown trigger, 10-min vendor grouping, competitive acceptance, batching, multi-vendor, multi-customer, route optimization**)
- Tracking Service (GPS, geo-fence, ETA, TimescaleDB, offline mode for rider app)
- Notification Service (FCM, APNs, **Hubtel SMS**)
- COD flow (obligation, remittance, **tiered wallet limits GHS 1,000/3,000/5,000**, **90% remittance trigger**, 24/48/72h escalation)

### 17.4 Sprints 7-8: Communication, Trust, Growth
- Chat Service (WebSocket, image, voice)
- Search Service (PostgreSQL full-text, autocomplete, ranking)
- **Two-way Ratings & Reviews** (customer↔vendor, customer↔rider, vendor↔rider) + **dispute flow**
- **Tips engine** (GHS 2/5/10/custom, 100% to rider, immediate credit)
- **Promotions UI** (customer + vendor)
- **In-app support hub** + auto-compensation rules
- **Vendor analytics** (7-day, top items, peak hours heatmap)
- **Referral system** (customer GHS 10/10, rider milestone GHS 100/200, vendor GHS 200 at 20 orders)

### 17.5 Sprints 9-10: Polish, Edge Cases, Soft Launch
- Surge pricing UI (transparency)
- Scheduled orders
- Group cart (single-vendor)
- Insurance option (parcels)
- Geofence auto-state transitions
- Refund flow with Paystack Transfer
- KYC admin review UI
- Dispute admin UI
- Vendor analytics (advanced)
- Performance dashboards
- **Soft launch in Cape Coast** (2 zones: Cantonments + Kotokuraba)

### 17.6 Sprints 11-12: Hardening, Public Launch
- Load testing (10,000 concurrent orders)
- Security audit
- Ghana-specific edge cases (MoMo timeout, offline, power loss, network drops)
- Disaster recovery drill
- **Public launch in Cape Coast**

### 17.7 Post-Launch Sprints
- Multi-vendor group cart with split payment
- Vendor premium subscription activation
- ML/AI features
- Additional cities: Accra, Kumasi, Takoradi

### 17.8 Success Metrics (KPIs)

**North Star:** Weekly Active Customers (WAC) — customers with at least 1 completed order in 7 days

| Metric | Target (Month 6) | Target (Month 12) |
|---|---|---|
| WAC | 5,000 | 25,000 |
| Orders/day | 500 | 5,000 |
| Average Order Value | GHS 60 | GHS 70 |
| Order completion rate | > 90% | > 93% |
| Avg delivery time | < 35 min | < 30 min |
| Rider acceptance rate | > 70% | > 75% |
| Customer rating (avg) | > 4.5 | > 4.6 |
| Cancellation rate (customer) | < 8% | < 5% |
| Cancellation rate (vendor) | < 5% | < 3% |
| COD remittance compliance | > 95% | > 98% |
| GMV (monthly) | GHS 1M | GHS 8M |
| Net revenue (monthly) | GHS 180K | GHS 1.6M |
| CAC | < GHS 15 | < GHS 10 |
| LTV | > GHS 200 | > GHS 400 |
| LTV/CAC | > 10× | > 40× |
| Customer NPS | > 50 | > 50 |
| App crash rate | < 0.1% | < 0.1% |
| Payment success rate (Paystack) | > 95% | > 95% |
| Rider dispatch time | < 90s (median) | < 60s (median) |
| ETA accuracy | ± 5 min for 80% | ± 5 min for 85% |

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **BFF** | Backend-for-Frontend — service layer that aggregates microservices for a specific client type |
| **CDC** | Change Data Capture — reads DB transaction logs to publish events |
| **COD** | Cash on Delivery |
| **EPT** | Estimated Preparation Time (vendor-set) |
| **KYC** | Know Your Customer — identity verification |
| **MoMo** | Mobile Money (MTN, Telecel, AirtelTigo) |
| **LTV** | Customer Lifetime Value |
| **NPS** | Net Promoter Score |
| **Saga** | Distributed transaction pattern with compensating actions |
| **WAC** | Weekly Active Customers |
| **WAL** | Write-Ahead Log — PostgreSQL's transaction log |
| **Hubtel** | Ghana SMS provider (NOT Arkesel, NOT WhatsApp) |
| **Paystack** | Only payment provider — Charge + Transfer APIs only (no Subaccounts/Splits) |
| **Google Cloud** | Maps and location provider |
| **Smile ID** | KYC provider for vendors and riders |
| **BESONC** | Our platform (NOT Droplu) |

---

## Appendix B: References & Inspiration

- BESONC v1.0 plan (besonc.pdf) — original 8-service three-sided marketplace architecture
- BESONC Business Rules (development_plan.md) — full Ghana-specific business rules, SLAs, COD, vendor/rider policies
- Glovo (Delivery Hero) — multi-vertical state machines
- Uber Eats engineering — global matching algorithm, ETA prediction
- DoorDash — order batching, marketplace design
- Deliveroo — restaurant onboarding, dispatch
- Swiggy — Instamart, multi-vendor cart
- Talabat/Delivery Hero — dark store model
- Paystack Docs — Charge + Transfer APIs (Ghana)
- Hubtel — Ghana SMS platform
- Smile ID — Ghana KYC
- Google Maps Platform — Maps, Places, Routes API (Compute Route Matrix), Geocoding (Distance Matrix API is legacy since March 2025; we use Routes API)
- Saga pattern (Garcia-Molina & Salem, 1987; Chris Richardson microservices.io)
- Outbox pattern + Debezium CDC
- BFF pattern (Sam Newman)
- Ghana Data Protection Act, 2012 (Act 843)
- Ghana Pharmacy Council, FDA, Bank of Ghana

---

## Closing

BESONC v3.0 is the canonical, complete plan that aligns the v2.0 architecture with the full BESONC business rules. It uses **Paystack (Charge + Transfer only) as the single payment provider, with BESONC's internal ledger as the orchestrator; Hubtel for SMS; Google Cloud for maps; Smile ID for KYC.** It is built for Cape Coast, Ghana, and designed to scale to Accra, Kumasi, Takoradi, and Tema.

Build this, and you have a defensible, compliant, and operationally rigorous multi-delivery platform for Ghana.

---

*Document version: 3.1*
*Last updated: July 31, 2026*
*Prepared for the BESONC founding team*

---

## Changelog

### v3.1 (current) — Critical corrections from internal review

**Stack corrections:**
- Mobile apps: **React Native** (was: Flutter)
- Backend: NestJS for all 13 microservices (confirmed)

**Critical fixes:**
- **Section 8.1 / 16.2:** Paystack `mobile_money.provider` uses **lowercase** (`mtn`/`vod`/`atl`) for `POST /charge`; `bank_code` uses **uppercase** (`MTN`/`VOD`/`ATL`) for `POST /transferrecipient`. The plan previously listed uppercase for both. Added code constants and a translation function in the Payment Service.
- **Section 9.3 / 9.4:** Settlement is now correctly **T+1 from delivery** (not "instant"). Paystack Ghana is T+1 for collections and per-transfer for payouts. Added a **buffered float** model (pre-funded balance at Paystack to decouple payout from T+1 collection), **daily 10:00 GMT batch payout** via `POST /transfer/bulk` (up to 100 transfers/batch), and **on-demand withdrawal limits** (GHS 200/day for senior riders, GHS 0 for new/experienced). Explicitly documented GHS 1/MoMo and GHS 8/bank per-transfer fees.
- **Section 6 / 16.1:** Removed the "24h route cache in Redis" pattern (violates Google Maps Platform ToS Section 1.4(e)). Migrated from legacy **Distance Matrix API** to current **Routes API** (`Compute Route Matrix`). Added **Haversine pre-filter** pattern (send only top 10-15 nearest riders to Routes API) to cut API cost 80-90% while staying ToS-compliant. Place ID caching is the only allowed caching.
- **Section 8.3:** Ledger simplified for v1. Was: full double-entry ledger with platform accounts, per-user accounts, external accounts (3-6 months build). Now: **single `user_balances` table + immutable `balance_ledger_entries` audit log** (2-3 weeks build), with double-entry enforced by **daily reconciliation job** (not at write time). The v2 full double-entry is documented as the post-launch target and is **forward-compatible** with v1.

### v3.0
- Aligned v2.0 architecture with the full BESONC business rules
- 8 services only, locked (no phased or later-phase services)
- Paystack (Charge + Transfer only) as single payment provider
- Hubtel for SMS
- Google Cloud for maps
- Smile ID for KYC
- Besonc internal ledger as orchestrator

### v2.0
- Competitive teardown fixes (Glovo, Uber Eats, DoorDash)
- BFF pattern, saga/outbox/Debezium CDC
- Two-way ratings, tips, batching, surge, promos
- In-app support, vendor analytics, Smile ID KYC
- Dark stores strategy

### v1.0
- Original 8-service three-sided marketplace architecture
- 38 pages
