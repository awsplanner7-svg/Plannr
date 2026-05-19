# Plannr — Master Roadmap

**Last updated:** May 17, 2026 (drafted during your coffee break)
**Owner:** Anthony
**Domain:** joinplannr.app
**Social:** @joinplannr (TikTok claimed; IG/YT/X pending)

---

## The Goal

Ship Plannr to your families via TestFlight for the **August proposal trip**.
Wider TestFlight (~10 people) within ~1 week of Apple Developer approval.
Public App Store launch after the proposal trip, leveraging trip footage and family testimonials.

## The One-Sentence Pitch

> Plannr is the group trip app that turns chaotic 800-message group chats into one shared plan everyone can actually follow.

## The North Star

**The Type-A organizer hands their group Plannr and feels like a hero.** Every product, marketing, and prioritization decision should serve that moment. If a feature doesn't make the planner's life easier or the participants' input simpler, it can wait.

---

## Three Horizons

### Horizon 1 — Pre-Launch (now → August)
**Mission:** Apple-ready app + real-world battle test with proposal trip.

- Apple Developer approval (waiting)
- Dev build working on your phone
- Critical Apple blockers (delete account, privacy policy, support URL)
- Backend deployed publicly
- Mobile UI for the leave/remove/rotate endpoints
- TestFlight to family (5 people) + 5 friends
- Real-world use during the August proposal trip
- Bug fixes from real feedback

### Horizon 2 — Public Launch (Aug-Oct)
**Mission:** App Store launch with momentum from the proposal trip.

- App Store submission with screenshots from the real trip
- Family testimonials integrated into App Store + TikTok
- Activity feed feature (shelved item — finally built)
- Comments on suggestions (your families will demand this)
- App icon polish + branding pass
- TikTok account established with 10+ posts and some traction
- 50-200 users from organic + invited groups

### Horizon 3 — Network Effects (Oct+)
**Mission:** Make Plannr defensible.

- **Public boards** — the long-term moat (people planning a trip to a city can see what other groups did)
- Split-wise-style cost tracking
- Affiliate/referral monetization on the links users are already pasting (Airbnb, Booking, OpenTable, etc.)
- Comments threads
- Real onboarding redesign for new users without invites

---

## What We Are NOT Doing (Scope Discipline)

- **Booking on behalf of users** — keep clean by passing them to external services
- **Chat / messaging between members** — comments on items are enough
- **Solo trip planning** — the product is built around groups
- **Discovery feed** — let public boards do this organically in Horizon 3
- **Payment splitting** — Horizon 3 only
- **Animations and micro-interactions** — polish, not foundation
- **Refactoring the 4,400-line board screen** — too risky pre-launch; revisit after public launch

---

## Top 3 Risks

1. **Apple Developer approval drags >7 days.** Timeline slips. Mitigation: do all prep work in parallel so the day approval lands we sprint cleanly. Apple itself is the only thing not in your control.
2. **Expo Go can't run Plannr.** Already known — pivoted. Will require dev build (EAS) once Apple approves. Adds ~3-4 hours of setup but is the right path anyway.
3. **Family doesn't actually use it during the trip.** They install it, planning happens in the chat anyway. Mitigation: you populate the board with real content first, send a single share link, make it impossible to ignore. The "planner does the work, others react" model is the entire pitch.

---

## How Decisions Get Made

- **Apple-blocking >** everything else
- **Real users will hit this in week 1 >** "would be nice"
- **Polish that's invisible to friends >** save for after launch
- **Feature creep >** kill on sight until Horizon 2

When unsure, ask: *"Will this matter for the August proposal trip?"* If no, defer.

---

*This roadmap will change. That's normal. Update it when reality demands it, not when feelings do.*
