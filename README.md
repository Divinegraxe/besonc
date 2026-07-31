# BESONC

> Multi-Vendor Delivery & Logistics App for Cape Coast, Ghana.

This is the **BESONC** monorepo. It contains the complete platform for a delivery
and errand-runner business serving Cape Coast and (later) other Ghanaian cities.

**Stack:**
- **Backend:** NestJS microservices (9 services built, 7 more planned across 16 total)
- **Mobile apps:** React Native + Expo (Customer app built, Vendor + Rider apps planned)
- **Web apps:** NextJS (Customer built, Vendor + Admin planned)
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
│   ├── api-gateway/         # NestJS — port 3000 — /api/v1/* router
│   ├── auth-service/        # NestJS — port 3001 — phone OTP via Hubtel, JWT
│   ├── user-service/        # NestJS — port 3002 — profiles, addresses, Smile ID
│   ├── catalogue-service/   # NestJS — port 3003 — vendors, menu items
│   ├── order-service/       # NestJS — port 3004 — order state machine A-E
│   ├── payment-service/     # NestJS — port 3007 — Paystack Charge/Transfer
│   ├── media-service/       # NestJS — port 3010 — image/video uploads to R2
│   ├── pricing-service/     # NestJS — port 3012 — Cape Coast delivery pricing
│   ├── customer-bff/        # NestJS — port 4000 — Backend-for-Frontend
│   ├── customer-web/        # NextJS  — port 4200 — Customer web app
│   └── customer-mobile/     # React Native + Expo — Customer phone app
│   # Planned: vendor-service, rider-service, dispatch-service, tracking-service,
│   #  notification-service, chat-service, search-service, admin-service,
│   #  vendor-bff, rider-bff, admin-bff, vendor-web, admin-web,
│   #  vendor-mobile, rider-mobile
├── libs/
│   ├── shared-types/        # IDs (YDC/YDR/YDV/YDO), state machines, money helpers
│   ├── shared-utils/        # formatting, validation, env helpers
│   ├── shared-config/       # service endpoints + feature flags
│   ├── shared-payment/      # Paystack Charge + Transfer wrapper
│   ├── shared-notifications/ # Hubtel SMS wrapper + templates
│   ├── shared-kyc/          # Smile ID Ghana Card + liveness + AML
│   └── shared-api-client/   # typed HTTP client for the BFFs
├── scripts/
│   ├── dev.js               # runs all backend services in parallel
│   └── setup-dist-libs.js   # symlinks @besonc/* into dist/node_modules
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
# All other keys are optional in dev mode (the services log a warning and
# continue with mock responses).

# 3. Run all the backend services in parallel (one command, one terminal)
pnpm run dev
#   → API Gateway      http://localhost:3000/api/v1
#   → Auth Service     http://localhost:3001/auth
#   → User Service     http://localhost:3002/users
#   → Catalogue        http://localhost:3003/catalogue
#   → Order Service    http://localhost:3004/orders
#   → Payment Service  http://localhost:3007/payments
#   → Media Service    http://localhost:3010/media
#   → Pricing Service  http://localhost:3012/pricing
#   → Customer BFF     http://localhost:4000/bff/customer
#   → Customer Web     http://localhost:4200  (Next.js)
#
#   Each service's stdout goes to /tmp/besonc-<name>.log so the main
#   terminal stays readable. Tail any one with: tail -f /tmp/besonc-catalogue.log

# 4. Open the customer web app
open http://localhost:4200
```

### Useful commands

| Command                | What it does                                                 |
|------------------------|--------------------------------------------------------------|
| `pnpm run dev`         | All 10 services (9 backend + customer-web)                   |
| `pnpm run dev:api`     | Only the 9 backend services (skip Next.js, saves resources)  |
| `pnpm run dev:web`     | Only customer-web (assumes backend is already running)      |
| `pnpm run dev:stop`    | Kills all dev processes                                      |
| `pnpm run dev:mobile`  | Expo dev server for customer-mobile (scan QR with Expo Go)   |
| `pnpm run build:nest`  | Compile all 9 NestJS services with `tsc`                     |
| `pnpm run build:web`   | Build customer-web with `next build`                         |
| `pnpm test`            | Run all tests                                                |
| `pnpm run graph`       | Open the Nx project graph in the browser                     |

### Verifying the stack is up

Once `pnpm run dev` is running, in another terminal:

```bash
# Gateway health (passes through to auth-service)
curl http://localhost:3000/api/v1/auth/health

