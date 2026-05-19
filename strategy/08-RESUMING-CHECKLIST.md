# Plannr — When You Come Back From Coffee

**Read this first. Then pick a path.**

---

## What This Package Is

A complete strategy package for Plannr. 9 documents covering everything from roadmap to TikTok ideas to privacy policy.

**Total reading time if you want to absorb everything:** ~30 min.
**Total reading time for just the essentials:** ~5 min (this file + `00-ROADMAP.md`).

---

## The 5-Minute Path Forward

If you've got energy to keep moving, here's the smallest, highest-leverage path:

### Step 1 — Lock down TikTok privacy (3 min)

On your iPhone, TikTok → Profile → ☰ menu → Settings and privacy → Privacy →
- Turn OFF "Suggest your account to others" (all sub-options)
- Turn OFF "Sync contacts and Facebook friends"

This is the most important step — until this is locked, every TikTok you make risks being recommended to your friends and family.

### Step 2 — Claim @joinplannr on Instagram, YouTube, X (15 min)

Same drill as TikTok:
- Sign up with `aws.planner7@gmail.com`
- Username: `joinplannr`
- Decline contact upload
- Turn off discoverability settings immediately after signup
- Use the bios from `04-SOCIAL-BIOS.md`

### Step 3 — That's it. Stop.

You've moved Plannr forward more in 8 hours than most people do in a month.

---

## What's In This Package (Map)

```
strategy/
├── 00-ROADMAP.md              # The north star. Read first when in doubt.
├── 01-PRODUCT-BRIEF.md        # What Plannr is. Source of truth for marketing.
├── 02-APP-STORE-COPY.md       # Drafts for App Store submission.
├── 03-PRIVACY-POLICY-DRAFT.md # Privacy policy ready for publication.
├── 04-SOCIAL-BIOS.md          # Paste-ready bios for all 4 platforms.
├── 05-CONTENT-IDEAS.md        # 20+ TikTok post concepts.
├── 06-APP-ICON-BRIEF.md       # AI prompts for generating an icon.
├── 07-WEEK-PLAN.md            # Day-by-day plan for next 7 days.
└── 08-RESUMING-CHECKLIST.md   # This file.
```

---

## Decisions Waiting For You

These came up while building the package. Glance at them, give answers, and lock them down:

### 1. App icon color palette

Recommended: **coral (#FF6B5B) with cream**. Alternatives are muted teal or dusty lavender. Pick one and commit across icon + social profiles.

### 2. Brand voice "we" vs "I"

Right now Plannr's voice is faceless — never says "we" or "the team." Some places (privacy policy) need a legal entity voice. The privacy policy says "we" because it's legally clearer.

Marketing copy is "Plannr is…" (third person) or first-person from the app's perspective ("i'm tired"). NOT "we built Plannr because…"

### 3. Mailing address for privacy policy

California (where you live) requires a contact address on privacy policies. **Don't use your home address publicly.**

Options:
- USPS PO Box (~$10-15/month, real physical address)
- Virtual mailbox service (Earth Class Mail, Anytime Mailbox — ~$10-30/month)
- Your home address (NOT recommended — public WHOIS-style exposure)

Recommendation: USPS PO Box at the post office near you. Cheap, real, private.

### 4. Email forwarding setup

You need `anthony@joinplannr.app` (or `support@joinplannr.app`) to work for the privacy policy and App Store support contact.

Easiest: **Cloudflare Email Routing (free)**. Forwards to your `aws.planner7@gmail.com`. Takes 10 min to set up.

### 5. Public posts before launch?

Two schools of thought:
- A) Start posting on TikTok NOW, even before the app is live. Build audience, drive to a "join waitlist" landing page.
- B) Wait until TestFlight is real and you can show real screen recordings.

Recommendation: Start now (option A). Comment-bait content (Post 13 in the ideas doc) doesn't need the app at all. Build audience while waiting on Apple.

---

## What Still Needs Doing (Real Things, Real Sequence)

These are NOT urgent today but they're real:

1. Apple Developer approval (waiting)
2. Privacy policy hosted at joinplannr.app/privacy
3. Email forwarding set up
4. App icon generated
5. First TikTok post
6. Backend deployed to Railway (after Apple)
7. Dev build via EAS (after Apple)
8. Mobile UI for leave/remove/rotate (after dev build works)
9. Delete account flow (after dev build)
10. TestFlight to family (after all of the above)

---

## How to Sit Back Down at Plannr (Future You)

When you come back to this project, the playbook is:

1. Open Terminal
2. `cd ~/projects/plannr`
3. `cat SESSION-NOTES.md` — read your past-self's handoff
4. Check the `strategy/` folder for the right doc for what you're doing
5. If coding: `claude` to launch Claude Code
6. If marketing / writing: just edit the docs
7. If unsure where to start: open `07-WEEK-PLAN.md` and look at today's date

Don't try to remember everything. The docs are the memory.

---

## A Word on Pacing

The temptation when you finish a session is always to keep pushing. Resist.

Two reasons:

1. **Decision fatigue is real.** The decisions you make in hour 9 are worse than the decisions you made in hour 2.
2. **Apple is the gate.** Even if you crushed every remaining task tonight, you'd be sitting at the gate tomorrow waiting for Apple. Use the time to recharge.

The next 2-3 days are *meant* to be slower. Pace yourself.
