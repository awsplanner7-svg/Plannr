import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { auth } from "../auth";
import { env } from "../env";
import type { ChecklistItemDTO } from "../types";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

function detectCategory(title: string, link?: string): string {
  const text = `${title} ${link ?? ""}`.toLowerCase();
  if (/airbnb|hotel|vrbo|hostel|resort|villa|\bstay\b|accommodation|lodge|rental|house|apartment/.test(text)) return "lodging";
  if (/beach|boat|cruise|golf|hike|kayak|surf|\btour\b|activity|experience|adventure|club|\bbar\b|nightlife|show|concert|\bgame\b|sport/.test(text)) return "activities";
  if (/restaurant|dinner|lunch|brunch|cafe|\bbar\b|food|\beat\b|drinks|reservation|opentable|yelp|resy/.test(text)) return "food_drink";
  if (/flight|\bcar\b|uber|lyft|rental|drive|shuttle|train|\bbus\b|ferry|transfer/.test(text)) return "transport";
  if (/amazon|wayfair|ikea|target|store|\bbuy\b|\bshop\b|purchase/.test(text)) return "shopping";
  return "other";
}

function convertToAffiliateUrl(url: string): string {
  const publisherId = env.SKIMLINKS_PUBLISHER_ID;
  if (!publisherId || !url) return url;
  return `https://go.skimresources.com/?id=${publisherId}&url=${encodeURIComponent(url)}`;
}

function toDTO(item: {
  id: string;
  boardId: string;
  title: string;
  link: string | null;
  description: string | null;
  category: string;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  status: string;
  completed: boolean;
  suggestionId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): ChecklistItemDTO {
  return {
    id: item.id,
    boardId: item.boardId,
    title: item.title,
    link: item.link,
    description: item.description,
    category: item.category,
    assigneeId: item.assigneeId,
    assignee: item.assignee,
    status: item.status as ChecklistItemDTO["status"],
    completed: item.completed,
    suggestionId: item.suggestionId,
    createdById: item.createdById,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

const assigneeSelect = { id: true, name: true, email: true } as const;

// GET /api/boards/:boardId/checklist
app.get("/boards/:boardId/checklist", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const boardId = c.req.param("boardId");

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });
  if (!membership) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  const items = await prisma.checklistItem.findMany({
    where: { boardId },
    include: { assignee: { select: assigneeSelect } },
    orderBy: { createdAt: "asc" },
  });

  return c.json({ data: items.map(toDTO) });
});

// POST /api/boards/:boardId/checklist
app.post(
  "/boards/:boardId/checklist",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      link: z.string().url().optional().or(z.literal("")).transform((v) => v || null).optional(),
      assigneeId: z.string().optional(),
      suggestionId: z.string().optional(),
      category: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const boardId = c.req.param("boardId");
    const { title, description, link, assigneeId, suggestionId, category } = c.req.valid("json");

    const membership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: user.id } },
    });
    if (!membership) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

    // Carry over suggestion link + description if creating from a suggestion
    let resolvedLink = link ?? null;
    let resolvedDescription = description ?? null;
    if (suggestionId) {
      const suggestion = await prisma.suggestion.findUnique({ where: { id: suggestionId } });
      if (suggestion) {
        if (resolvedLink === null && suggestion.url) resolvedLink = suggestion.url;
        if (resolvedDescription === null && suggestion.description) resolvedDescription = suggestion.description;
      }
    }

    // Apply Skimlinks affiliate conversion
    if (resolvedLink) resolvedLink = convertToAffiliateUrl(resolvedLink);

    const resolvedCategory = category ?? detectCategory(title, resolvedLink ?? undefined);

    const item = await prisma.checklistItem.create({
      data: {
        boardId,
        title,
        description: resolvedDescription,
        link: resolvedLink,
        category: resolvedCategory,
        assigneeId: assigneeId ?? null,
        suggestionId: suggestionId ?? null,
        status: "todo",
        completed: false,
        createdById: user.id,
      },
      include: { assignee: { select: assigneeSelect } },
    });

    return c.json({ data: toDTO(item) }, 201);
  }
);

// PATCH /api/checklist/:id
app.patch(
  "/checklist/:id",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(1000).nullable().optional(),
      link: z.string().url().optional().or(z.literal("")).nullable().optional(),
      assigneeId: z.string().nullable().optional(),
      status: z.enum(["todo", "in_progress", "done"]).optional(),
      completed: z.boolean().optional(),
      category: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const itemId = c.req.param("id");
    const body = c.req.valid("json");

    const existing = await prisma.checklistItem.findUnique({
      where: { id: itemId },
    });
    if (!existing) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

    // Any board member can update
    const membership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: existing.boardId, userId: user.id } },
    });
    if (!membership) return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.link !== undefined && { link: body.link ? convertToAffiliateUrl(body.link) : null }),
        ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.completed !== undefined && { completed: body.completed }),
        ...(body.category !== undefined && { category: body.category }),
      },
      include: { assignee: { select: assigneeSelect } },
    });

    return c.json({ data: toDTO(updated) });
  }
);

// DELETE /api/checklist/:id
app.delete("/checklist/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const itemId = c.req.param("id");

  const existing = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: { board: { select: { creatorId: true } } },
  });
  if (!existing) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  if (existing.board.creatorId !== user.id) {
    return c.json({ error: { message: "Only the board creator can delete checklist items", code: "FORBIDDEN" } }, 403);
  }

  await prisma.checklistItem.delete({ where: { id: itemId } });

  return new Response(null, { status: 204 });
});

export default app;
