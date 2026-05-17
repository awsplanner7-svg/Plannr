import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { prisma } from "./prisma";
import boardsRoutes from "./routes/boards";
import suggestionsRoutes from "./routes/suggestions";
import votesRoutes from "./routes/votes";
import checklistRoutes from "./routes/checklist";
import itineraryRoutes from "./routes/itinerary";
import activityRoutes from "./routes/activity";
import inboxRoutes from "./routes/inbox";
import inviteRoutes, { buildInviteHtml } from "./routes/invite";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use(
  "*",
  cors({
    origin: (origin) => origin,
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use("*", logger());

// Auth middleware
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

// Auth routes
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Web invite landing page — full sign-up/join flow in the browser
// Registered at both /api/invite-page/:code (routed by Caddy) and /invite/:code (legacy)
async function handleInvitePage(c: any) {
  const { code } = c.req.param();
  const board = await prisma.board.findUnique({
    where: { inviteCode: code },
    include: {
      _count: { select: { members: true } },
      creator: { select: { name: true } },
    },
  });
  if (!board) {
    return c.html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invalid Invite</title></head><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px 24px;background:#FAF9F6"><h2 style="color:#1a1a1a">This invite link is invalid or expired.</h2></body></html>`);
  }
  return c.html(buildInviteHtml(code, board));
}

app.get("/api/invite-page/:code", handleInvitePage);
app.get("/invite/:code", handleInvitePage);

// App routes
app.route("/api/boards", boardsRoutes);
app.route("/api", suggestionsRoutes);
app.route("/api", votesRoutes);
app.route("/api", checklistRoutes);
app.route("/api", itineraryRoutes);
app.route("/api/activity", activityRoutes);
app.route("/api/inbox", inboxRoutes);
app.route("/api", inviteRoutes);

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
