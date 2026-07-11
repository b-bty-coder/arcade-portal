# Cartridge Arcade — PWA Game Portal

A full-stack, installable game portal built with React + Vite (frontend) and
Express + SQLite (backend). Includes: multiple in-browser games, user
accounts, cloud-synced progress, per-game + global leaderboards, a coin +
cosmetics shop, and daily login streaks. Ad slots are wired in as clearly
marked placeholders — no real ad account is included (see "What's a
placeholder" below).

## Project structure

```
arcade-portal/
├── server/          Express + SQLite API (auth, progress, leaderboard, shop, streaks)
└── frontend/         React + Vite PWA (installable, offline app shell)
```

## Running it locally

You need Node.js **22.5 or newer** (the backend uses Node's built-in
`node:sqlite`, so there's no native module to compile — this also makes it
realistic to run on Termux/Android, see below).

### 1. Start the backend

```bash
cd server
npm install
npm start
```

This starts the API on `http://localhost:4000` and creates `arcade.db`
(SQLite file) on first run — no separate database server needed.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/*` calls to the backend
automatically (see `frontend/vite.config.js`).

## Running it on Android (no computer needed)

Acode is a code editor — it can't run a server by itself. Pair it with
**Termux** (a real Linux terminal for Android) and everything above runs
directly on your phone:

1. Install **Termux** from F-Droid (the Play Store version is outdated):
   https://f-droid.org/packages/com.termux/
2. In Termux:
   ```bash
   pkg update && pkg install nodejs git unzip
   termux-setup-storage   # lets Termux read your phone's Downloads folder
   ```
3. Unzip the project (assuming you downloaded the zip to Downloads):
   ```bash
   cd ~
   unzip /sdcard/Download/arcade-portal.zip
   cd arcade-portal
   ```
4. Confirm your Termux Node supports `node:sqlite`:
   ```bash
   node -e "require('node:sqlite'); console.log('ok')"
   ```
   If it errors, your Node is older than 22.5 — run `pkg upgrade nodejs`
   and try again.
5. Start the backend in this Termux session:
   ```bash
   cd server && npm install && npm start
   ```
6. Swipe from the left edge → "New session" to open a second Termux
   session, then start the frontend there:
   ```bash
   cd arcade-portal/frontend && npm install && npm run dev
   ```
7. Open Chrome on the same phone and go to `http://localhost:5173` —
   since the server and browser are on the same device, plain `localhost`
   works, no extra network setup needed.
8. Edit files with Acode as usual; Vite hot-reloads the frontend
   automatically, the backend needs a manual restart (`Ctrl+C`, then
   `npm start` again) after you change server code.

First `npm install` in each folder can take a couple of minutes on a phone
— that's normal, let it finish.

### 3. Try it out

1. Register an account.
2. Play "Neon Snake" or "Cartridge Match" — your score saves automatically.
3. Check the Leaderboard page.
4. Use the "Watch ad (demo)" button on a game page to earn coins, then spend
   them in the Shop on cartridge skins / profile frames.
5. Reload the app the next day (or change your system clock) to see the
   daily streak popup.

### 4. Building for production / installing as a PWA

```bash
cd frontend
npm run build
npm run preview
```

`npm run build` generates the service worker and manifest via
`vite-plugin-pwa`. Once served over HTTPS (required for PWA installability
outside localhost), Chrome/Edge on Android and desktop will offer to
"install" the app; iOS Safari uses "Add to Home Screen" from the share menu
and has more limited PWA support.

## What's real vs. what's a placeholder

**Real and working:**
- Auth (register/login, JWT sessions, hashed passwords)
- Progress saving — local-first via IndexedDB, synced to the backend
- Leaderboards — per-game and global, with basic server-side score sanity checks
- Coin economy, shop, cosmetics, inventory, equip system
- Daily streak tracking and coin rewards
- PWA installability, offline app-shell caching
- Two playable games (Snake, Memory Match) as a template for adding more

**Placeholders you must replace before going live:**
- `frontend/src/components/AdSlot.jsx` — swap in real AdSense/AdMob/offerwall
  embed code. The rewarded-ad flow currently simulates "ad watched" on click;
  in production, only credit coins after your ad network confirms the view
  via a **server-to-server postback** (see the comment in
  `server/index.js` above the `/api/coins/reward-ad` route).
- `server/auth.js` — the JWT secret is hardcoded for local dev. Set a real
  `JWT_SECRET` environment variable before deploying anywhere public.
- SQLite is fine for development and small-scale use; for real traffic,
  migrate to Postgres/MySQL and put the API behind proper hosting.
- No rate limiting / CAPTCHA on registration or login — add before public launch.
- No email verification or password reset flow.

## Adding a new game

1. Build a component in `frontend/src/games/` that accepts
   `{ onGameOver, bestScore }` props and calls `onGameOver(score)` when a
   round ends.
2. Register it in `frontend/src/games/registry.js`.
3. Optionally add a `MAX_SCORE` entry in `server/index.js` for basic
   leaderboard sanity-checking.

That's it — the Home page, Game page, and Leaderboard page all read from the
registry automatically.
