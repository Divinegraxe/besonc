# Running BESONC on your Mac to test the iPhone app

> **TL;DR:** Three terminals. Total setup time ~5 min.

This guide assumes you want to test the **BESONC customer mobile app**
on a **physical iPhone** using **Expo Go**, with the backend running on
your Mac. This is the setup you described: "I will scan the Expo QR
code and watch."

If you only want to test the backend or the web app, see
`README.md` instead.

---

## Prerequisites (one-time, on your Mac)

1. **Node 20+** — `node --version`. If you don't have it, install from
   <https://nodejs.org> or `brew install node`.
2. **pnpm 9+** — `npm install -g pnpm` (then `pnpm --version`).
3. **Git** — `git --version`.
4. **iPhone** with the **Expo Go** app installed (free, from the App
   Store).
5. **Your iPhone and Mac on the same WiFi network.** Some public /
   corporate WiFi blocks peer-to-peer connections — if that's you, see
   "If same-WiFi doesn't work" at the bottom.

---

## Step 1 — Get the code

```bash
# In Terminal, wherever you keep projects:
git clone https://github.com/Divinegraxe/besonc.git
cd besonc
```

If you already have it from a previous session:

```bash
cd besonc
git pull origin main
pnpm install
```

---

## Step 2 — Install dependencies (one-time per clone)

```bash
# From the repo root
pnpm install

# The mobile app has its own pnpm workspace, so install its deps too
cd apps/customer-mobile
pnpm install
cd ../..
```

(`pnpm install` at the root pulls in the 9 NestJS services + Next.js + shared libs.
`pnpm install` inside `apps/customer-mobile` pulls in Expo + React Native.)

This creates two `node_modules/` folders. The mobile one's is in
`apps/customer-mobile/node_modules/`.

---

## Step 3 — (Optional) set up the `.env`

```bash
cp .env.example .env
```

Most keys are **optional in dev mode** — the services log a warning and
fall back to mock responses. The one that matters for the iPhone test
is **none** — OTP comes back in the API response (look for `devOtp`),
Paystack isn't called, etc. You can ship a working demo without any
real API keys.

---

## Step 4 — Find your Mac's LAN IP

In Terminal:

```bash
# macOS:
ipconfig getifaddr en0
# (If you're on Ethernet use en1, or just run `ifconfig` and look for
#  the non-loopback inet line.)

# Example output: 192.168.1.42
```

**Write that down.** That's the IP your iPhone needs to reach your Mac.

---

## Step 5 — Open three terminals

| Terminal | Command                                                  | Purpose                                  |
|----------|----------------------------------------------------------|------------------------------------------|
| **T1**   | `pnpm run dev:api`                                       | Start the 9 backend NestJS services      |
| **T2**   | `EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:3000 pnpm run dev:mobile` | Start Expo so the iPhone can connect |
| **T3**   | (free, for running curl / viewing logs)                  | Diagnostics                              |

In each terminal, `cd` into the repo root first.

**T1** — Start the backend:

```bash
pnpm run dev:api
```

You should see 9 services start in parallel, one line each. After ~10s
the last line should be:

```
[customer-bff] 🛒 Customer BFF running on http://localhost:4000/bff/customer
```

If anything says "exited with code null" you probably Ctrl+C'd T1 — just
re-run it. Each service also logs to its own file in `/tmp/besonc-*.log`
if you want to follow a single one.

**Smoke-test the backend** (in T3):

```bash
curl http://localhost:3000/api/v1/auth/health
# Expect: {"status":"ok","service":"auth-service",...}

curl 'http://localhost:3000/api/v1/catalogue/vendors?category=FO'
# Expect: 5 vendors, starting with Auntie Ama Kitchen
```

If those work, the backend is good.

---

**T2** — Start Expo with your LAN IP baked in:

```bash
# Replace 192.168.1.42 with YOUR Mac's LAN IP from Step 4
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:3000 pnpm run dev:mobile
```

What you should see:

```
Starting project at /home/user/besonc-workspace/apps/customer-mobile
Starting Metro Bundler

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █   █▄ ▀▄██ ▄▄▄▄▄ █
█ █   █ █ ▀▄ █▀▄▀▄█ █   █ █
█ █▄▄▄█ █▀██▀▀█▀▄██ █▄▄▄█ █
█▄▄▄▄▄▄▄█▄▀▄█ █▄█▄█▄▄▄▄▄▄▄█
█  ▀▀▄ ▄█▀▀▀▄▀█▄ ███ ▀▄▄ ▄█
█▄▀▀▀▄ ▄▄▀█▀ ▄██  ▀ ▄▀  ▀██
█▀▀▄▄ ▀▄ █▀▄█▄▀▄▀▄▀▄▀▀▄ ▀██
███▀▄▀▀▄█  ██▀██▄▄ ▀▀▄ ▀███
█▄▄█▄██▄█  █▄▀█▄▄ ▄▄▄ ▀ ▄▄█
█ ▄▄▄▄▄ █▀█▄ ▄██▀ █▄█ ▀▀█▀█
█ █   █ █▄ ▀█▄▀▄█▄▄ ▄▄▀   █
█ █▄▄▄█ █▀▀▀█▀█▀█▄█▄▀█▀▀ ██
█▄▄▄▄▄▄▄█▄▄▄▄▄▄▄██▄▄▄▄▄▄▄▄█

› Metro waiting on exp://192.168.1.42:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

**That QR code is what you scan with your iPhone.** The text `exp://192.168.1.42:8081`
must show YOUR IP, not `localhost` and not `127.0.0.1`.

