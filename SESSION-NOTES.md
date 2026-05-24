# Plannr — Session Notes

## 2026-05-24 — Gate 1: Backend deployed to Railway with Postgres

### What we did

Apple Developer approval landed. Followed Gate 1 of `SHIP-TO-PHONE-BRIEFING.md`: move the backend off Anthony's Mac and onto the public internet.

**Live backend URL:** `https://plannr-production-9a90.up.railway.app`
**Project name in Railway:** auto-generated cute name (currently "chic-kindness"). Renameable later.

### Code changes (committed and pushed to `main`)

Four commits, in order:

1. **`058652f`** — Add `SHIP-TO-PHONE-BRIEFING.md` to the repo so future sessions can read it.
2. **`e0b1efd`** — Prep backend for Railway + Postgres:
   - `backend/prisma/schema.prisma`: provider `sqlite` → `postgresql`
   - `backend/scripts/env.sh`: only fall back to SQLite/DATA_DIR path when DATABASE_URL is not externally provided (Railway's Postgres plugin injects it). Vibecode dev container behavior unchanged.
   - `backend/scripts/start`: guard `${DATABASE_FILE}` → `${DATABASE_FILE:-}` so the SQLite-only backup step is a no-op on Postgres instead of crashing under `set -o nounset`.
3. **`a97fc0b`** — `backend/src/prisma.ts`: guard `initSqlitePragmas` behind `DATABASE_URL?.startsWith("file:")`. PRAGMA commands are SQLite-only and crash the boot path on Postgres with "syntax error at or near PRAGMA".
4. **`e127535`** — `backend/src/auth.ts`: Better Auth `prismaAdapter` provider `sqlite` → `postgresql`. The adapter's provider hint controls SQL dialect generation independently of Prisma's own provider; without it, sign-up returned 500.

### Railway configuration

Settings the user manually set in Railway (NOT in code, NOT in repo):
- **Source → Root Directory:** `backend`
- **Deploy → Custom Start Command:** `bash scripts/start`
- **Networking → Generated Domain:** `plannr-production-9a90.up.railway.app` on port 8080
- **Postgres database service** added to project (Railway auto-injects `DATABASE_URL` via `${{Postgres.DATABASE_URL}}` reference)

**Service variables set in Railway (Variables tab on Plannr service):**

| Variable | Value |
|---|---|
| `BACKEND_URL` | `https://plannr-production-9a90.up.railway.app` |
| `BETTER_AUTH_SECRET` | (32-byte hex, saved in Anthony's password manager — DO NOT regenerate unless intending to log everyone out) |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway interpolation, points at the Postgres service) |
| `ENVIRONMENT` | `production` (originally was lowercase `environment` — that defaulted to dev mode silently because env vars are case-sensitive) |

### End-to-end verification

- `GET /health` → 200 `{"status":"ok"}`
- `GET /api/boards` (no auth) → 401 (proves auth middleware mounted)
- `POST /api/auth/sign-up/email` → 200 with user + session token + secure HttpOnly cookie

### Whack-a-mole crashes worked through (in order)

1. Build failed before Root Directory set → set Root Directory to `backend`
2. Build OK, runtime crash: Prisma got SQLite URL with postgresql provider → added Postgres service + `DATABASE_URL` variable
3. Build OK, runtime crash: `ERROR: syntax error at or near "PRAGMA"` → guarded `initSqlitePragmas` (commit `a97fc0b`)
4. Build OK, runtime: signup 500'd with `P2021: table "public.User" does not exist` → root cause was Custom Start Command field was *empty* (default `bun run src/index.ts` was running, skipping our `prisma db push`). Setting it to `bash scripts/start` fixed it AND also exposed the Better Auth adapter bug (commit `e127535`).
5. Server running in "dev mode with hot reload" in production → user had set `environment` (lowercase) instead of `ENVIRONMENT`. Renamed.

### Worth knowing / gotchas

- **`@vibecodeapp/proxy`** (the "DO NOT REMOVE" import at the top of `src/index.ts`) works fine on Railway. It initializes with "no project ID set" and loads 35 proxied domains. No-op enough to not crash the boot. This was the biggest unknown going in — turned out to be a non-issue.
- **The `8 variables added by Railway`** shown in the Variables tab include the Railway-internal stuff (PORT, RAILWAY_*). Don't touch them.
- **`backend/.env.production`** in the repo is unused on Railway — Railway reads from its own Variables tab, not the file. The file is a stale Vibecode-era artifact.
- **No migrations directory** exists — we're using `prisma db push --accept-data-loss` every deploy. Fine while we have no real users; switch to `prisma migrate dev` + `prisma migrate deploy` before inviting family.

### What's NEXT

Gate 1 is done. Remaining gates from `SHIP-TO-PHONE-BRIEFING.md`:

- **Gate 2 — Point the mobile app at the Railway backend.** Set `EXPO_PUBLIC_BACKEND_URL` in `mobile/.env.production` (or equivalent) to `https://plannr-production-9a90.up.railway.app`. Confirm no `localhost`/LAN IP hardcoded anywhere. Estimated 15-30 min.
- **Gate 3 — Apple blockers.** Delete-account flow (Profile → Settings → Delete Account) and Leave/Remove/Rotate UI (backend already done in commit `0505682`). Estimated 60-90 min combined.
- **Gate 4 — EAS Build → TestFlight.** Budget 3-4 hours. Real native build, not Expo Go.

### How to resume next session

1. Confirm the backend is still up: `curl https://plannr-production-9a90.up.railway.app/health` should return `{"status":"ok"}`. If it's down: open Railway dashboard, check Plannr service logs.
2. Start Gate 2: look at `mobile/.env`, `mobile/.env.production`, and any hardcoded backend references in `mobile/src/`. Update to point at the Railway URL.
3. The smoke-test users from today (`railway-smoketest-*@plannr.test`, `smoke-prod-*@plannr.test`) are sitting in the production Postgres. Harmless. Either ignore or wipe via Railway's data viewer once you have a real way to inspect/delete.

## 2026-05-17 — Privacy audit and fixes

### What we did

1. **Audited the backend for multi-tenancy / privacy issues.** Reviewed every route in `backend/src/routes/` (boards, suggestions, votes, checklist, itinerary, activity, inbox, invite) for proper authentication and per-user scoping. Confirmed new-user isolation is sound — a fresh signup sees nothing they shouldn't, and all main list endpoints correctly scope to the current user's board memberships.

2. **Identified and ranked issues** by severity:
   - **High**: cross-board access by authenticated members (checklist + itinerary reorder accepting foreign IDs); no way to leave a board, remove a member, or rotate an invite code.
   - **Medium**: creator email leak via public invite endpoint; invite codes never expire; no rate limiting on batch invites; member emails visible to all other members.
   - **Low**: inconsistent delete permissions; no DELETE for suggestions; board PATCH ignores `eventDate`.

3. **Fixed H3, H1, H2, and M1** in commit **`0505682`**:
   - New endpoints in `backend/src/routes/boards.ts`:
     - `POST /api/boards/:id/leave` — member leaves; refuses if they're the creator.
     - `DELETE /api/boards/:id/members/:userId` — creator-only; refuses self-removal and missing members.
     - `POST /api/boards/:id/rotate-invite` — creator-only; replaces invite code with a fresh `crypto.randomUUID()`.
   - `backend/src/routes/checklist.ts` — reject `suggestionId` from a different board when creating a checklist item.
   - `backend/src/routes/itinerary.ts` — reject reorder `itemIds` that don't belong to the day in the URL.
   - `backend/src/routes/invite.ts` — drop the creator email fallback on the public invite endpoint.

4. **Set up local backend dev on Mac.** Installed Bun via Homebrew, ran `bun install`, `bunx prisma generate`. Backend runs on `http://localhost:3000` with `bun run dev`.

5. **Tested all four fixes end-to-end** with a 9-step curl walkthrough using three test accounts (alice, bob, carol). Every step passed.

### What we deliberately did NOT do

- **No mobile UI yet** for the new endpoints. The backend works, but the app has no buttons for "Leave Board", "Remove Member", or "Rotate Invite Code." Test it via curl until UI lands.
- **Medium-severity issues left open:**
  - M2 — invite codes never expire / no scheduled rotation
  - M3 — no rate limiting or size cap on batch email invites
  - M4 — every board member can see every other member's email address
- **Low-severity items left open:**
  - Inconsistent delete permissions (checklist = creator-only, itinerary = any member)
  - No way to delete or withdraw a suggestion
  - Board PATCH doesn't accept `eventDate` (set-at-creation only)
- **Activity feed rebuild paused.** Plan is drafted (add `ActivityEvent` table, write events at state changes, read from real log instead of projecting from suggestion status). Paused while we did the security work.

### Recommended next steps (in priority order)

1. **Mobile UI for the new endpoints.** The backend is locked down, but users can't actually call Leave / Remove / Rotate without curl. Pick whichever is most painful in real-world testing.
2. **Activity feed rebuild.** Plan ready to execute. Adds proper event logging so the feed shows real history instead of last-30-suggestions-by-status.
3. **M3 + M4 — anti-spam and email privacy.** Before inviting real friends at scale: cap and rate-limit batch invites; decide whether members should see each others' emails.
4. **M2 — invite code lifecycle.** Decide whether codes should auto-expire (e.g., after 30 days) or just remain rotatable on demand.
5. **Low-priority polish.** Inconsistent delete permissions, missing suggestion delete, `eventDate` editing. Fix when you're in the area.

### How to resume work tomorrow

- **Backend is not currently running.** To start it: `cd backend && bun run dev` (will listen on `http://localhost:3000`).
- **Database state:** `backend/prisma/dev.db` contains the three test users (alice@plannr.test, bob@plannr.test, carol@plannr.test) and a test board with one suggestion from the curl walkthrough. Harmless. To wipe clean: delete `backend/prisma/dev.db*` and restart — Prisma will recreate from the schema.
- **Cookie files** at `/tmp/cookies-{a,b,c}.txt` are still on disk if you want to keep poking. `rm -f /tmp/cookies-*.txt` to clean up.

## 2026-05-17 — SDK 54 Expo Go startup crash (paused)

### Where we stopped

Mid-debugging the post-SDK-54-upgrade Expo Go crash. Paused to pivot to higher-leverage work while waiting on Apple Developer account approval. Plan is to come back via a dev build instead of Expo Go, which sidesteps most remaining suspects anyway.

### What we did this session

1. **Bumped Reanimated 3.19 → 4.3.1** (commit `2621d5e`). SDK 54 / RN 0.81's `bundledNativeModules.json` requires `~4.1.1`, and 3.x was the only package out-of-range per `expo-doctor`. Stale comment in the prior upgrade commit claimed NativeWind didn't support v4 — verified that's no longer true (NativeWind 4.1.23 has no Reanimated peer constraint).
2. **Swapped babel plugin** from `react-native-reanimated/plugin` to `react-native-worklets/plugin` (mandatory for Reanimated 4 per their official migration guide). Updated `mobile/CLAUDE.md` `<forbidden_files>` to document this as an allowed exception so future sessions don't try to revert it.
3. **Removed the stale `expo.install.exclude` entry and the Reanimated override** in `mobile/package.json` so future `bunx expo install --fix` runs validate it normally.
4. **Result: crash is unchanged.** Bundle module count went up (3619 → 3786) confirming the new packages are loading, but the runtime error signature is identical.

### Crash signature

- Error: `[runtime not ready]: Error: Exception in HostFunction: <unknown>`
- Stack: `@babel/runtime` helpers — `construct.js`, `wrapNativeSuper.js`, `callSuper.js`
- Routed through `ExpoErrorManager`
- Happens at startup, before any React tree mounts
- Bundle compiles successfully

This is the textbook signature of a library doing `class Foo extends NativeThing` where the new Hermes engine in RN 0.81 can't construct the subclass. The `@babel/runtime` helpers are the *messenger*, not the cause — they're invoked by whichever library is doing the class extension.

### What we ruled out

- **Reanimated 3** — bumped to 4, didn't fix it. (But the bump is correct and stays.)
- **User code doing `extends Error` / `wrapNativeSuper` patterns** — grepped `src/`, none present.
- **SafeAreaView from `react-native`** — every import in `src/` correctly uses `react-native-safe-area-context`. The deprecation warning is from a transitive dep (likely `react-native-calendars` which ships an older bundled `react-native-safe-area-context`, or `react-native-lightbox-v2`). Cosmetic, not the crash.
- **Expo-Go-incompatible natives being imported by user code** — grepped `src/` for `react-native-purchases`, `react-native-vision-camera`, `react-native-mmkv`, `react-native-ios-context-menu`, `@react-native-clipboard/clipboard`, `@react-native-menu/menu`, `@bottom-tabs/react-navigation`, `react-native-bottom-tabs`, `react-native-enriched`: **zero matches**. They're declared in `package.json` (Vibecode template leftovers) but never imported. So they can't be the boot-time crash even though they'd block any dev build that runs them.

### Remaining suspects (in order)

1. **`@vibecodeapp/sdk` (0.4.14)** — wraps the metro config via `withVibecodeMetro` and ships a `dist/index.js`. Doesn't appear in `src/` imports but might be injected into the bundle by the metro wrapper. The SDK was built for SDK 53; SDK 54 / RN 0.81 / React 19.1 may have broken some class-extension code inside it. **Top suspect because it sits invisibly between Metro and the bundle**, which matches a boot-time crash from code the user never wrote.
2. **`react-native-css-interop@0.1.22` override** — still pinned in `mobile/package.json` `overrides`. `expo-doctor` doesn't flag it but NativeWind 4.1+ vendors css-interop internally, so the override may be installing a stale separate copy that conflicts at runtime.
3. **`better-auth` + `@better-auth/expo` 1.6.0** — custom Error subclasses on Hermes + React 19.1 can hit `wrapNativeSuper`. Imported at boot via `_layout.tsx` → `useSession` → `auth-client`.
4. **`react-native-keyboard-controller@1.18.5`** — native module imported by root `_layout.tsx`. Should be supported in Expo Go for SDK 54 but version compatibility wasn't confirmed.

### Recommendation — pivot to dev build via EAS once Apple Developer is approved

Strong reason: the package.json declares ~10 libraries (`react-native-purchases`, `vision-camera`, `mmkv`, `ios-context-menu`, `bottom-tabs`, `enriched`, etc.) that **literally cannot run in Expo Go**, period. Even if we fix this specific boot crash, the first time anyone navigates to a screen that uses one of them, it'll crash. They're not imported today but they're declared, taking up bundle space, and will be wanted eventually.

A dev build (`expo prebuild` + EAS build, or `expo run:ios` locally with Xcode once Apple Developer is set up):
- Includes all native modules from package.json, so the wrapNativeSuper crash either goes away (if the cause was an Expo-Go-vs-RN-0.81 mismatch in a native module) or surfaces with a clearer error
- Unblocks every other native lib in the project
- Is how this app needs to ship anyway

### How to resume

1. Get Apple Developer approval (in progress).
2. `cd mobile && bunx expo prebuild` then either `bunx expo run:ios` (local, needs Xcode) or set up EAS Build (`bunx eas build --profile development --platform ios`).
3. If the crash persists in the dev build, the next step is to actually reproduce inside a debugger and read the full native stack — much more informative than the Hermes-routed `<unknown>` we're seeing now.
4. If the crash is Expo-Go-specific (likely), it disappears and we can keep moving.

### Unrelated worktree dirt at pause

- `backend/bun.lock`, `backend/prisma/dev.db-shm`, `backend/prisma/dev.db-wal`, `mobile/.env` were modified before this session and stayed untouched. Safe to either commit or discard depending on what they are — none are from this work.
- `SESSION-NOTES.md` (this update) is uncommitted. Commit it when ready.
