# BESONC — Complete Tech Stack (with all services) v1.0

> Purpose: Consolidated list of every external service we'll use, with free-tier status, the role it plays, and the alternative if the free tier breaks.
> Cost target: $0/month for dev, $80-150/month for staging, $200-400/month for soft launch.

---

## Table of Contents

1. Decision Criteria
2. Core Services (already locked)
3. Free-Tier Services we're adding
4. Paid services (after staging)
5. Services we explicitly are NOT using
6. When to upgrade from free to paid

---

## Decision Criteria

For every service in BESONC, the question is the same:

1. Free tier without credit card? (priority for development)
2. No trial expiry or 30-day cliff? (no service that deletes data after 30 days)
3. Works in Ghana? (MoMo, GhanaPostGPS, Google Maps all tested for Ghana)
4. Has a real production path? (we can pay later, not rebuild)
5. Open standards? (avoid lock-in: prefer S3-compatible, OpenTelemetry, Sentry SDK protocol)

If a service fails #1, we look for an alternative. If #1-#3 all fail, we self-host.

---

## Core Services (already locked)

| Service | Role | Free? | Cost at scale | Notes |
|---|---|---|---|---|
| Paystack | Customer payment + vendor/rider payout | Yes (per-transaction 1.95% + GHS 1/transfer) | Pay-as-you-grow | Charge + Transfer APIs only. No Subaccounts. |
| Hubtel | SMS OTP + notifications | Yes (GHS 0.033/SMS, GHS 50 setup, 10K free/month) | Pay-as-you-grow | Per business rules. Not Arkesel, not WhatsApp. |
| Google Cloud | Maps + location + Places API | Yes ($200 credit, but pricing changed March 2025 — 10K events/SKU free) | $5/1K Distance Matrix elements | Migrating to Routes API. No route caching (ToS). |
| Smile ID | KYC (vendor + rider) | Yes ($0.10-1.00/check, free sandbox) | Pay-as-you-grow | Ghana Card + liveness + AML/PEP. |
| GhanaPostGPS | Optional digital address field | Yes (free) | Free | National addressing system, no API key needed for basic lookup. |

---

## Free-Tier Services we're adding

### Compute & Hosting

| Service | Role | Free tier | When we pay |
|---|---|---|---|
| Vercel | Customer/Vendor/Admin web (NextJS) | Hobby: 100GB bandwidth, 1M function calls, 60s timeout | Pro $20/seat/mo when commercial |
| Render | NestJS microservices (16 services) | Free: 750 instance hours/mo shared, spin-down after 15 min | Basic-256mb $6/service/mo for staging |
| Neon | Serverless Postgres (main DB) | Free: 0.5 GB, 190 compute hours/mo, no expiry | Pro $19/mo when we need >0.5GB or always-on |
| Upstash | Serverless Redis (cache + BullMQ queues) | Free: 10K commands/day, 256 MB | Pay-as-you-go when we exceed |
| Cloudflare R2 | Object storage (receipt photos, vendor logos, ID scans) | Free: 10 GB/month, 1M Class A ops, no egress fees | Pay-as-you-go when we exceed |

### Mobile App Build & Distribution

| Service | Role | Free tier | When we pay |
|---|---|---|---|
| Expo + EAS Build | Cloud iOS + Android builds (no Mac needed for iOS) | Free: 15 Android + 15 iOS builds/month, 1 GB storage | Production $99/mo for 1,500 builds + priority queue |
| EAS Update | OTA JS updates (no app store review) | Free: 1,000 MAU, 100 GiB bandwidth | Production $199/mo for 50,000 MAU |
| EAS Submit | Auto-submit to App Store + Play Store | Free: 1 submission | $99/year Apple Developer + $25 one-time Google Play |
| Appetize.io | iOS Simulator in browser (for you to test without phone) | Free: 1 min/session | $40/mo for longer sessions |

### Observability & Error Tracking

| Service | Role | Free tier | When we pay |
|---|---|---|---|
| Sentry | Error tracking (backend + frontend) | Free: 5,000 errors/mo, 30-day retention, 50 MB attachments | Team $26/mo for 50K errors + 90-day retention |
| Better Stack (Logs) | Log aggregation + alerting | Free: 100K errors/mo + 3 GB logs | $29/mo for 30-day log retention |
| UptimeRobot | Uptime monitoring (ping BESONC services every 5 min) | Free: 50 monitors, 5-min interval | $7/mo for 1-min interval |
| Grafana Cloud | Metrics dashboards (Prometheus + Loki) | Free: 10K metrics + 50 GB logs + 50 GB traces | Pro $8/mo active series |

### Email

