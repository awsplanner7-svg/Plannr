import { Hono } from "hono";
import { prisma } from "../prisma";
import { auth } from "../auth";
import { env } from "../env";
import { Resend } from "resend";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

export function buildInviteHtml(code: string, board: {
  name: string;
  type: string;
  _count: { members: number };
  creator: { name: string | null; email?: string | null } | null;
}): string {
  const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const escJs = (s: string) => s.replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/\n/g,"\\n");
  const creatorName = board.creator?.name || "Someone";
  const memberText = board._count.members === 1 ? "1 member" : `${board._count.members} members`;
  const BOARD_CONFIG: Record<string, { emoji: string; bg: string; color: string; label: string }> = {
    BACHELOR:     { emoji: "🥂", bg: "#FFF7E6", color: "#854F0B", label: "Bachelor party" },
    MOVING:       { emoji: "📦", bg: "#EAF3DE", color: "#3B6D11", label: "Moving" },
    ENGAGEMENT:   { emoji: "💐", bg: "#FBEAF0", color: "#993556", label: "Engagement" },
    WEDDING:      { emoji: "💒", bg: "#EEEDFE", color: "#534AB7", label: "Wedding" },
    HOUSEWARMING: { emoji: "🛋️", bg: "#E6F1FB", color: "#185FA5", label: "Housewarming" },
    GROUP_TRIP:   { emoji: "✈️", bg: "#FAECE7", color: "#993C1D", label: "Group trip" },
    BABY_SHOWER:  { emoji: "🍼", bg: "#FFF7E6", color: "#854F0B", label: "Baby shower" },
    BIRTHDAY:     { emoji: "🎂", bg: "#EEEDFE", color: "#534AB7", label: "Birthday" },
  };
  const cfg = BOARD_CONFIG[board.type] ?? { emoji: "🎁", bg: "#EEEDFE", color: "#534AB7", label: board.type };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Join ${esc(board.name)} on Plannr</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF9F6;min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:32px 16px}
    .card{background:#fff;border-radius:24px;padding:36px 28px;max-width:400px;width:100%;box-shadow:0 4px 32px rgba(0,0,0,.08);margin-bottom:40px}
    .hero{text-align:center;margin-bottom:24px}
    .emoji{font-size:52px;line-height:1;display:block;margin-bottom:12px}
    .lbl{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.6px;font-weight:500;margin-bottom:6px}
    h1{font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.2;margin-bottom:8px}
    .pill{display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:8px}
    .meta{font-size:14px;color:#888}
    .divider{height:1px;background:#EBEBEB;margin:22px 0}
    .stitle{font-size:15px;font-weight:600;color:#1a1a1a;margin-bottom:4px}
    .ssub{font-size:13px;color:#888;margin-bottom:14px}
    input{width:100%;padding:14px 16px;border:1.5px solid #E5E5E5;border-radius:12px;font-size:16px;font-family:inherit;color:#1a1a1a;background:#FAFAFA;margin-bottom:10px;outline:none;-webkit-appearance:none}
    input:focus{border-color:#1a1a1a;background:#fff}
    .btn{width:100%;padding:16px;background:#1a1a1a;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;font-family:inherit;cursor:pointer;-webkit-appearance:none}
    .btn:disabled{opacity:.45;cursor:not-allowed}
    .err{color:#E02020;font-size:13px;margin-top:10px;text-align:center;min-height:16px}
    .alt{text-align:center;margin-top:14px;font-size:13px;color:#888}
    .alt a{color:#333;text-decoration:underline;cursor:pointer}
    .signed-as{font-size:12px;color:#aaa;text-align:center;margin-top:10px}
    .success{text-align:center;padding:8px 0}
    .s-emoji{font-size:56px;line-height:1;display:block;margin-bottom:16px}
    .s-title{font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:8px}
    .s-sub{font-size:14px;color:#888;line-height:1.6}
  </style>
</head>
<body>
<div class="card">
  <div class="hero">
    <span class="emoji">${cfg.emoji}</span>
    <p class="lbl">You're invited</p>
    <h1>${esc(board.name)}</h1>
    <span class="pill" style="background:${cfg.bg};color:${cfg.color}">${esc(cfg.label)}</span>
    <p class="meta">By ${esc(creatorName)} &middot; ${esc(memberText)}</p>
  </div>
  <div id="slot"></div>
</div>
<script>
var CODE='${escJs(code)}',BNAME='${escJs(board.name)}',mode='signup',_email=null;
function slot(){return document.getElementById('slot')}
function err(m){var e=document.getElementById('err');if(e)e.textContent=m||''}
function busy(on){var b=document.getElementById('sbtn');if(b){b.disabled=on;if(on)b.textContent='...'}}

async function init(){
  try{var r=await fetch('/api/auth/get-session',{credentials:'include'});var d=await r.json();if(d&&d.user){_email=d.user.email}}catch(e){}
  var isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if(isMobile){renderOpenInApp()}else{_email?renderIn(_email):renderForm()}
}

function renderOpenInApp(){
  slot().innerHTML='<div class="divider"></div>'+
    '<button class="btn" onclick="openApp()">Open in Plannr App</button>'+
    (_email?'<p class="signed-as">Signed in as '+_email+'</p>':'')+
    '<div class="alt" style="margin-top:12px"><a onclick="showBrowserJoin()">Join in browser instead</a></div>'+
    '<div id="bjoin"></div>';
}
function openApp(){window.location.href='vibecode://invite/'+CODE;}
function showBrowserJoin(){
  var el=document.getElementById('bjoin');if(!el)return;
  if(_email){el.innerHTML='<div style="margin-top:14px"><button class="btn" id="sbtn" onclick="joinIn()">Join board</button><p class="err" id="err"></p></div>'}
  else{renderFormInEl(el)}
}
function renderIn(email){
  slot().innerHTML='<div class="divider"></div><button class="btn" id="sbtn" onclick="joinIn()">Join board</button><p class="signed-as">Signed in as '+email+'</p><p class="err" id="err"></p>';
}
function renderFormInEl(el){
  var su=mode==='signup';
  el.innerHTML='<div style="margin-top:14px">'+
    '<p class="stitle">'+(su?'Create account to join':'Sign in to join')+'</p>'+
    '<p class="ssub">Just email and password &mdash; no profile setup needed</p>'+
    '<input type="email" id="em" placeholder="you@example.com" autocomplete="email"/>'+
    '<input type="password" id="pw" placeholder="Password (min 6 chars)" autocomplete="'+(su?'new-password':'current-password')+'"/>'+
    '<button class="btn" id="sbtn" onclick="go()">'+(su?'Join board':'Sign in &amp; join')+'</button>'+
    '<p class="err" id="err"></p>'+
    '<div class="alt">'+(su?'Already have an account? <a onclick="flip()">Sign in</a>':'New here? <a onclick="flip()">Create account</a>')+'</div>'+
    '</div>';
}
function renderForm(){
  var su=mode==='signup';
  slot().innerHTML='<div class="divider"></div><p class="stitle">'+(su?'Create account to join':'Sign in to join')+'</p><p class="ssub">Just email and password &mdash; no profile setup needed</p><input type="email" id="em" placeholder="you@example.com" autocomplete="email"/><input type="password" id="pw" placeholder="Password (min 6 chars)" autocomplete="'+(su?'new-password':'current-password')+'"/><button class="btn" id="sbtn" onclick="go()">'+(su?'Join board':'Sign in &amp; join')+'</button><p class="err" id="err"></p><div class="alt">'+(su?'Already have an account? <a onclick="flip()">Sign in</a>':'New here? <a onclick="flip()">Create account</a>')+'</div>';
}
function flip(){mode=mode==='signup'?'signin':'signup';renderForm()}
async function joinBoard(){
  var r=await fetch('/api/invite/'+CODE+'/join',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'}});
  var d=await r.json();if(!r.ok)throw new Error((d.error&&d.error.message)||'Failed to join board');
}
async function joinIn(){busy(true);try{await joinBoard();renderSuccess()}catch(e){busy(false);err(e.message||'Failed to join. Try again.')}}
async function go(){
  var em=(document.getElementById('em')||{}).value||'',pw=(document.getElementById('pw')||{}).value||'';
  em=em.trim();
  if(!em.includes('@')){err('Please enter a valid email');return}
  if(pw.length<6){err('Password must be at least 6 characters');return}
  busy(true);err('');
  try{
    if(mode==='signup'){
      var nm=em.split('@')[0].replace(/[._]/g,' ')||em;
      var sr=await fetch('/api/auth/sign-up/email',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,password:pw,name:nm})});
      var sd=await sr.json();
      if(!sr.ok){var msg=((sd.message||'')+((sd.error&&sd.error.message)||'')).toLowerCase();if(msg.includes('exist')||msg.includes('already')||msg.includes('taken')){await signIn(em,pw)}else{throw new Error(sd.message||(sd.error&&sd.error.message)||'Failed to create account')}}
    }else{await signIn(em,pw)}
    await joinBoard();renderSuccess();
  }catch(e){busy(false);err(e.message||'Something went wrong. Please try again.')}
}
async function signIn(em,pw){
  var r=await fetch('/api/auth/sign-in/email',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,password:pw})});
  var d=await r.json();if(!r.ok)throw new Error(d.message||(d.error&&d.error.message)||'Invalid email or password');
}
function renderSuccess(){
  slot().innerHTML='<div class="success"><span class="s-emoji">🎉</span><p class="s-title">You\'re in!</p><p class="s-sub">You\'ve joined <strong>'+BNAME+'</strong>.<br>Open the Plannr app to start contributing.</p></div>';
}
init();
</script>
</body>
</html>`;
}

function buildEmailHtml(inviterName: string, boardName: string, inviteLink: string): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 48px 24px; background-color: #ffffff;">
  <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 16px; line-height: 1.3;">${inviterName} invited you to ${boardName}</h1>
  <p style="font-size: 16px; color: #555555; line-height: 1.6; margin: 0 0 32px;">${inviterName} is planning <strong>${boardName}</strong> and wants your input. Tap the button below to join and start suggesting ideas.</p>
  <a href="${inviteLink}" style="display: block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; text-align: center; padding: 16px 24px; border-radius: 12px; font-size: 16px; font-weight: 600; margin-bottom: 24px;">Join ${boardName}</a>
  <p style="font-size: 12px; color: #aaaaaa; margin: 0; line-height: 1.5;">Or copy this link: ${inviteLink}<br>No account required to click the link.</p>
</div>`;
}

// Public - get board info by invite code (no auth required)
// Returns HTML for browser requests, JSON for API requests
app.get("/invite/:code", async (c) => {
  const { code } = c.req.param();
  const board = await prisma.board.findUnique({
    where: { inviteCode: code },
    include: {
      _count: { select: { members: true } },
      creator: { select: { name: true, email: true } },
    },
  });

  const acceptsHtml = c.req.header("Accept")?.includes("text/html") ?? false;

  if (!board) {
    if (acceptsHtml) {
      return c.html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invalid Invite</title></head><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px 24px;background:#FAF9F6"><h2 style="color:#1a1a1a">This invite link is invalid or expired.</h2></body></html>`);
    }
    return c.json({ error: { message: "Invalid invite link", code: "NOT_FOUND" } }, 404);
  }

  if (acceptsHtml) {
    return c.html(buildInviteHtml(code, board));
  }

  return c.json({
    data: {
      id: board.id,
      name: board.name,
      type: board.type,
      memberCount: board._count.members,
      inviteCode: board.inviteCode,
      creatorName: board.creator.name || board.creator.email || "Someone",
    },
  });
});

// Auth required - join board via invite code
app.post("/invite/:code/join", async (c) => {
  const user = c.get("user");
  if (!user)
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const { code } = c.req.param();
  const board = await prisma.board.findUnique({ where: { inviteCode: code } });
  if (!board)
    return c.json({ error: { message: "Invalid invite link", code: "NOT_FOUND" } }, 404);

  // Check if already a member
  const existing = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: board.id, userId: user.id } },
  });
  if (existing) {
    return c.json({ data: { boardId: board.id, alreadyMember: true } });
  }

  // Add as member
  await prisma.boardMember.create({
    data: { boardId: board.id, userId: user.id, role: "member" },
  });

  return c.json({ data: { boardId: board.id, alreadyMember: false } }, 201);
});

// Auth required - send email invite (single)
app.post("/boards/:boardId/invite-email", async (c) => {
  const user = c.get("user");
  if (!user)
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const { boardId } = c.req.param();
  const { email } = await c.req.json();

  if (!email || !email.includes("@")) {
    return c.json({ error: { message: "Valid email required", code: "INVALID_EMAIL" } }, 400);
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { members: { where: { userId: user.id } } },
  });
  if (!board || board.members.length === 0) {
    return c.json(
      { error: { message: "Board not found or not a member", code: "NOT_FOUND" } },
      404
    );
  }

  const inviteLink = `${env.BACKEND_URL}/api/invite/${board.inviteCode}`;
  const inviterName = user.name || user.email || "Someone";

  if (env.RESEND_API_KEY) {
    const resend = new Resend(env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Plannr <onboarding@resend.dev>",
      to: email,
      subject: `${inviterName} invited you to ${board.name} on Plannr`,
      html: buildEmailHtml(inviterName, board.name, inviteLink),
    });
  } else {
    console.log(
      `[INVITE EMAIL] Board: ${board.name} | To: ${email} | Code: ${board.inviteCode} | From: ${inviterName} | Link: ${inviteLink}`
    );
  }

  return c.json({ data: { sent: true, inviteCode: board.inviteCode } });
});

// Auth required - send email invites (batch)
app.post("/boards/:boardId/invite-emails", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const { boardId } = c.req.param();
  const body = await c.req.json();
  const emails: string[] = body.emails ?? [];

  const validEmails = emails.filter((e: string) => typeof e === "string" && e.includes("@"));
  if (validEmails.length === 0) {
    return c.json({ error: { message: "No valid emails provided", code: "INVALID_EMAILS" } }, 400);
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { members: { where: { userId: user.id } } },
  });
  if (!board || board.members.length === 0) {
    return c.json({ error: { message: "Board not found or not a member", code: "NOT_FOUND" } }, 404);
  }

  const inviteLink = `${env.BACKEND_URL}/api/invite/${board.inviteCode}`;
  const inviterName = user.name || user.email || "Someone";

  if (env.RESEND_API_KEY) {
    const resend = new Resend(env.RESEND_API_KEY);
    await Promise.all(validEmails.map((email: string) =>
      resend.emails.send({
        from: "Plannr <onboarding@resend.dev>",
        to: email,
        subject: `${inviterName} invited you to ${board.name} on Plannr`,
        html: buildEmailHtml(inviterName, board.name, inviteLink),
      })
    ));
  } else {
    validEmails.forEach((email: string) => {
      console.log(`[INVITE EMAIL] Board: ${board.name} | To: ${email} | Code: ${board.inviteCode} | From: ${inviterName} | Link: ${inviteLink}`);
    });
  }

  return c.json({ data: { sent: true, count: validEmails.length, inviteCode: board.inviteCode } });
});

export default app;