---

## Step 6 — Scan and test on the iPhone

1. Make sure iPhone is on the **same WiFi** as your Mac.
2. Open the **Camera** app (not Expo Go).
3. Point it at the QR code in T2.
4. iOS will show a notification "Open in Expo Go" — tap it.
5. Expo Go opens and shows the **BESONC** splash screen.
6. You should land on the **Welcome / phone number** screen.

### Walk through the test

1. **Phone number** — type `0241234567` (any valid Ghana format). Tap
   **Send code**.
2. **OTP** — the screen switches. In T2's Metro log you'll see the
   dev OTP printed (search for `DEV OTP:`). The login screen also shows
   a dev-mode hint in dev builds. Type the 6 digits.
3. **Home** — you should see 8 service categories (Food, Groceries,
   Pharmacy, etc.). The number of orders is fetched from the backend.
4. **Tap "Food"** → **Vendors** screen → you should see 5 Cape Coast
   vendors (Auntie Ama Kitchen, Cape Coast Mall Foods, etc.).
5. **Tap a vendor** → **Menu** screen → you should see menu items with
   prices in GHS.
6. **Profile** tab → shows your phone number and user ID.
7. **Orders** tab → empty (you haven't placed one yet). The orders
   screen talks to the backend; if it loads, the full E2E is working.

### If the app shows "Network Error"

The phone can't reach your Mac. Most common causes:

| Cause | Fix |
|-------|-----|
| Wrong IP in `EXPO_PUBLIC_API_BASE_URL` | Re-run T2 with the correct IP |
| iPhone on cellular / different WiFi | Move iPhone to the same WiFi as Mac |
| Mac firewall blocking port 3000 | System Settings → Network → Firewall → allow `node` |
| iOS App Transport Security (ATS) | This is already enabled in Expo Go — only matters for dev builds |
| Phone still using cached old IP | Force-quit Expo Go, reopen, scan QR again |

If the URL is wrong, you can change it at runtime without rebuilding:

1. In the app, on the **Welcome** screen, scroll down.
2. Tap **Dev: Backend URL** to expand the dev panel.
3. Edit the URL to your Mac's IP, e.g. `http://192.168.1.42:3000`.
4. Press **Send code** again — the new URL is saved to AsyncStorage.

---

## Step 7 — Stop everything

In T1: Ctrl+C. In T2: Ctrl+C. The services shut down cleanly (SIGTERM,
2-second grace period).

If anything is stuck:

```bash
pnpm run dev:stop
# Equivalent to: pkill -f 'ts-node.*apps/' && pkill -f 'next dev' && pkill -f 'nx start'
```

---

## If same-WiFi doesn't work

Some WiFi networks (campus, corporate, public) block peer-to-peer
connections. Three options:

1. **Use a personal hotspot.** Turn on iPhone's Personal Hotspot, then
   connect your Mac to the iPhone's WiFi. Both devices are now on the
   same network, no firewall in the way. Re-run T1 and T2 with the
   Mac's new IP (`ipconfig getifaddr en0` again — it'll be different).

2. **Use a USB cable.** Connect iPhone to Mac with a Lightning cable.
   The Mac will assign itself a new IP on the iPhone-USB interface.
   Set `EXPO_PUBLIC_API_BASE_URL` to that IP, e.g.
   `http://192.168.2.1:3000`. The QR code in T2 will advertise this
   new IP.

3. **Use tunnel mode.** Slower, but works from any network:

   ```bash
   # In T2:
   cd apps/customer-mobile
   npm i -g @expo/ngrok   # one-time
   npx expo start --tunnel
   ```

   This gives a public URL like
   `https://xxxxxxx.bacon.19000.exp.direct`. Use that as your
   `EXPO_PUBLIC_API_BASE_URL` (the env var trick still works; the
   tunnel URL has HTTPS so ATS is happy too).

---

## What "good" looks like

After the above, you should be able to:

- [x] Tap "Send code" and see a 6-digit OTP printed in the Metro log
- [x] Enter the OTP and reach the home screen with your user ID
- [x] See 5 Cape Coast food vendors
- [x] Open a vendor and see their menu with GHS prices
- [x] Go to Profile and see your phone + user ID persisted
- [x] Go to Orders (empty list is fine, no errors)

If all of those work, Sprint 3-4 is officially done end-to-end on a
real device. We can move on to Sprint 5-6 (dispatch, tracking,
notifications).