| Service | Role | Free tier | When we pay |
|---|---|---|---|
| Resend | Transactional email (receipts, password resets, refund notifications) | Free: 3,000 emails/mo, 100/day, no credit card | Pro $20/mo for 50K emails + custom domain |

### Push Notifications (separate from SMS)

| Service | Role | Free tier | When we pay |
|---|---|---|---|
| Firebase Cloud Messaging (FCM) | Push notifications to mobile apps (iOS + Android) | Yes Unlimited, no per-message fee, no card | Free forever (Google absorbs the cost) |

### Feature Flags & Experimentation

| Service | Role | Free tier | When we pay |
|---|---|---|---|
| PostHog | Feature flags + product analytics + session replay (all-in-one) | Free: 1M events/mo, 1M feature flag requests, 5K session recordings/mo | Usage-based when we exceed |

### Search

Decision: We do NOT need Elasticsearch for v1. Reasoning:
- Cape Coast has <100 vendors at soft launch
- Search by name/category works fine with Postgres ILIKE + GIN index
- BESONC's Search Service per the plan is just a thin wrapper over Postgres full-text search
- Save the Elasticsearch cost and complexity for post-launch

Free alternative if needed later: Bonsai.io Elasticsearch (free tier, no card) — only if catalog exceeds 10K items and Postgres search becomes slow.

### Background Jobs / Queues

Decision: Use BullMQ (Redis-backed) for all background jobs. It's already part of our NestJS stack. No separate service needed.

- Order state machine transitions
- COD remittance reminders
- Daily batch payout
- Customer support ticket escalation
- Email/push notification dispatch
- Refund processing

Redis is already paid for (Upstash free tier).

### Real-time / WebSockets

Decision: Built into the Chat Service, no separate service needed.
- NestJS + Socket.IO handles in-app chat between customer/rider/vendor/support
- For production scale, this becomes a separate service we can extract. For v1, single service.

### CI/CD

| Service | Role | Free tier | When we pay |
|---|---|---|---|
| GitHub Actions | Run tests + deploy on every push/PR | Free: 2,000 min/month for private repos | $4/mo for 3,000 min on Team plan |

---

## Paid services (after staging)

These are NOT free. We pay for them only when the free tier breaks, typically at the soft launch stage (Sprint 11+).

| Service | Trigger to pay | Estimated cost |
|---|---|---|
| Render Basic-256mb x 6 services | Sprint 5+ when we need always-on | $36/month |
| Neon Pro | When 0.5GB is exceeded OR always-on compute needed | $19/month |
| Sentry Team | When we hit 5K errors/mo | $26/month |
| Resend Pro | When we send >3K emails/mo | $20/month |
| Vercel Pro | When commercial use starts | $20/seat/month |
| EAS Production | When we exceed 1,000 MAU | $99/month |

Total at soft launch: $200-300/month. This is the right time to add a credit card to the team.

---

## Services we explicitly are NOT using

These are commonly recommended but I'm saying no, with reason:

| Service | Why not |
|---|---|
| Algolia | Vendor lock-in, expensive ($0.50/1K records), overkill for 100 vendors. Postgres full-text is enough. |
| Meilisearch / Typesense | Nice, but we'd have to host them. Postgres is enough for v1. Add in v2 if needed. |
| Datadog | $31/host/month = unaffordable. Better Stack + Sentry + Grafana covers 80% of what Datadog does. |
| New Relic | Same reason as Datadog. |
| Sentry.io self-hosted | 40+ containers, complex ops. Sentry Cloud free is fine until we hit 5K errors. |
| Twilio SMS | More expensive than Hubtel for Ghana, no Ghana-native. |
| AWS S3 | More expensive than Cloudflare R2 for our scale, no free egress. |
| AWS SES | Email, more complex than Resend. Save complexity. |
| Auth0 / Clerk / Firebase Auth | Adds a vendor. We use our own NestJS Auth service with Hubtel OTP. |
| Stripe | Doesn't support Ghana MoMo natively. Paystack does. |
| Mux / Cloudflare Stream | No video in BESONC. |
| Intercom / Zendesk | Too expensive for Cape Coast launch. We build in-app support into the Chat Service. |
| Mixpanel / Amplitude | PostHog covers this and is free. |
| Segment | Adds a vendor. We send events directly from each service. |
| LaunchDarkly | $100/seat/month. PostHog feature flags are free. |
| GitHub Copilot / Cursor | I am your AI pair programmer. |
| Elasticsearch / OpenSearch | Postgres full-text is enough for Cape Coast scale. Add in v2 if needed. |
| Kafka / RabbitMQ | We use BullMQ on Redis. RabbitMQ for async events between services. |
| Prometheus + Grafana self-hosted | Use Grafana Cloud free instead. Same dashboards, no ops. |

---

