# BESONC

> Multi-Vendor Delivery & Logistics App for Cape Coast, Ghana.

This is the **BESONC** monorepo. It contains the complete platform for a delivery
and errand-runner business serving Cape Coast and (later) other Ghanaian cities.

**Stack:**
- **Backend:** NestJS microservices (16 services)
- **Mobile apps:** React Native (Customer, Vendor, Rider) — built with Expo + EAS
- **Web apps:** NextJS (Customer, Vendor, Admin)
- **Database:** Neon Postgres (free 0.5 GB, scales to zero)
- **Cache/Queue:** Upstash Redis (free 10K commands/day)
- **Storage:** Cloudflare R2 (free 10 GB/month, no egress fees)
- **Payments:** Paystack (Charge + Transfer APIs, internal ledger orchestrator)
- **SMS:** Hubtel (per business rules — no WhatsApp, no Arkesel)
- **Maps:** Google Cloud Routes API (no route caching — ToS compliant)
- **KYC:** Smile ID (Ghana Card + liveness + AML/PEP)
- **Errors:** Sentry (free 5K events/month)
- **Analytics:** PostHog (free 1M events/month)
- **CI/CD:** GitHub Actions

**Cost:** $0/month during development, ~$80/month at staging, ~$300/month at soft launch.

---

## Repository layout

```
besonc/
├── apps/
│   ├── api-gateway/        # NestJS — routes /api/v1/* to downstream services
│   ├── auth-service/       # NestJS — phone OTP via Hubtel, JWT issuance
│   ├── user-service/       # NestJS — profiles, addresses, Smile ID KYC
│   ├── customer-bff/       # NestJS — Backend-for-Frontend for Customer app
│   └── customer-web/       # NextJS — Customer web app (Vercel)
│   # (Coming in future sprints: vendor-service, rider-service,
│   #  catalogue-service, order-service, dispatch-service, tracking-service,
│   #  payment-service, notification-service, chat-service, media-service,
│   #  search-service, pricing-service, admin-service,
│   #  vendor-bff, rider-bff, admin-bff,
│   #  vendor-web, admin-web, customer-mobile, vendor-mobile, rider-mobile)
├── libs/
│   ├── shared-types/       # IDs (YDC/YDR/YDV/YDO), state machines, money helpers
│   ├── shared-utils/       # formatting, validation, env helpers
│   ├── shared-config/      # service endpoints + feature flags
│   ├── shared-payment/     # Paystack Charge + Transfer wrapper
│   ├── shared-notifications/ # Hubtel SMS wrapper + templates
│   ├── shared-kyc/         # Smile ID Ghana Card verification + liveness + AML
│   └── shared-api-client/  # typed HTTP client for the BFFs
├── .env.example
├── nx.json
├── package.json
├── tsconfig.base.json
└── README.md
```

---

## Quick start (development)

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template
cp .env.example .env
# Edit .env to add your Paystack test key (get one at https://paystack.com)

# 3. Run all the Sprint 1-2 services in parallel (5 terminals or use --parallel)
pnpm exec nx serve api-gateway      # http://localhost:3000
pnpm exec nx serve auth-service     # http://localhost:3001
pnpm exec nx serve user-service     # http://localhost:3002
pnpm exec nx serve customer-bff     # http://localhost:4000
pnpm exec nx serve customer-web     # http://localhost:4200

# 4. Open the customer web app
open http://localhost:4200
```

In **dev mode** the OTP is shown in the UI (yellow box) so you can test without a real phone number.

---

## Available Nx commands

```bash
# Run all builds
pnpm exec nx run-many -t build

# Run a specific target
pnpm exec nx build <project>
pnpm exec nx serve <project>
pnpm exec nx test <project>
pnpm exec nx lint <project>

# View the project graph
pnpm exec nx graph
```

---

## The 8 BESONC services (locked, no others)

| Code | Service | Engine | Vendor | State machine |
|------|---------|--------|--------|---------------|
| FO   | Food | Catalogue | Yes | A |
| GR   | Groceries | Catalogue | Yes | A |
| SH   | Shop | Catalogue | Yes | A (prepaid only) |
| MK   | Market | Catalogue (hybrid) | Optional | A |
| PH   | Pharmacy & Health | Catalogue | Yes (verified) | B |
| LD   | Laundry | Catalogue | Yes | C (two trips) |
| PR   | Parcel & Courier | Request | No | D |
| ER   | Errands & Personal Assistant | Request | No | E |

See `besonc-v3-plan.md` for the full plan (kept at the repo root for now).

---

## Architecture decisions (locked)

1. **Paystack is the only payment provider.** We use only `POST /charge` and `POST /transfer`. No Subaccounts, no Transaction Splits. Our internal `user_balances` + `balance_ledger_entries` tables are the source of truth.
2. **Hubtel is the only SMS provider.** No Arkesel, no WhatsApp.
3. **Google Cloud is the only maps provider.** We use the Routes API (Compute Route Matrix), not the legacy Distance Matrix. **No route caching** (violates Google ToS).
4. **Smile ID is the KYC provider** for both vendors and riders (Ghana Card + liveness + AML/PEP).
5. **Settlement is T+1, not instant.** Paystack Ghana is T+1. We use a buffered float + daily 10:00 GMT batch payout.
6. **Backend is NestJS, mobile is React Native.** No Flutter.
7. **The 8 services are final.** No phased services, no other categories.

---

## Sprint status

| Sprint | Goal | Status |
|--------|------|--------|
| 1-2 (current) | API Gateway + Auth + User + Customer BFF + Customer Web | ✅ Scaffolded, building |
| 3-4 | Catalogue + Pricing + Order + Payment + Media | Not started |
| 5-6 | Dispatch + Tracking + Notification + COD | Not started |
| 7-8 | Chat + Search + Two-way ratings + Tips + Promos | Not started |
| 9-10 | Polish, edge cases, soft launch in Cape Coast | Not started |
| 11-12 | Load test, security audit, public launch | Not started |

---

## License

UNLICENSED — proprietary, all rights reserved.
