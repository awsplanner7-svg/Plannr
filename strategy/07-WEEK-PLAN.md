# Plannr — The Next 7 Days

Realistic day-by-day plan. Each day has a "must do" (non-negotiable, ~30-60 min) and a "if-energy" (nice to do). Adjust based on when Apple Developer approves.

---

## Saturday (Today)

You've already done a LOT today. Pre-coffee finish line for today:

**Must do (when you're back from coffee):**
- Already done: bought joinplannr.app, claimed @joinplannr on TikTok
- Lock down TikTok privacy settings (Profile → Settings → Privacy → turn OFF all discoverability)
- Claim @joinplannr on Instagram, YouTube, X (10 min total — same drill, same privacy lockdown)
- Set bios on all four using `04-SOCIAL-BIOS.md`

**If-energy:**
- Generate v1 app icon using `06-APP-ICON-BRIEF.md` (30 min)
- Set the same icon as profile photo across all four social accounts

**Definitely DON'T do today:**
- More Claude Code work
- More Expo Go debugging
- Start filming TikToks (your accounts aren't even fully set up)
- Backend deployment

---

## Sunday

Lower-energy day. Logistics and infrastructure.

**Must do:**
- Set up Cloudflare Email Routing (free) so `anthony@joinplannr.app` forwards to `aws.planner7@gmail.com`. 10 min.
 - Cloudflare account → Add joinplannr.app domain → Email tab → enable Email Routing → add catch-all forwarding rule
- Create a free Notion account if you don't have one
- Create a public Notion page for the privacy policy. Paste in content from `03-PRIVACY-POLICY-DRAFT.md` (fill in the [DATE] and [your address] placeholders). Make page public.
- In Cloudflare DNS, set up the domain so joinplannr.app/privacy redirects to that Notion page (or just use the Notion URL directly in the policy for now)
- Create matching support page

**If-energy:**
- Read `01-PRODUCT-BRIEF.md` and `00-ROADMAP.md` carefully. Edit anything that doesn't sound like YOU. These docs need to be in your voice.

---

## Monday

Backend research day. Low coding, mostly reading.

**Must do:**
- Sign up for **Railway** at railway.app (free tier exists)
- Read Railway's docs on deploying a Bun + Hono app (~30 min)
- Make a list in `~/projects/plannr/DEPLOYMENT-PLAN.md` of:
 - What env vars need to be set
 - How SQLite will work in production (you'll likely need to migrate to PostgreSQL eventually — Railway makes this easy)
 - What URL the backend will live at
 - What needs to change in the mobile app's `.env` file

**If-energy:**
- Apple Developer status check — if approved, START Tuesday's work today
- Take a screenshot of every Plannr screen on iPhone (will become real App Store screenshots later)

---

## Tuesday

Status check day. Adapt based on Apple.

**If Apple Developer is APPROVED:**
- Open Claude Code, get a plan together for setting up EAS Build + a dev build
- Goal: have Plannr installable on your phone via TestFlight by end of day
- This is a real 3-4 hour project — block the time

**If Apple Developer is NOT YET approved:**
- Time to film. Pick 1 post from `05-CONTENT-IDEAS.md` (Post 13 or Post 2 are easiest)
- Film, edit, post on @joinplannr TikTok
- The goal is NOT a viral post. The goal is "I have published something." Account no longer empty.

---

## Wednesday

**If Apple approved earlier this week:**
- Mobile UI for the leave/remove/rotate endpoints (the work we deferred). Claude Code can knock this out in 90 min.
- Delete account flow (Apple blocker)
- Pre-fill a "Bachelorette Weekend" sample board on a test account for Apple reviewers

**If still waiting on Apple:**
- Second TikTok post (one a day, build the rhythm)
- App icon if you didn't do it Saturday
- Generate App Store screenshots (use a free tool — search "App Store screenshot generator")

---

## Thursday

**If Apple approved:**
- Deploy backend to Railway. Real production URL.
- Update mobile app `.env.production` to point at it
- First test build through TestFlight to your own phone

**If still waiting:**
- Third TikTok post
- Polish the product brief with your edits

---

## Friday

**If you've made it to TestFlight by now:**
- Test EVERYTHING on TestFlight install:
 - Sign up flow as if you've never used Plannr
 - Create a board
 - Invite via real text/email
 - Verify another iPhone can join the board
 - Run through the test scenario we did on Saturday (steps 1-9) but using the actual UI now
- Fix the most egregious 2-3 things you find
- Don't invite friends yet — you're testing

**Otherwise:**
- Fourth TikTok post
- Apple status check (start polite follow-up if it's been a week)

---

## Saturday (one week from today)

The ideal outcome:
- Plannr on TestFlight, installed on your phone, working
- 4-5 TikTok posts published
- Privacy policy live
- Backend deployed
- App icon picked
- Ready to invite 3-5 friends to TestFlight next week

The realistic outcome:
- Apple maybe approved, maybe not
- Some content posted
- A bunch of infrastructure done
- One major blocker remaining

Both are fine. Don't beat yourself up if it's the realistic version.

---

## Daily Rituals (no matter what)

These are 5-min habits that compound:

1. **Morning: open TikTok** for 5 min and study (don't just consume) accounts in the @joinplannr feed
2. **Open `00-ROADMAP.md`** once a day — even just to glance. Keeps the goal in your face.
3. **Note ONE thing** in a `LEARNINGS.md` file you create. Could be a bug you found, a TikTok format you saw, a feature request from your future self. Future-Anthony will thank you.
4. **Don't open Claude Code** unless you have a clear task. "Just see what we could fix" leads to 3-hour rabbit holes.

---

## Anti-Goals for the Week

Things to actively NOT do:

- Don't refactor anything. Code quality is fine.
- Don't add features that weren't already on the list
- Don't spend more than 30 min on any single TikTok post
- Don't compare your account to accounts with 100k followers
- Don't apologize for a slow week — Apple is the bottleneck
- Don't try to fix more than one bug per session
- Don't make new accounts on platforms not on the list (LinkedIn, Threads, BlueSky can wait)