# List food vendors (5 seeded Cape Coast vendors)
curl 'http://localhost:3000/api/v1/catalogue/vendors?category=FO'

# Request an OTP (in dev mode the OTP is returned in the response)
curl -X POST http://localhost:3000/api/v1/bff/customer/auth/otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+233241234567"}'
# => {"success":true,"data":{"devOtp":"123456"}}

# Get a price quote
curl -X POST http://localhost:3000/api/v1/pricing/quote \
  -H 'Content-Type: application/json' \
  -d '{"service":"FO","distanceMeters":3200,"itemTotalPesewas":4500}'
# => {"success":true,"data":{"grandTotalPesewas":5909,"formatted":{"grandTotal":"GHS 59.09"},...}}
```

---

## Testing the customer mobile app

1. Install **Expo Go** on your phone from the App Store / Play Store.
2. Make sure your phone and dev machine are on the **same Wi-Fi**.
3. From the repo root, run:
   ```bash
   pnpm run dev:mobile
   ```
4. Scan the QR code with:
   - **iOS:** the Camera app
   - **Android:** the Expo Go app
5. The app uses `http://localhost:3000` by default. If you're on Android and
   the app can't reach the API, the Android emulator uses `10.0.2.2` as the
   host machine's localhost; the app handles that automatically. For a
   physical Android phone on Wi-Fi, edit `apps/customer-mobile/src/api/client.ts`
   and set the IP to your dev machine's LAN address (e.g. `http://192.168.1.42:3000`).

---

## The 8 BESONC service categories (locked)

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

1. **Paystack is the only payment provider.** We use only `POST /charge` and
   `POST /transfer`. No Subaccounts, no Transaction Splits. Our internal
   `user_balances` + `balance_ledger_entries` tables are the source of truth.
2. **Hubtel is the only SMS provider.** No Arkesel, no WhatsApp.
3. **Google Cloud is the only maps provider.** We use the Routes API
   (Compute Route Matrix), not the legacy Distance Matrix. **No route
   caching** (violates Google ToS).
4. **Smile ID is the KYC provider** for both vendors and riders
   (Ghana Card + liveness + AML/PEP).
5. **Settlement is T+1, not instant.** Paystack Ghana is T+1. We use a
   buffered float + daily 10:00 GMT batch payout.
6. **Backend is NestJS, mobile is React Native.** No Flutter.
7. **The 8 categories are final.** No phased services, no other categories.

---

## Sprint status

| Sprint | Goal | Status |
|--------|------|--------|
| 1-2 | API Gateway + Auth + User + Customer BFF + Customer Web | ✅ Done |
| 3-4 | Catalogue + Pricing + Order + Payment + Media + Customer Mobile | ✅ Done |
| 5-6 | Dispatch + Tracking + Notification + COD | Not started |
| 7-8 | Chat + Search + Two-way ratings + Tips + Promos | Not started |
| 9-10 | Polish, edge cases, soft launch in Cape Coast | Not started |
| 11-12 | Load test, security audit, public launch | Not started |

---

## Troubleshooting

### "ts-node: not found" or "Cannot find module 'tsconfig-paths'"
You didn't run `pnpm install` from the repo root, OR `node_modules` was
cleaned. Re-run `pnpm install`.

### Services start but `/users/health` (or `/orders/health`, `/media/health`) returns `User not found`
This was a route-ordering bug fixed in commit `ea23c2b`. Pull the latest
main: `git pull origin main`, then `pnpm install` and `pnpm run dev:stop`
before restarting.

### Next.js (customer-web) shows `ENOSPC: System limit for number of file watchers reached`
Increase your inotify limits:
```bash
# Linux
sudo sysctl fs.inotify.max_user_watches=524288
sudo sysctl fs.inotify.max_user_instances=512
# macOS: this isn't a problem; the default is high enough.
```
Or run only the backend for now: `pnpm run dev:api` and the web in a
separate terminal later.

### Mobile app can't reach the API
- Make sure the backend is running (`pnpm run dev:api`).
- On a **physical phone on Wi-Fi**, edit
  `apps/customer-mobile/src/api/client.ts` and replace `localhost` with
  your dev machine's LAN IP.
- On **Android emulator**, no change needed — the app already uses
  `10.0.2.2` instead of `localhost`.

### All services appear to start but exit with `code null`
The shell that ran `pnpm run dev` was killed (Ctrl+C, terminal closed,
or the dev script was stopped). Run `pnpm run dev:stop` first to clean
up any orphans, then re-run.

---

## License

UNLICENSED — proprietary, all rights reserved.
