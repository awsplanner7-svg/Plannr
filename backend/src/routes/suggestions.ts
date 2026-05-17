import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { auth } from "../auth";
import { env } from "../env";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// GET /api/boards/:boardId/suggestions
app.get("/boards/:boardId/suggestions", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const boardId = c.req.param("boardId");

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });
  if (!membership) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  const suggestions = await prisma.suggestion.findMany({
    where: { boardId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      votes: { select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({
    data: suggestions.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      description: s.description,
      imageUrl: s.imageUrl,
      type: s.type,
      status: s.status,
      author: s.author,
      voteCount: s.votes.length,
      userVoted: s.votes.some((v) => v.userId === user.id),
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

// POST /api/boards/:boardId/suggestions
app.post(
  "/boards/:boardId/suggestions",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(200),
      url: z.string().url().optional().or(z.literal("")),
      description: z.string().max(500).optional(),
      type: z.enum(["product", "experience"]).default("product"),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const boardId = c.req.param("boardId");
    const { title, url, description, type } = c.req.valid("json");

    const membership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: user.id } },
    });
    if (!membership) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

    const suggestion = await prisma.suggestion.create({
      data: {
        boardId,
        authorId: user.id,
        title,
        url: url || null,
        description: description || null,
        type,
        status: "pending",
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return c.json({
      data: {
        id: suggestion.id,
        title: suggestion.title,
        url: suggestion.url,
        description: suggestion.description,
        imageUrl: suggestion.imageUrl,
        type: suggestion.type,
        status: suggestion.status,
        author: suggestion.author,
        voteCount: 0,
        userVoted: false,
        createdAt: suggestion.createdAt.toISOString(),
      },
    }, 201);
  }
);

// PATCH /api/suggestions/:id — approve or decline (board creator only)
app.patch(
  "/suggestions/:id",
  zValidator("json", z.object({ status: z.enum(["approved", "declined"]) })),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const suggestionId = c.req.param("id");
    const { status } = c.req.valid("json");

    const suggestion = await prisma.suggestion.findUnique({
      where: { id: suggestionId },
      include: { board: true },
    });

    if (!suggestion) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
    if (suggestion.board.creatorId !== user.id) {
      return c.json({ error: { message: "Only the board creator can approve or decline suggestions", code: "FORBIDDEN" } }, 403);
    }

    const updated = await prisma.suggestion.update({
      where: { id: suggestionId },
      data: { status },
      include: {
        author: { select: { id: true, name: true, email: true } },
        votes: { select: { userId: true } },
      },
    });

    return c.json({
      data: {
        id: updated.id,
        title: updated.title,
        url: updated.url,
        description: updated.description,
        imageUrl: updated.imageUrl,
        type: updated.type,
        status: updated.status,
        author: updated.author,
        voteCount: updated.votes.length,
        userVoted: updated.votes.some((v) => v.userId === user.id),
        createdAt: updated.createdAt.toISOString(),
      },
    });
  }
);

// PATCH /api/suggestions/:id/url — add or update suggestion URL (any board member)
app.patch(
  "/suggestions/:id/url",
  zValidator("json", z.object({ url: z.string().url().nullable() })),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const suggestionId = c.req.param("id");
    const { url } = c.req.valid("json");

    const suggestion = await prisma.suggestion.findUnique({
      where: { id: suggestionId },
      select: { boardId: true },
    });
    if (!suggestion) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

    // Any board member can add a link
    const membership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: suggestion.boardId, userId: user.id } },
    });
    if (!membership) return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);

    // Apply Skimlinks conversion if configured
    let finalUrl = url;
    if (finalUrl) {
      const publisherId = env.SKIMLINKS_PUBLISHER_ID;
      if (publisherId) {
        finalUrl = `https://go.skimresources.com/?id=${publisherId}&url=${encodeURIComponent(finalUrl)}`;
      }
    }

    const updated = await prisma.suggestion.update({
      where: { id: suggestionId },
      data: { url: finalUrl },
      include: {
        author: { select: { id: true, name: true, email: true } },
        votes: { select: { userId: true } },
      },
    });

    return c.json({
      data: {
        id: updated.id,
        title: updated.title,
        url: updated.url,
        description: updated.description,
        imageUrl: updated.imageUrl,
        type: updated.type,
        status: updated.status,
        author: updated.author,
        voteCount: updated.votes.length,
        userVoted: updated.votes.some((v) => v.userId === user.id),
        createdAt: updated.createdAt.toISOString(),
      },
    });
  }
);

export default app;
