# BESONC Build Plan (post-2026-07-31)

This is the **build order** I'll follow. Each phase ends with a
**smoke test** in the sandbox (real Postgres + Redis, no API keys,
all integrations mocked). You can pull `main` at any milestone
boundary and run `pnpm run dev` on your PC.

## Stack decisions

| Concern | Choice | Why |
|---|---|---|
| ORM | **Prisma** | Best DX for service-by-service dev. Schema documents itself. Migrations mature. |
| DB | **PostgreSQL 17** | Already running in sandbox. Same engine for local + prod. |
| Cache/queue | **Redis 8 + ioredis** | Direct usage, no abstraction. Standard for NestJS. |
| Background jobs | **BullMQ** (Redis-backed) | Standard NestJS choice. Used for webhooks, settlement, notifications. |
| Validation | **Zod** at the edges + class-validator inside Nest | We already have class-validator; Zod only where we need to share schemas with mobile/web. |
| Logging | **pino** + **nestjs-pino** | 5x faster than NestJS default logger. JSON in prod, pretty in dev. |
| Tracing | **OpenTelemetry** (mock exporter in dev) | Drop-in when you add a real backend (Jaeger/Honeycomb). |
| Testing | **Jest** (already in nx) + **supertest** for HTTP | Standard. |
| Mocking external APIs | Each external service has a `*-mock.ts` adapter selected by `NODE_ENV=development` | Real adapter (Paystack, Hubtel, etc.) is a separate file the user provides their keys for. |

## Services to build (in order)

### Phase 1 — DB layer (next 2-3 commits)
1. **`libs/shared-db`** — Prisma client generator, migration runner, transaction helper
2. **First migration** — shared `enums` (service codes, order states, payment statuses, etc.) + audit columns pattern
3. **Docker Compose** for local dev (`docker-compose.yml` at repo root: postgres, redis, mailhog)

### Phase 2 — Port Sprint 3-4 services to real DB (5 services)
Already scaffolded, just swap the in-memory `Map`s for Prisma queries.
| # | Service | Tables to add | Notes |
|---|---|---|---|
| 4 | catalogue | `vendors`, `items`, `categories` | Most queries. ~200 seed rows. |
| 5 | pricing | (no new tables) | Pure compute, but needs `pricing_rules` table for tunable rates |
| 6 | order | `orders`, `order_items`, `order_state_transitions` | Audit trail via state_transitions |
| 7 | payment | `payment_intents`, `balance_ledger_entries`, `user_balances` | Path A ledger per v3.1 |
| 8 | media | `media_assets`, `upload_sessions` | R2 in prod, local FS in dev |

### Phase 3 — Sprint 5-6 services (new)
| # | Service | Purpose | Sprint |
|---|---|---|---|
| 9 | dispatch | Assigns riders to orders. Auto-dispatch with manual override. | 5-6 |
| 10 | tracking | Real-time rider GPS → customer map. WebSocket gateway. | 5-6 |
| 11 | notification | SMS (Hubtel mock), push (FCM mock), email (Mailhog). Unified inbox. | 5-6 |
| 12 | payment-cod | Cash-on-delivery reconciliation. Daily cash collection workflow. | 5-6 |

### Phase 4 — Sprint 7-8 services (new)
| # | Service | Purpose | Sprint |
|---|---|---|---|
| 13 | chat | Customer ↔ rider ↔ vendor in-app chat. WebSocket. | 7-8 |
| 14 | search | Full-text search across vendors, items, categories. Postgres `tsvector`. | 7-8 |
| 15 | rating | Two-way ratings (customer↔vendor↔rider) + review aggregation | 7-8 |
| 16 | tip | Tip flow post-delivery. Updates ledger. | 7-8 |
| 17 | promo | Promo codes, referral credits, vendor-funded discounts | 7-8 |

### Phase 5 — Vendor + Rider BFFs + new apps
| # | App | Type | Notes |
|---|---|---|---|
| 18 | vendor-bff | NestJS | Orchestrates vendor flows |
| 19 | rider-bff | NestJS | Orchestrates rider flows |
| 20 | admin-bff | NestJS | Orchestrates back-office |
| 21 | vendor-web | NextJS | Vendor dashboard: menu, orders, earnings |
| 22 | rider-web | NextJS | Rider dashboard: jobs, earnings, schedule (in v2) |
| 23 | admin-web | NextJS | Back-office: KYC, disputes, reconciliation |
| 24 | vendor-mobile | React Native + Expo | Vendor phone app: accept orders, toggle open/closed |
| 25 | rider-mobile | React Native + Expo | Rider phone app: accept jobs, navigate, mark delivered |

### Phase 6 — Polish (Sprint 9-10)
- Customer-mobile: push notifs, location, in-app payments
- Error tracking adapter (Sentry mock in dev, real Sentry in prod)
- Analytics adapter (PostHog mock in dev, real PostHog in prod)
- Observability: request IDs, structured logs, basic OpenTelemetry
- CI: GitHub Actions runs all tests + builds on PR
- Seed scripts for full demo dataset (5 vendors × 18 items, 50 riders, 200 customers)

### Phase 7 — Launch prep (Sprint 11-12)
- Load test script (k6) for 1k concurrent orders
- Security audit checklist + fixes
- Soft launch runbook (Cape Coast, 10 vendors, 5 riders, 50 customers)
- DR/backup runbook
- Data export/import scripts

## What I will NOT do
- Cloud deploys (no Vercel, no Fly, no EAS Build, no managed k8s)
- Production secrets management (you handle `.env` on your PC)
- Domain/SSL/DNS (local-only)
- iOS App Store / Google Play submission (out of scope for "build the entire system locally")
- Real money in real Paystack (you'll switch to your real keys after downloading)

## What I WILL ask you before doing
- Anything that requires a real external account (e.g. "do you want me to wire Apple Pay?")
- Anything that affects the data model significantly (e.g. "should customer support multi-address?")
- Anything that's a one-way door (e.g. "should I add a CMS for vendor menu items, or hard-code?")

## How to follow along

```bash
# In your terminal on your PC
cd besonc
git pull origin main

# Phase 1+: docker-compose brings up postgres + redis
docker-compose up -d

# Backend in dev mode (real DB, mocked external APIs)
pnpm run dev

# Or just one service
pnpm exec nx serve catalogue-service
```

The sandbox will have these services smoke-tested at every commit.
Your PC will be the real test environment.
