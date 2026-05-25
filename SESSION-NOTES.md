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
2. Smoke-test users from today (`railway-smoketest-*@plannr.test`, `smoke-prod-*@plannr.test`, `delete-test-*`, `cascade-*`, `verify-*`) are in the production Postgres. Harmless. Either ignore or wipe via Railway's data viewer.

---

## 2026-05-24 (continued) — Gates 2, 3A, and 3B in the same session

### What got done after Gate 1

**Gate 2 — mobile prod env points at Railway** (commit `11af05b`)
- `mobile/.env.production`: swapped all three Vibecode URL references (`BACKEND_URL`, `EXPO_PUBLIC_BACKEND_URL`, `EXPO_PUBLIC_VIBECODE_BACKEND_URL`) to `https://plannr-production-9a90.up.railway.app`.
- Only `EXPO_PUBLIC_BACKEND_URL` is actually referenced in code (verified via grep). The other two are stale Vibecode template artifacts kept consistent for safety.
- `mobile/.env` (dev) still points at LAN IP `192.168.1.38:3000` — kept for local dev iteration.
- **Not actually exercised until Gate 4** when EAS builds an app that uses these vars.

**Gate 3A — Delete Account flow (Apple blocker)** — three commits
1. `04a1032` — schema cascade semantics: added `onDelete: Cascade` to `Board.creator`, `Suggestion.author`, `ChecklistItem.createdBy`, `ItineraryItem.createdBy`. Added `onDelete: SetNull` to `ChecklistItem.assignee` and `ItineraryItem.lastEditedBy`. Enabled Better Auth's built-in `user.deleteUser.enabled: true`. Exposed at `POST /api/auth/delete-user`.
2. `d5d61a0` — `session.freshAge: 0` so the mobile UI can delete without a password prompt regardless of how long ago the user signed in. Acceptable tradeoff for our scale.
3. `8072842` — `mobile/src/app/(app)/profile.tsx`: red Delete Account button below Sign out → confirmation modal → `authClient.deleteUser()` → `invalidateSession()` → root layout routes to login.

End-to-end cascade verified via curl: create user + board → delete user → returns 200 (no FK error) → second user can't fetch board (404). The 200 itself is proof the cascade fired — without it, Prisma would have errored on the foreign key.

**Gate 3B — Leave / Remove member / Rotate invite UI** (commit `867cbaa`)
- Backend routes already existed (commit `0505682`). Pure mobile UI work.
- Made the `{N} members` text in the board meta row tappable (purple color). Opens a bottom-sheet Members modal.
- Members modal shows each member with name + role badge ("Creator" for the board creator). Three actions wired up:
  - **Rotate invite code** (creator-only, top of sheet) — confirmation → `POST /api/boards/:id/rotate-invite` → invalidates `["board", id]` cache → toast.
  - **Remove member** (creator-only, per non-creator-non-self row) — confirmation → `DELETE /api/boards/:id/members/:userId` → cache invalidation.
  - **Leave board** (non-creator-only, bottom of sheet) — confirmation → `POST /api/boards/:id/leave` → routes to boards list.
- All mutations surface errors via the existing `showToast(msg)` callback.
- No edits to existing logic in the 4400-line `board/[id].tsx`. Pure additions in localized chunks.

### What's NEXT

**Gate 4 only** remains: EAS Build → TestFlight on Anthony's phone.

- Open Claude Code with a clear runway (3-4 hours).
- Need: `cd mobile && bunx eas build:configure` (one-time), set up Apple App-specific password for EAS, then `bunx eas build --profile development --platform ios`.
- The Expo SDK 54 / RN 0.81 boot crash in Expo Go is *expected to disappear* in a real dev build (per `2026-05-17` notes). If it persists, the dev build will at least surface a real native stack to read.
- Then the install-on-phone step (TestFlight after the build uploads).
- End-to-end test: open Plannr on iPhone, sign up fresh, create a board, invite by sharing the link, verify it works against the live Railway backend.

### Things to verify before Gate 4

These aren't bugs — they're items where a sanity check before EAS builds saves a re-build cycle:

