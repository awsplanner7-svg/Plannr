import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { auth } from "../auth";
import { env } from "../env";
import type { ItineraryDayDTO, ItineraryItemDTO, ItineraryCategory } from "../types";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

const lastEditedBySelect = { id: true, name: true } as const;

function convertToAffiliateUrl(url: string): string {
  const publisherId = env.SKIMLINKS_PUBLISHER_ID;
  if (!publisherId || !url) return url;
  return `https://go.skimresources.com/?id=${publisherId}&url=${encodeURIComponent(url)}`;
}

async function isBoardMember(boardId: string, userId: string): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  return membership !== null;
}

async function getBoardCreatorId(boardId: string): Promise<string | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { creatorId: true },
  });
  return board?.creatorId ?? null;
}

function itemToDTO(item: {
  id: string;
  dayId: string;
  boardId: string;
  time: string | null;
  title: string;
  description: string | null;
  link: string | null;
  location: string | null;
  category: string;
  order: number;
  suggestionId: string | null;
  lastEditedBy: { id: string; name: string } | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): ItineraryItemDTO {
  return {
    id: item.id,
    dayId: item.dayId,
    boardId: item.boardId,
    time: item.time,
    title: item.title,
    description: item.description,
    link: item.link,
    location: item.location,
    category: item.category as ItineraryCategory,
    order: item.order,
    suggestionId: item.suggestionId,
    lastEditedBy: item.lastEditedBy,
    createdById: item.createdById,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function dayToDTO(day: {
  id: string;
  boardId: string;
  date: string | null;
  label: string | null;
  dayNumber: number;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    dayId: string;
    boardId: string;
    time: string | null;
    title: string;
    description: string | null;
    link: string | null;
    location: string | null;
    category: string;
    order: number;
    suggestionId: string | null;
    lastEditedBy: { id: string; name: string } | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): ItineraryDayDTO {
  return {
    id: day.id,
    boardId: day.boardId,
    date: day.date,
    label: day.label,
    dayNumber: day.dayNumber,
    items: day.items.map(itemToDTO),
    createdAt: day.createdAt.toISOString(),
    updatedAt: day.updatedAt.toISOString(),
  };
}

const itemInclude = {
  lastEditedBy: { select: lastEditedBySelect },
} as const;

// GET /api/boards/:boardId/itinerary
app.get("/boards/:boardId/itinerary", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const boardId = c.req.param("boardId");

  const member = await isBoardMember(boardId, user.id);
  if (!member) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  const days = await prisma.itineraryDay.findMany({
    where: { boardId },
    orderBy: { dayNumber: "asc" },
    include: {
      items: {
        include: itemInclude,
        orderBy: [{ order: "asc" }, { time: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  return c.json({ data: days.map(dayToDTO) });
});

// POST /api/boards/:boardId/itinerary/days
app.post(
  "/boards/:boardId/itinerary/days",
  zValidator(
    "json",
    z.object({
      dayNumber: z.number().int().positive(),
      date: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const boardId = c.req.param("boardId");
    const { dayNumber, date } = c.req.valid("json");

    const member = await isBoardMember(boardId, user.id);
    if (!member) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

    const existing = await prisma.itineraryDay.findFirst({
      where: { boardId, dayNumber },
    });
    if (existing) {
      return c.json(
        { error: { message: "Day number already exists for this board", code: "CONFLICT" } },
        409
      );
    }

    const day = await prisma.itineraryDay.create({
      data: {
        boardId,
        dayNumber,
        date: date ?? null,
      },
      include: {
        items: {
          include: itemInclude,
        },
      },
    });

    return c.json({ data: dayToDTO(day) }, 201);
  }
);

// DELETE /api/itinerary/days/:dayId
app.delete("/itinerary/days/:dayId", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const dayId = c.req.param("dayId");

  const day = await prisma.itineraryDay.findUnique({
    where: { id: dayId },
    select: { boardId: true },
  });
  if (!day) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  const creatorId = await getBoardCreatorId(day.boardId);
  if (creatorId !== user.id) {
    return c.json(
      { error: { message: "Only the board creator can delete itinerary days", code: "FORBIDDEN" } },
      403
    );
  }

  await prisma.itineraryDay.delete({ where: { id: dayId } });

  return new Response(null, { status: 204 });
});

// PATCH /api/itinerary/days/:dayId
app.patch(
  "/itinerary/days/:dayId",
  zValidator(
    "json",
    z.object({
      label: z.string().nullable().optional(),
      date: z.string().nullable().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const dayId = c.req.param("dayId");
    const body = c.req.valid("json");

    const day = await prisma.itineraryDay.findUnique({
      where: { id: dayId },
      select: { boardId: true },
    });
    if (!day) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

    const member = await isBoardMember(day.boardId, user.id);
    if (!member) return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);

    const updated = await prisma.itineraryDay.update({
      where: { id: dayId },
      data: {
        ...(body.label !== undefined && { label: body.label }),
        ...(body.date !== undefined && { date: body.date }),
      },
      include: {
        items: {
          include: itemInclude,
          orderBy: [{ order: "asc" }, { time: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return c.json({ data: dayToDTO(updated) });
  }
);

// POST /api/itinerary/days/:dayId/reorder
app.post(
  "/itinerary/days/:dayId/reorder",
  zValidator(
    "json",
    z.object({
      itemIds: z.array(z.string()),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const dayId = c.req.param("dayId");
    const { itemIds } = c.req.valid("json");

    const day = await prisma.itineraryDay.findUnique({
      where: { id: dayId },
      select: { boardId: true },
    });
    if (!day) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

    const member = await isBoardMember(day.boardId, user.id);
    if (!member) return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);

    // Update order for each item
    await Promise.all(
      itemIds.map((id, index) =>
        prisma.itineraryItem.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return c.json({ data: { ok: true } });
  }
);

// POST /api/itinerary/days/:dayId/items
app.post(
  "/itinerary/days/:dayId/items",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(500),
      time: z.string().optional(),
      description: z.string().optional(),
      link: z.string().url().optional().or(z.literal("")).transform((v) => v || null).optional(),
      location: z.string().optional(),
      category: z.enum(["food", "activity", "travel", "stay", "other"]).optional(),
      suggestionId: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const dayId = c.req.param("dayId");
    const body = c.req.valid("json");

    const day = await prisma.itineraryDay.findUnique({
      where: { id: dayId },
      select: { boardId: true },
    });
    if (!day) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

    const member = await isBoardMember(day.boardId, user.id);
    if (!member) return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);

    const item = await prisma.itineraryItem.create({
      data: {
        dayId,
        boardId: day.boardId,
        title: body.title,
        time: body.time ?? null,
        description: body.description ?? null,
        link: body.link ? convertToAffiliateUrl(body.link) : null,
        location: body.location ?? null,
        category: body.category ?? "other",
        suggestionId: body.suggestionId ?? null,
        createdById: user.id,
        lastEditedById: user.id,
      },
      include: itemInclude,
    });

    return c.json({ data: itemToDTO(item) }, 201);
  }
);

// PATCH /api/itinerary/items/:itemId
app.patch(
  "/itinerary/items/:itemId",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(500).optional(),
      time: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      link: z.string().url().nullable().optional().or(z.literal("")).transform((v) => v === "" ? null : v).optional(),
      location: z.string().nullable().optional(),
      category: z.enum(["food", "activity", "travel", "stay", "other"]).optional(),
      order: z.number().int().min(0).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const itemId = c.req.param("itemId");
    const body = c.req.valid("json");

    const existing = await prisma.itineraryItem.findUnique({
      where: { id: itemId },
      select: { boardId: true },
    });
    if (!existing) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

    const member = await isBoardMember(existing.boardId, user.id);
    if (!member) return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);

    const updated = await prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.time !== undefined && { time: body.time }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.link !== undefined && { link: body.link ? convertToAffiliateUrl(body.link) : null }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.order !== undefined && { order: body.order }),
        lastEditedById: user.id,
      },
      include: itemInclude,
    });

    return c.json({ data: itemToDTO(updated) });
  }
);

// DELETE /api/itinerary/items/:itemId
app.delete("/itinerary/items/:itemId", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const itemId = c.req.param("itemId");

  const existing = await prisma.itineraryItem.findUnique({
    where: { id: itemId },
    select: { boardId: true },
  });
  if (!existing) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  const member = await isBoardMember(existing.boardId, user.id);
  if (!member) return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);

  await prisma.itineraryItem.delete({ where: { id: itemId } });

  return new Response(null, { status: 204 });
});

export default app;
