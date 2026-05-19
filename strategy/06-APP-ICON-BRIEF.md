# Plannr — App Icon Brief

The goal: generate a usable v1 icon in 30 minutes that you don't hate. Upgrade later if Plannr blows up.

---

## What Makes a Great App Icon

Strip it down to the rules iOS designers actually follow:

1. **Recognizable at 60x60 pixels.** That's how big it is on a home screen.
2. **One shape, one color story.** No detailed scenes. No realism. No words.
3. **No iOS clichés.** Avoid: globe, suitcase, compass, map pin (every travel app uses these — you'll disappear).
4. **High contrast against ANY wallpaper.** Test against white, black, and a busy photo.
5. **Distinct color.** Don't use the same blue every productivity app uses.

---

## Direction: 3 Concepts to Generate

Pick one — or generate all three and choose:

### Concept A — Geometric "P"

A bold, custom letterform "P" on a solid colored background. Slightly architectural, slightly playful. Modern wordmark energy — like Notion, Linear, Cash App.

**Visual cues:** Geometric shapes forming the "P" letter. Could have a subtle pattern inside the letter (small dots representing group members), or be solid.

**Color story:** Warm coral background (#FF6B5B) with cream or off-white letter. OR muted teal (#3D8B7A) with warm cream. Both feel travel-adjacent without being beach-cliche.

---

### Concept B — The Stack

Three or four lines/cards/items stacked, suggesting "a list" or "a plan" without being literal. Could be abstract rectangles in slightly different shades. Suggests organization without saying "checklist."

**Visual cues:** Stacked horizontal shapes, slightly offset, maybe with check-mark or dot indicators. Bauhaus / Swiss design influence.

**Color story:** Same as Concept A — coral or teal background, items in cream/white tones.

---

### Concept C — The Pin That's Not A Pin

A symbol that *almost* looks like a map pin but is actually something else — a teardrop reading as a person, or a pin made of two overlapping circles representing two people meeting. Subtle nod to travel without being literal.

**Visual cues:** A single bold symbol, possibly with a slight gradient. Distinctive at thumbnail size.

**Color story:** A confident solid color background with the symbol in a contrasting accent — coral on cream, or teal on coral.

---

## Recommended: Start with Concept A

It's the safest, fastest, hardest to mess up, and most "modern app" looking. You can always change later. Many massive apps (Cash App, Notion, X) are essentially letterforms.

---

## How to Generate the Icon (Three Paths)

### Path 1 — DALL-E / ChatGPT (free if you have ChatGPT Plus)

Prompt to try:

> A minimal app icon design for an iOS app called "Plannr." The icon is a bold, custom geometric letterform "P" centered on a solid warm coral background (#FF6B5B). The "P" is cream-colored (#F5EDE1) with clean, slightly rounded edges and a modern, friendly feel. Flat design, no gradients, no shadows, no text other than the P itself. Square format, suitable for iOS app icon. Style references: Notion, Cash App, Linear. The icon should look distinctive at small sizes and feel modern without being sterile.

Iterate by changing colors or adding/removing details.

### Path 2 — Midjourney ($10/month minimum)

Same prompt, append `--ar 1:1 --s 100` for square format and lower stylization.

Midjourney often produces more polished but less "designer" results. Worth trying both.

### Path 3 — Figma + free icon templates

If you want pixel-level control:
1. Open Figma (free)
2. Search "iOS app icon template"
3. Use a free template, drop in your text or shape
4. Export at 1024x1024 PNG

Path 3 is best long-term but slowest today.

---

## Color Palette Recommendations

If you want to lock a palette now (saves time across icon, social, eventual landing page):

### Option 1 — Warm & Welcoming
- **Primary:** Coral (#FF6B5B)
- **Secondary:** Cream (#F5EDE1)
- **Accent:** Deep navy (#1B2A47) — for text
- **Vibes:** travel, energy, group warmth, late afternoon golden hour

### Option 2 — Calm & Considered
- **Primary:** Muted teal (#3D8B7A)
- **Secondary:** Cream (#F0E7D8)
- **Accent:** Warm clay (#C76A4E) — for accents
- **Vibes:** trust, intention, slow travel, considered taste

### Option 3 — Distinctly Different
- **Primary:** Soft lavender / dusty purple (#9B8AC4)
- **Secondary:** Cream
- **Accent:** Burnt orange (#D67341)
- **Vibes:** Different from every other travel app. Memorable. A little unexpected.

**My recommendation:** Option 1 (coral). It pops on a home screen, photographs well for content, doesn't look like a finance app or a meditation app.

---

## Icon Variants You'll Need

Apple wants multiple sizes. AI tools generate ONE size — you'll need to export properly. The tool can do this:

- Download your 1024x1024 PNG
- Go to **appicon.co** (free tool)
- Drop your image, it generates ALL required iOS sizes automatically
- Download the zip, hand to Claude Code later for the build

---

## Testing the Icon

Before you commit:

1. Drop the icon into a "fake home screen" mockup tool (search "iOS home screen mockup" — many free ones online)
2. Look at it against a busy photo wallpaper
3. View it on your actual phone background by saving it as your wallpaper temporarily
4. Does it pop? Does it look like every other app? Does it look like a Plannr would look?

If it feels generic — regenerate. The icon is the most-seen surface of the app. Worth getting right.

---

## What Not To Do

- Suitcase, plane, globe, compass, map, mountain, beach, palm tree
- Stock-looking blue-and-white "tech" gradient
- The word "Plannr" written across the icon
- Photographs or anything photorealistic
- Tiny details that disappear at thumbnail size
- More than 2-3 colors total
- Off-the-shelf icon templates (you'll see them on other apps)

---

## When You're Done

1. Save the 1024x1024 source PNG to `~/projects/plannr/mobile/assets/icon-source.png`
2. Generate all sizes via appicon.co
3. Hand the zip to Claude Code later: *"replace the existing app icon assets in mobile/assets with these new generated sizes"*
4. Use the same image as your profile photo on TikTok, Instagram, YouTube, X — instant brand consistency

---

## Backup Plan: Hire It Out

If you spend 60 minutes trying to AI-generate and hate everything:

- **Fiverr** — search "iOS app icon design" — $25-100 — 24-48hr turnaround
- **99designs** — design contest, $200-500, multiple options
- **Reddit r/forhire** — find a designer, ~$100-300 negotiated

For a v1, AI is usually fine. For a v2 in 6 months when Plannr has traction, hire a real designer.