## When to upgrade from free to paid

Decision tree for each service:

| Signal | Action |
|---|---|
| Database > 70% of free tier storage | Upgrade to next tier |
| Error rate spike (1,000+ errors in a day) | Investigate, if legitimate: upgrade Sentry |
| SMS delivery latency > 30 sec consistently | Upgrade Hubtel plan or check MoMo network |
| Microservice cold starts cause customer complaints | Upgrade Render service from free to Basic |
| Email bounce rate > 5% | Investigate domain auth (SPF, DKIM, DMARC) |
| Free tier expires / 30-day cliff | Migrate to paid tier before expiry |

Golden rule: Free tier is for development. The first $50-80/month is for staging. We pay as soon as a real customer is on the platform, not before.

---

## What we use, by category

### Money
- Paystack — customer payments, vendor/rider payouts
- Stripe — NOT used

### Communication
- Hubtel — SMS OTP and notifications
- Firebase Cloud Messaging — push notifications
- Resend — transactional email
- WhatsApp Business API — NOT used (per business rules)

### Maps & Location
- Google Cloud Routes API — distance + ETA
- Google Places API — address autocomplete
- GhanaPostGPS — Ghana digital addresses

### Storage
- Neon — Postgres (main DB)
- Upstash — Redis (cache + queues)
- Cloudflare R2 — object storage (photos, receipts, ID scans)

### Identity
- Smile ID — vendor + rider KYC (Ghana Card + liveness + AML)
- Hubtel — phone OTP for customer login

### Hosting
- Vercel — 3 web apps (Customer/Vendor/Admin)
- Render — 16 NestJS microservices + API Gateway
- Neon — Postgres
- Upstash — Redis
- Cloudflare — CDN + R2 (object storage)

### Mobile
- Expo + EAS — React Native cloud builds + OTA updates + internal distribution
- Appetize.io — iOS simulator in browser (testing)

### Observability
- Sentry — error tracking
- Better Stack — log aggregation + alerting
- UptimeRobot — uptime monitoring
- Grafana Cloud — metrics + dashboards (Prometheus + Loki)

### Analytics & Experimentation
- PostHog — feature flags + product analytics + session replay (all-in-one)
- Google Analytics — NOT used (PostHog is enough)

### CI/CD
- GitHub Actions — automated tests + deploys on every push

### Code
- GitHub — private repo (free)
- Nx — monorepo tool (open source, free)
- pnpm — package manager (open source, free)

---

## Cost summary (locked)

| Stage | Monthly cost | What you get |
|---|---|---|
| Development (Sprints 1-4) | $0 | All 16 services + 4 BFFs + 3 web + 3 mobile. Postgres + Redis + storage. Logs + errors + analytics. |
| Staging (Sprints 5-10) | ~$80 | 6 services on Render Basic, Neon Pro, Sentry Team, Vercel Pro, Resend Pro. |
| Soft launch (Sprints 11-12) | ~$200-300 | All 16 services on Render Basic, EAS Production for OTA, full Sentry + Better Stack. |
| Public launch in Cape Coast | ~$400-600 | Add more Render services, higher Neon tier, Sentry Business for 90-day retention. |

This is well within the typical early-stage startup budget for a Ghana-based tech company.

---

## What changes from the v3.1 plan

| In v3.1 plan | In v3.1 tech stack | Why we changed |
|---|---|---|
| Sentry for error tracking | Sentry free, PostHog for analytics | Single PostHog covers flags + analytics + replay at free tier |
| Unleash for feature flags | PostHog for feature flags | PostHog is all-in-one; Unleash is enterprise-only free |
| AWS S3 for media | Cloudflare R2 | R2 has no egress fees, free 10 GB/mo |
| Heroku Postgres / Render Postgres | Neon | Neon is serverless Postgres, free tier never expires, scales to zero |
| Loki + Prometheus self-hosted | Grafana Cloud free | Same product, no ops |
| Resend not mentioned | Added as email provider | Clean free tier, great React Email support |
| Appetize.io not mentioned | Added for iOS browser testing | You can test iOS app without owning an iPhone |

---

## Next steps

1. You give me the GitHub repo URL or fine-grained token
2. I scaffold the Nx monorepo with all 22 apps + 7 shared libs
3. I add the third-party SDKs to the right places
4. I write infrastructure/envs/dev.env with all the API key placeholders
5. I add GitHub Actions workflows for CI
6. I push the initial monorepo and you run pnpm install locally to see it
7. We deploy the Auth + User + Customer BFF to Render + Neon + Vercel as the first end-to-end test
8. You test the live app on your phone via Expo QR code

Tell me:
1. Is this tech stack right, or do you want me to research any of these more?
2. Are you ready with the GitHub URL or token?
