import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { auth } from "../auth";
import type { BoardDetail, BoardSummary } from "../types";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// GET /api/boards — list boards for current user
app.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const memberships = await prisma.boardMember.findMany({
    where: { userId: user.id },
    include: {
      board: {
        include: {
          _count: { select: { suggestions: true, members: true } },
          members: {
            include: { user: { select: { id: true, name: true } } },
            take: 3,
          },
        },
      },
    },
    orderBy: { board: { createdAt: "desc" } },
  });

  const boards: BoardSummary[] = memberships.map((m) => ({
    id: m.board.id,
    name: m.board.name,
    type: m.board.type as any,
    creatorId: m.board.creatorId,
    eventDate: m.board.eventDate ?? null,
    suggestionCount: m.board._count.suggestions,
    memberCount: m.board._count.members,
    members: m.board.members.map((bm) => ({ userId: bm.userId, name: bm.user.name })),
    inviteCode: m.board.inviteCode,
    createdAt: m.board.createdAt.toISOString(),
  }));

  return c.json({ data: boards });
});

// POST /api/boards — create a board
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(100),
      type: z.enum([
        "BACHELOR",
        "MOVING",
        "ENGAGEMENT",
        "WEDDING",
        "HOUSEWARMING",
        "GROUP_TRIP",
        "BABY_SHOWER",
        "BIRTHDAY",
      ]),
      eventDate: z.string().optional().nullable(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const { name, type, eventDate } = c.req.valid("json");

    const board = await prisma.board.create({
      data: {
        name,
        type,
        eventDate: eventDate ?? null,
        creatorId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "creator",
          },
        },
      },
    });

    return c.json({ data: { id: board.id, name: board.name, type: board.type, creatorId: board.creatorId, createdAt: board.createdAt.toISOString() } }, 201);
  }
);

// GET /api/boards/:id — get board detail
app.get("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const boardId = c.req.param("id");

  // Check membership
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });
  if (!membership) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      suggestions: {
        include: {
          author: { select: { id: true, name: true, email: true } },
          votes: { select: { userId: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!board) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  const detail: BoardDetail = {
    id: board.id,
    name: board.name,
    type: board.type as any,
    creatorId: board.creatorId,
    eventDate: board.eventDate ?? null,
    inviteCode: board.inviteCode,
    createdAt: board.createdAt.toISOString(),
    members: board.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      user: m.user,
    })),
    suggestions: board.suggestions.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      description: s.description,
      imageUrl: s.imageUrl,
      type: s.type as any,
      status: s.status as any,
      author: s.author,
      voteCount: s.votes.length,
      userVoted: s.votes.some((v) => v.userId === user.id),
      createdAt: s.createdAt.toISOString(),
    })),
  };

  return c.json({ data: detail });
});

// PATCH /api/boards/:id — update board name/type (creator only)
app.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(100).optional(),
      type: z.enum([
        "BACHELOR",
        "MOVING",
        "ENGAGEMENT",
        "WEDDING",
        "HOUSEWARMING",
        "GROUP_TRIP",
        "BABY_SHOWER",
        "BIRTHDAY",
      ]).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const boardId = c.req.param("id");
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
    if (board.creatorId !== user.id) return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);

    const { name, type } = c.req.valid("json");
    const updated = await prisma.board.update({
      where: { id: boardId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type } : {}),
      },
    });

    return c.json({ data: { id: updated.id, name: updated.name, type: updated.type, creatorId: updated.creatorId, eventDate: updated.eventDate, createdAt: updated.createdAt.toISOString() } });
  }
);

// DELETE /api/boards/:id — delete a board (creator only)
app.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const boardId = c.req.param("id");

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  if (board.creatorId !== user.id) return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);

  await prisma.board.delete({ where: { id: boardId } });
  return c.body(null, 204);
});

export default app;