1. **Run the mobile app once locally pointed at Railway.** Set `EXPO_PUBLIC_BACKEND_URL` in `mobile/.env` to the Railway URL temporarily, start the app on a simulator, verify sign-up / create board / invite UI all still work. (The signup test you ran via curl proves the backend; this proves the full mobile→Railway path.)
2. **Smoke-test the new Profile → Delete Account button** in the simulator before committing it to a TestFlight build. Sign up a fresh user, tap Delete Account, confirm the user is gone (try to sign in again, should fail).
3. **Smoke-test the Members modal** — tap "N members" on a board, open and close, try the Leave/Remove/Rotate flows. Easiest to do with two test accounts.
4. **Better Auth `trustedOrigins` does NOT include any iOS app scheme yet.** Current list (in `backend/src/auth.ts`): `vibecode://*/*`, `exp://*/*`, localhost, Vibecode domains. Once Plannr has a real bundle ID (e.g. `app.joinplannr` → scheme `app.joinplannr://`), we may need to add that. Test from the dev build first — bearer-token auth may make this a non-issue.

### Open items still deferred (from earlier sessions, NOT today)

- **M2** — invite codes never auto-expire (rotation is now manual via UI as of today, so this is less urgent)
- **M3** — no rate limiting on batch email invites
- **M4** — board members see each others' emails (members modal now exposes this UX-wise; before, only via API response)
- **Low** — inconsistent delete permissions (checklist creator-only, itinerary any-member), no DELETE for suggestions, board PATCH ignores `eventDate`
- **Activity feed rebuild** — planned, still paused
- **Dev/prod schema divergence** — local backend dev now broken because `schema.prisma` says `postgresql` but Anthony's local DB is SQLite. Either: (a) install Postgres locally, (b) point local dev at the Railway database temporarily, (c) keep a separate `schema.dev.prisma`. Doesn't block Gate 4. Worth solving before doing more backend work.

### Today's commit log

1. `058652f` — Add SHIP-TO-PHONE-BRIEFING.md
2. `e0b1efd` — Prep backend for Railway + Postgres (schema, env.sh, start)
3. `a97fc0b` — Guard SQLite PRAGMA init on Postgres
4. `e127535` — Better Auth Prisma adapter sqlite → postgresql
5. `297a2eb` — SESSION-NOTES Gate 1 done
6. `11af05b` — Gate 2: mobile .env.production → Railway
7. `04a1032` — Gate 3A: enable account deletion with cascade semantics
8. `d5d61a0` — Skip session-freshness on delete-user
9. `8072842` — Gate 3A: Delete Account UI on Profile screen
10. `867cbaa` — Gate 3B: Members modal with leave / remove / rotate

---

## 2026-05-24 (continued) — Gate 4 attempted, build pipeline working, app crashes at boot

### What got built

**EAS Build setup complete** (commits `6053696`, `38bfabd`, `db09a66`, `2bd9d03`):
- `mobile/app.json`: name `vibecode` → `Plannr`, slug → `plannr`, added `ios.bundleIdentifier: "app.joinplannr.plannr"` and `android.package` to match. scheme kept as `vibecode` because changing it requires updating `auth-client.ts` deep-link handling (deferred).
- `mobile/eas.json` (new): development / preview / production build profiles. Preview profile is internal-distribution.
- `bunx eas-cli init --force` linked Expo project, added `extra.eas.projectId` and `owner: "plannr"` to app.json.
- Apple Developer credentials registered with EAS: distribution certificate, provisioning profile, Anthony's iPhone UDID `00008101-00146DD03441001E` provisioned.
- Bundle ID `app.joinplannr.plannr` registered in App Store Connect; app created.

### Build pipeline issues debugged

1. **Build 7e7753b1** failed at "Install pods" with `[!] Unable to find a specification for RCT-Folly (= 2022.05.16.00) depended upon by react-native-ios-context-menu`. Root cause: `react-native-ios-context-menu` (and 8 other Vibecode-template native packages) declared in `package.json` but never imported in `src/`, and pinning an old Folly version RN 0.81 doesn't ship.
2. **First fix attempt** (`38bfabd`) — removed all 9 unused direct deps. Build 7e7753b1 (rebuild) still failed identically because `zeego@3.0.6` (which we kept) lists `react-native-ios-context-menu`, `react-native-ios-utilities`, `@react-native-menu/menu` as **peerDependencies**, so bun reinstalled them.
3. **Second fix** (`db09a66`) — removed `zeego` (zero imports in `src/`). Build **5beabad1** succeeded.

### The actual blocker — app crashes at boot

Anthony installed build 5beabad1 on his iPhone via the EAS direct-install link (NOT TestFlight, but uses the same ad-hoc distribution mechanism). Steps that did work:
- Safari → install link → tap Install → app icon on home screen
- iOS prompt "Plannr requires developer mode to run" → Settings → Privacy & Security → Developer Mode → ON → phone restart → confirm

