# Plannr — App Store Copy Drafts

Drafts only. Tweak the voice, swap in real screenshots when you have them. Apple has strict character limits, all observed below.

---

## Title (30 char max)

**Plannr: Plan Trips Together**
*(27 chars)*

## Subtitle (30 char max)

**Group trips, one shared plan**
*(30 chars — exactly at limit)*

Alternates if you don't like the above:
- "End the group chat chaos" (24)
- "Stop planning in group chats" (29)
- "For the trip planner friend" (27)

---

## Promotional Text (170 char max — can be edited anytime without re-review)

> Tired of planning trips in 800-message group chats? Plannr is the shared space where your group can dump ideas, vote, and actually agree on a plan.
*(155 chars)*

---

## Description (4,000 char max — but optimize for the first 3 lines)

> **Stop planning trips in your group chat.**
>
> Plannr is the shared space where everyone in your group can dump ideas, vote on the good ones, and build a real itinerary together — without the chaos of a 47-message thread that goes nowhere.
>
> Whether it's a bachelorette in Nashville, a ski weekend in Tahoe, or your family's summer trip, Plannr is built for the moments when one person ends up planning by default — and wishes the rest of the group would just *participate*.
>
> **How it works:**
>
> 1. **Create a board.** One space for the whole trip.
> 2. **Invite your group.** Share a link. Everyone joins in seconds.
> 3. **Dump ideas.** Restaurants, activities, Airbnbs — everyone adds what they want.
> 4. **Vote.** See what the group actually agrees on.
> 5. **Build the plan.** Approved ideas become a checklist and a day-by-day itinerary.
> 6. **Bring it on the trip.** All your reservations, codes, and links in one place everyone can access.
>
> **Plannr is for:**
>
> - The Type-A friend who always ends up planning
> - Bachelorette and bachelor parties
> - Family vacations and reunions
> - Group ski trips, beach trips, and house rentals
> - Honeymoons
> - Birthday weekends, baby showers, anything that needs a plan
>
> **What Plannr doesn't do:**
>
> - No ads. Ever.
> - No chat (your group chat is fine — just make it stop being the planning doc).
> - No booking on our end. We link out to whatever you're using.
>
> **Built by someone who's tired of being the planner.**

*(Word count: ~280 words. Well under the 4,000 char limit. Leaves room to add later.)*

---

## Keywords (100 char max, comma-separated, no spaces)

**Recommended:**
> trip,travel,planner,group,vacation,bachelorette,bachelor,itinerary,checklist,plan
*(86 chars)*

Notes on keyword choices:
- "trip" + "travel" + "planner" cover the core
- "group" / "vacation" cover broader search intent
- "bachelorette" + "bachelor" are high-intent, niche-specific, less competitive
- "itinerary" + "checklist" cover feature-specific searches
- "plan" catches "plan a trip" and similar

Alternates if you want to shift focus:
- Add: "family,honeymoon,reunion,gathering,event"
- Remove: "checklist,plan" if you need room

---

## What's New (for updates — leave blank for v1)

For the launch version, this isn't shown. For v1.1+, use this section to highlight changes:

> **v1.1**
> - Fixed: Avatar colors now consistent across screens
> - Added: Delete account from Profile (required by Apple)
> - Improved: Faster board loading
> - Polished: New onboarding for first-time users

---

## Support URL

**joinplannr.app/support** (or a Notion page hosted at this URL)

Until your real site exists, you can use:
- A simple Notion page made public
- A GitHub Pages site
- Cloudflare Pages (free)
- A Carrd.co page ($19/year)

The page needs:
- A way to email you (a mailto link is fine)
- The privacy policy linked
- Maybe a one-paragraph "what is Plannr" intro

**Minimum viable support page content:**

> # Plannr Support
>
> Got a bug, idea, or question? Email **support@joinplannr.app** (or anthony@joinplannr.app) — I read every message.
>
> Plannr is built by one person, so responses might take a day. Sorry in advance.
>
> [Privacy Policy](link) · [Terms of Use](link)

---

## Marketing URL

Same as Support URL for now: **joinplannr.app**

When you have the bandwidth, this becomes a real landing page with the App Store badge, a 30-second video, and a waitlist signup. For Apple submission, the support URL alone is enough.

---

## Privacy Policy URL

**joinplannr.app/privacy** (or wherever you host it)

The actual privacy policy text is in `03-PRIVACY-POLICY-DRAFT.md`.

---

## Age Rating

**4+ — Made for Everyone**

There's nothing in Plannr that warrants higher. Even though it's positioned for adults planning trips, the content itself is user-generated text and links. No alcohol references in the app UI itself.

If you ever add "trip type: bachelor party" as a category and surface alcohol-related suggestions prominently, this might bump to 12+. Cross that bridge later.

---

## Category

**Primary:** Travel
**Secondary:** Productivity

These two are the right pair. "Travel" covers the trip use cases. "Productivity" covers the "we're planning my apartment redo" or "we're planning a wedding" use cases that fit Plannr but aren't trips.

---

## In-App Purchases

**None at launch.**

The monetization plan (affiliate links on user-pasted booking links) is invisible to users — no IAP, no subscriptions, no tiers. Keep this clean for launch.

---

## Screenshots Strategy (for when you submit)

Apple shows 3-10 screenshots on the App Store. Recommended order:

1. **Hero shot** — the board view with several suggestions visible, voted on. Headline: "Everyone's ideas. One place."
2. **Suggestion + votes** — close up of a single suggestion getting voted up. Headline: "Vote on the good ones."
3. **Checklist view** — populated checklist with assignees. Headline: "Turn ideas into a plan."
4. **Itinerary view** — a beautiful day-by-day schedule. Headline: "Day-of trip? It's all here."
5. **Multi-user / invite** — invite code or share screen. Headline: "Built for groups."
6. **Profile** — your profile with boards listed. Headline: "Plan one. Or twenty."

Make these *after* you've used Plannr for your proposal trip — real content always beats lorem ipsum.

---

## App Review Notes (the "demo account" Apple requires)

Apple needs a way to actually test the app. Provide:

> **Test account:**
> Email: review@joinplannr.app (you create this)
> Password: TestReview2026!
>
> **Notes for reviewer:**
> - This account is already a member of an example board "Bachelorette Weekend" with sample suggestions, checklist, and itinerary.
> - To test invite flow: tap the share button on any board.
> - To test creating a new board: tap the + button on the home screen.
> - Backend: hosted at [your deployed URL], no special setup needed.

You'll write this for real after you deploy the backend and create the test account. Just budgeted for now.
