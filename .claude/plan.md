# Suggestion Box — Core MVP Implementation Plan

## Overview
Build a social planning app with boards, suggestions, voting, and email/password auth.
Stack: Prisma + Better Auth (email/password) on backend, Expo Router with custom design on mobile.

---

## Phase 1: Backend — Database, Auth, and API Routes

### 1a. Install packages
```bash
cd backend && bun add better-auth @better-auth/expo @prisma/client@6 @hono/zod-validator && bun add -d prisma@6
```

### 1b. Prisma schema (`backend/prisma/schema.prisma`)
Better Auth base models + app models:

```
User        — id, name, email, emailVerified, image, createdAt, updatedAt
Session     — Better Auth
Account     — Better Auth
Verification — Better Auth
Board       — id, name, type (string), creatorId, createdAt, updatedAt
BoardMember — id, boardId, userId, role ("creator"|"member"), @@unique([boardId,userId])
Suggestion  — id, boardId, authorId, title, url?, description?, imageUrl?, type ("product"|"experience"), status ("pending"|"approved"|"declined"), createdAt, updatedAt
Vote        — id, suggestionId, userId, @@unique([suggestionId,userId])
```

User model gets relations: boards (Board[]), memberships (BoardMember[]), suggestions (Suggestion[]), votes (Vote[])

### 1c. Environment setup
- Add DATABASE_URL to backend/.env
- Add BETTER_AUTH_SECRET to backend/.env
- Update backend/src/env.ts with DATABASE_URL, BETTER_AUTH_SECRET

### 1d. Create backend/src/prisma.ts
Standard PrismaClient with SQLite pragmas (WAL, foreign_keys, busy_timeout).

### 1e. Create backend/src/auth.ts
Better Auth with:
- email/password auth (built-in, no extra plugin needed)
- expo() plugin
- All required trustedOrigins including "vibecode://*/*" and "exp://*/*"
- advanced: { trustedProxyHeaders, disableCSRFCheck, defaultCookieAttributes: sameSite:"none", secure:true, partitioned:true }
- baseURL: env.BACKEND_URL

### 1f. Update backend/src/index.ts
- Typed Hono app with Variables: { user, session }
- Auth middleware that calls auth.api.getSession() on every request
- Mount auth handler: app.on(["GET","POST"], "/api/auth/*", ...)
- Mount new routes

### 1g. Create backend/src/routes/boards.ts
```
GET  /api/boards         — list boards where user is creator or member
POST /api/boards         — create board + add creator as BoardMember with role:"creator"
GET  /api/boards/:id     — get board with members, suggestions (with vote counts), current user's votes
```

### 1h. Create backend/src/routes/suggestions.ts
```
GET  /api/boards/:boardId/suggestions  — list suggestions (with voteCount, userVoted)
POST /api/boards/:boardId/suggestions  — create suggestion (status: "pending")
PATCH /api/suggestions/:id             — update status (approve/decline) — board creator only
```

### 1i. Create backend/src/routes/votes.ts
```
POST /api/suggestions/:id/vote — toggle vote (add if not voted, remove if voted)
Returns: { voted: boolean, voteCount: number }
```

### 1j. Create backend/src/types.ts
Shared TypeScript types for frontend consumption.

### 1k. Generate and push database
```bash
cd backend && bunx prisma generate && bunx prisma db push
```

---

## Phase 2: Mobile — Design System + Auth

### 2a. Install packages
```bash
cd mobile && bun add better-auth @better-auth/expo @expo-google-fonts/fraunces @expo-google-fonts/dm-sans expo-font
```

### 2b. Create theme constants (`mobile/src/lib/theme.ts`)
- Board type color map (bg + text for each of 8 types)
- Board type labels and filter categories
- Shared spacing/radius constants

### 2c. Create auth files
- `mobile/src/lib/auth/auth-client.ts` — Better Auth client with expoClient plugin, email/password (no OTP)
- `mobile/src/lib/auth/use-session.ts` — React Query wrapper around authClient.getSession()

### 2d. Update `mobile/src/lib/api/api.ts`
Add Cookie: authClient.getCookie() header to all requests.

### 2e. Restructure navigation
- Delete `mobile/src/app/(tabs)/`
- Create `mobile/src/app/(app)/` directory
- Update `mobile/src/app/_layout.tsx`:
  - Load Fraunces + DM Sans fonts via useFonts
  - Use Stack.Protected guards based on useSession()
  - Protected: (app) screens
  - Public: sign-in screen

### 2f. Create auth screen (`mobile/src/app/sign-in.tsx`)
Single screen with Name/Email/Password fields.
- "Sign in" / "Sign up" toggle
- Fraunces title, DM Sans inputs
- Background #FAF9F6
- Black primary button
- Calls authClient.signIn.email() or authClient.signUp.email()
- Invalidates session on success

---

## Phase 3: Mobile — App Screens

### 3a. `mobile/src/app/(app)/_layout.tsx`
Bottom tab navigator with 4 tabs:
- Boards (home icon)
- Timeline (clock icon) — placeholder
- Inbox (bell icon) — placeholder
- Profile (user icon)