But: **tapping the app icon shows a white screen for ~1 second, then exits back to home.** Same `wrapNativeSuper`-style boot crash the 2026-05-17 session saw in Expo Go. Confirmed NOT Expo-Go-specific.

**Attempted fix** (`2bd9d03`) — speculative: removed `withVibecodeMetro` wrap from `metro.config.js`. Hypothesis was that the SDK wrapper injects a `.web.js` fetch polyfill into `getModulesRunBeforeMainModule` unconditionally, which Hermes can't execute on iOS. Removed the wrap, rebuilt — build **cc635181** succeeded but **the app still crashes the same way.** Hypothesis was wrong.

### What we know definitively now

- The crash is NOT Expo-Go-specific (it's in a real dev build too).
- The crash is NOT caused by `withVibecodeMetro` (still crashes after removing it).
- The crash is at startup, before any React tree mounts.
- Crash mode: app launches → white screen → exits to home. No error message visible to the user.

### Remaining suspects (in order; from 2026-05-17 notes)

1. **`react-native-css-interop@0.1.22` override** — still pinned in `mobile/package.json` `overrides`. NativeWind 4.1+ vendors css-interop internally; the override may install a stale separate copy that conflicts at runtime.
2. **`better-auth` + `@better-auth/expo` 1.6.0** — custom Error subclasses on Hermes + React 19.1 can hit `wrapNativeSuper`. Imported at boot via `_layout.tsx` → `useSession` → `auth-client`.
3. **`react-native-keyboard-controller@1.18.5`** — native module imported by root `_layout.tsx`.
4. **`@vibecodeapp/sdk` polyfills still loaded somewhere** — even after unwiring the metro wrapper, the package's polyfills might be auto-imported via the dist/index.js side-effect path.

### How to resume — read the crash log first

Don't guess at suspects in another rebuild loop. Get the actual native iOS crash log:

1. Plug Anthony's iPhone into the Mac via USB.
2. On Mac, open **Console.app** (Cmd-Space → "Console").
3. In Console's sidebar, click his iPhone under "Devices".
4. Click **"Start streaming"** at the top.
5. On the iPhone, tap the Plannr icon → crash happens.
6. In Console, immediately stop streaming and search for `Plannr` or `plannr` in the search bar.
7. The crash log includes the failing library / function. That tells us EXACTLY which suspect (or new culprit) is the boot blocker.

Alternative: in Xcode → Window → Devices and Simulators → his iPhone → "View Device Logs" tab. Crash reports for Plannr appear here.

Once we know the culprit, the fix is 1-3 lines of code (e.g., remove an import, downgrade a version, swap a package).

### Build cycle reference

EAS Build cycle is 12-15 min per attempt. Use it sparingly — read a crash log first.

```
bunx eas-cli build --profile preview --platform ios --non-interactive
```

Install URL pattern: `https://expo.dev/accounts/plannr/projects/plannr/builds/<build-id>`. Open on iPhone in Safari, tap Install. App replaces existing in-place.

### Today's full commit log

1. `058652f` — Add SHIP-TO-PHONE-BRIEFING.md
2. `e0b1efd` — Prep backend for Railway + Postgres
3. `a97fc0b` — Guard SQLite PRAGMA init on Postgres
4. `e127535` — Better Auth Prisma adapter sqlite → postgresql
5. `297a2eb` — SESSION-NOTES Gate 1 done
6. `11af05b` — Gate 2: mobile .env.production → Railway
7. `04a1032` — Gate 3A: enable account deletion with cascade semantics
8. `d5d61a0` — Skip session-freshness on delete-user
9. `8072842` — Gate 3A: Delete Account UI on Profile screen
10. `867cbaa` — Gate 3B: Members modal with leave / remove / rotate
11. `f28d9de` — SESSION-NOTES Gates 2, 3A, 3B done
12. `6053696` — Gate 4: app.json + eas.json (Plannr identity)
13. `38bfabd` — Drop 9 unused Vibecode-template native packages
14. `db09a66` — Drop zeego (peer-dep chain that re-pulled failing packages)
15. `2bd9d03` — Unwire withVibecodeMetro (DID NOT FIX boot crash)

### State of the world after today

- ✅ Backend live: `https://plannr-production-9a90.up.railway.app`
- ✅ Mobile prod config points at Railway
- ✅ Delete account UI + cascade-on-delete schema
- ✅ Members modal (leave / remove / rotate)
- ✅ EAS Build pipeline configured top to bottom
- ✅ Latest build installs on Anthony's phone via official mechanism
- ❌ App crashes at boot — actual culprit unknown until we read Console.app logs

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
