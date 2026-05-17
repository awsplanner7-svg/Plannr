import { Hono } from "hono";
import { prisma } from "../prisma";
import { auth } from "../auth";
import type { ActivityItem } from "../types";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// GET /api/activity — recent activity across all user's boards
app.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const memberships = await prisma.boardMember.findMany({
    where: { userId: user.id },
    include: { board: { select: { id: true, name: true, type: true } } },
  });

  const boardIds = memberships.map((m) => m.boardId);
  if (boardIds.length === 0) return c.json({ data: [] });

  const boardMap = new Map(memberships.map((m) => [m.boardId, m.board]));

  const suggestions = await prisma.suggestion.findMany({
    where: { boardId: { in: boardIds } },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  const activity: ActivityItem[] = suggestions.map((s) => {
    const board = boardMap.get(s.boardId)!;
    return {
      id: s.id,
      actorId: s.authorId,
      actorName: s.author.name,
      action: s.status === "pending" ? "suggested" : (s.status as "approved" | "declined"),
      itemTitle: s.title,
      boardId: s.boardId,
      boardName: board.name,
      boardType: board.type,
      createdAt: s.updatedAt.toISOString(),
    };
  });

  return c.json({ data: activity });
});

export default app;
