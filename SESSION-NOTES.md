# Plannr — Session Notes

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
