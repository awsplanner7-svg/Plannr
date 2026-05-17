import { Hono } from "hono";
import { prisma } from "../prisma";
import { auth } from "../auth";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// POST /api/suggestions/:id/vote — toggle vote
app.post("/suggestions/:id/vote", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const suggestionId = c.req.param("id");

  const suggestion = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
    include: { board: true },
  });
  if (!suggestion) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  // Check board membership
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: suggestion.boardId, userId: user.id } },
  });
  if (!membership) return c.json({ error: { message: "Not a member of this board", code: "FORBIDDEN" } }, 403);

  const existingVote = await prisma.vote.findUnique({
    where: { suggestionId_userId: { suggestionId, userId: user.id } },
  });

  if (existingVote) {
    await prisma.vote.delete({ where: { id: existingVote.id } });
  } else {
    await prisma.vote.create({ data: { suggestionId, userId: user.id } });
  }

  const voteCount = await prisma.vote.count({ where: { suggestionId } });

  return c.json({ data: { voted: !existingVote, voteCount } });
});

export default app;
