# Plannr — Ship-to-Phone Sprint (Claude Code Briefing)

**Hand this to Claude Code at the start of the session.** Paste it in, or save it to the repo and say "read SHIP-TO-PHONE-BRIEFING.md".

---

## The situation

Apple Developer approval just landed. That was the only thing not in my control, and it's now unblocked. Every previously-blocked task is now go.

**Goal of this sprint:** Get Plannr running on my own iPhone via a real dev build / TestFlight, so I can shake out kinks before inviting my family. This is Horizon 1 from the roadmap — the August proposal trip is the deadline that matters.

I am new to all of this. Explain what each step does before running it. When something could go wrong, tell me what "wrong" will look like so I don't panic.

---

## Do these in THIS order. Do not reorder.

The order is deliberate: the phone app needs to know the backend's public address, so the backend has to be live on the internet *before* I build the app for my phone. Building the phone app first means rebuilding it again later — wasted work.

### Gate 1 — Deploy the backend to Railway (public internet)

Right now the backend runs on this Mac, which means the app only works when this machine is on. Deploy it to Railway so it has a permanent public URL.

- Confirm the current stack (docs say Bun + Hono).
- Surface the env vars that need to be set in Railway before deploying — don't let me discover them by failure.
- **Database is the likely sticking point.** Docs say I'm probably on SQLite locally and will need PostgreSQL in production. Walk me through this explicitly. If we migrate to Postgres, explain what changes and why. Do not silently swap it.
- End state: a working public backend URL I can hit in a browser or with curl and get a real response.

### Gate 2 — Point the app at the new backend

- Update the mobile app's production config (`.env.production` or equivalent) to use the Railway URL from Gate 1.
- Confirm there's no leftover `localhost` / LAN IP hardcoded anywhere that would break once it's off my machine.

### Gate 3 — Clear the two Apple blockers

Apple will REJECT the app without the first one, so it's not optional.

- **Delete-account flow.** Must be reachable from Profile → Settings → Delete Account, and must actually delete the account + authored content server-side. The privacy policy already promises this exact behavior — match it.
- **Leave / remove / rotate UI.** Backend for this is already done; only the mobile UI is missing. Build the UI for: a member leaving a board, a creator removing a member, and a creator rotating the invite code.

### Gate 4 — EAS dev build → my phone → TestFlight

This is Risk #2 from the roadmap (Expo Go can't run Plannr — already pivoted, dev build is the right path). Budget 3–4 hours; treat slowness here as expected, not failure.

- Set up EAS Build if it isn't already configured.
- Produce an installable iOS build.
- Get it onto my own phone (TestFlight is the cleanest path now that Apple's approved).
- End state: I open Plannr on my iPhone, sign up fresh, create a board, and it talks to the live Railway backend.

---

## Rules for this session (from the roadmap)

- **One thing at a time.** Don't batch four risky changes into one move. I want to understand each before the next.
- **No refactoring.** The roadmap explicitly forbids touching the 4,400-line board screen pre-launch. Code quality is fine. Resist the urge.
- **No new features.** Nothing that wasn't already on the Horizon 1 list. Feature creep dies on sight until Horizon 2.
- **No scope additions** even if they seem easy. Activity feed, comments, public boards, cost-splitting are all explicitly later.

## When something breaks

Tell me, in plain language: what broke, what it means, and the two or three options for fixing it with the tradeoffs. Don't just push forward. I'd rather understand a delay than be confused by speed.

## End-of-session handoff

Before we stop, update `SESSION-NOTES.md` with: what got done, what's half-done, what the next session should start with, and any new env vars / URLs / credentials I now need to keep track of. Future-me reads this first when I sit back down.