Tab bar style: white bg, #1a1a1a active, #999 inactive, no border-top shadow.

### 3b. `mobile/src/app/(app)/index.tsx` — Boards List
- Header: "Suggestion Box" in Fraunces italic
- "+" FAB button → navigates to /create-board
- Board cards with:
  - Board name in Fraunces
  - Board type pill (colored per type)
  - Teardrop corner accent (SVG, top-right, board type color)
  - Suggestion count + member count
  - Tap → navigate to /board/[id]
- Empty state when no boards

### 3c. `mobile/src/app/(app)/create-board.tsx` — Create Board Modal
- Stack screen presented as modal
- Text input for board name
- Grid of board type chips to select type
- Each chip shows type color + label
- "Create board" button
- POST /api/boards

### 3d. `mobile/src/app/(app)/board/[id].tsx` — Board Detail
Main screen. Sections:
1. Header with board name (Fraunces), type pill, member count
2. Filter tab bar (categories adapt per board type)
3. "Top Voted" section — approved suggestions sorted by votes
4. "Pending Approval" section — pending suggestions (visible to creator for approve/decline, visible to all for context)
5. "Add suggestion" FAB → /board/[id]/add-suggestion

**Suggestion Card (approved):**
- White card, 18px radius, 1px #EBEBEB border
- Title (DM Sans semibold)
- Author avatar (colored circle + initials) + name
- Vote count + upvote button (outlined when not voted, filled black when voted)
- "Shop now" or "Book now" button → opens google.com placeholder

**Suggestion Card (pending — creator view):**
- Amber tint bg #FFFDF7, border #FAC775
- Title + author
- Inline Approve button (green outlined) + Decline button (red outlined)
- PATCH /api/suggestions/:id

**Upvote interaction:**
- POST /api/suggestions/:id/vote (toggles)
- Optimistic UI update

### 3e. `mobile/src/app/(app)/board/[id]/add-suggestion.tsx` — Add Suggestion
- Stack screen as modal
- Fields: Title, URL (optional), Description (optional)
- Suggestion type toggle: "Product" | "Experience"
- POST /api/boards/:boardId/suggestions

### 3f. `mobile/src/app/(app)/profile.tsx` — Profile
- User avatar (large colored circle + initials)
- Name + email
- "Sign out" button → authClient.signOut() + invalidateSession()

### 3g. `mobile/src/app/(app)/timeline.tsx` and `inbox.tsx`
Simple placeholder screens with title and "Coming soon" message.

---

## Shared Types (backend/src/types.ts)
```typescript
export type BoardType = "BACHELOR" | "MOVING" | "ENGAGEMENT" | "WEDDING" | "HOUSEWARMING" | "GROUP_TRIP" | "BABY_SHOWER" | "BIRTHDAY"
export type SuggestionStatus = "pending" | "approved" | "declined"
export type SuggestionType = "product" | "experience"

export interface BoardSummary { id, name, type, creatorId, suggestionCount, memberCount }
export interface BoardDetail { id, name, type, creatorId, members, suggestions: SuggestionWithVotes[] }
export interface SuggestionWithVotes { id, title, url, description, type, status, author: {id,name}, voteCount, userVoted, createdAt }
```

---

## Implementation Order

1. **Backend agent**: Steps 1a–1k (install, schema, auth, routes, db push)
2. **Mobile agent**: Steps 2a–3g (install, theme, auth, all screens)

These run in parallel — mobile can be built against the API spec in types.ts.

---

## Design Notes

**Fonts:**
- `Fraunces_700Bold_Italic` for all headings, board names, app title
- `DMSans_400Regular`, `DMSans_500Medium`, `DMSans_600SemiBold` for UI text

**Board type color map:**
```
BACHELOR:    { bg: "#FAEEDA", text: "#854F0B", label: "Bachelor / Bachelorette" }
MOVING:      { bg: "#EAF3DE", text: "#3B6D11", label: "Moving / New Home" }
ENGAGEMENT:  { bg: "#FBEAF0", text: "#993556", label: "Engagement Party" }
WEDDING:     { bg: "#EEEDFE", text: "#534AB7", label: "Wedding" }
HOUSEWARMING:{ bg: "#EAF3DE", text: "#3B6D11", label: "Housewarming" }
GROUP_TRIP:  { bg: "#E6F1FB", text: "#185FA5", label: "Group Trip" }
BABY_SHOWER: { bg: "#FAECE7", text: "#993C1D", label: "Baby Shower" }
BIRTHDAY:    { bg: "#EEEDFE", text: "#534AB7", label: "Birthday" }
```

**Filter tabs by board type:**
```
BACHELOR/BACHELORETTE: ["All", "Experiences", "Stays", "Dining"]
MOVING/HOUSEWARMING:   ["All", "Furniture", "Kitchen", "Decor"]
ENGAGEMENT/WEDDING:    ["All", "Venues", "Flowers", "Gifts"]
GROUP_TRIP:            ["All", "Hotels", "Activities", "Restaurants"]
BABY_SHOWER:           ["All", "Gear", "Clothes", "Toys"]
BIRTHDAY:              ["All", "Experiences", "Venues", "Stays"]
```
