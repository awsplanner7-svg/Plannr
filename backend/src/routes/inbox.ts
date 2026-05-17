import { Hono } from "hono";
import { prisma } from "../prisma";
import { auth } from "../auth";
import type { InboxData, InboxPendingGroup } from "../types";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// GET /api/inbox — pending approvals for boards user created
app.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const creatorBoards = await prisma.boardMember.findMany({
    where: { userId: user.id, role: "creator" },
    include: { board: { select: { id: true, name: true, type: true } } },
  });

  const creatorBoardIds = creatorBoards.map((m) => m.boardId);
  const boardMap = new Map(creatorBoards.map((m) => [m.boardId, m.board]));

  const pendingSuggestions = creatorBoardIds.length > 0
    ? await prisma.suggestion.findMany({
        where: {
          boardId: { in: creatorBoardIds },
          status: "pending",
          authorId: { not: user.id },
        },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const groupMap = new Map<string, InboxPendingGroup>();
  for (const s of pendingSuggestions) {
    const board = boardMap.get(s.boardId)!;
    if (!groupMap.has(s.boardId)) {
      groupMap.set(s.boardId, {
        boardId: s.boardId,
        boardName: board.name,
        boardType: board.type,
        suggestions: [],
      });
    }
    groupMap.get(s.boardId)!.suggestions.push({
      id: s.id,
      title: s.title,
      authorName: s.author.name,
      createdAt: s.createdAt.toISOString(),
    });
  }

  const data: InboxData = {
    pending: Array.from(groupMap.values()),
    unreadCount: pendingSuggestions.length,
  };

  return c.json({ data });
});

export default app;
