# Design System: K-PAI — Silicon Valley Privacy-Preserving AI Forum

## 1. Visual Theme & Atmosphere

"Silicon Valley Mission Control" — the interface feels like operating the command center of a
pioneering AI research institution. Surfaces are void-black and cosmic. Energy pulses through
solar-orange orbital accents pulled directly from the K-PAI atomic logo. The atmosphere sits at
the intersection of academic precision and startup velocity: dense but breathable, technical
yet human. Every screen communicates that serious research happens here.

- **Density:** 5/10 — Daily App Balanced. Data-forward without being a cockpit.
- **Variance:** 9/10 — Aggressively asymmetric. No centered layouts. Grid-breaking heroes.
- **Motion:** 7/10 — Spring physics everywhere. Orbital float animations. Staggered cascade
  reveals. Orange pulse micro-interactions on live data.

---

## 2. Color Palette & Roles

- **Void Black** (`#09090B`) — Primary canvas. Near-black zinc-950. All page backgrounds.
- **Deep Surface** (`#111113`) — Secondary surface. Drawer, sidebar, nested container backgrounds.
- **Raised Surface** (`#1A1A1E`) — Card fill. Elevated content containers. Default card background.
- **Orbital Surface** (`#222228`) — Hover states, selected rows, highlighted containers.
- **Whisper Border** (`rgba(255,255,255,0.07)`) — Card borders, 1px structural dividers. Ultra-subtle.
- **Soft Border** (`rgba(255,255,255,0.12)`) — Interactive element borders, input outlines.
- **Solar Orange** (`#F97316`) — THE single accent. CTAs, active states, focus rings, key metrics.
  Pulled directly from the K-PAI atomic orbital logo. All energy flows through this color.
- **Orange Dim** (`#EA580C`) — Pressed/active state. Hover deepening on primary buttons.
- **Orange Glow** (`rgba(249,115,22,0.12)`) — Focus halos, card hover tints, ambient warmth.
- **Text Primary** (`#F4F4F5`) — Headlines, primary content. Zinc-100 equivalent.
- **Text Secondary** (`#A1A1AA`) — Body text, descriptions, supporting content. Zinc-400.
- **Text Muted** (`#52525B`) — Timestamps, metadata, labels, placeholder text. Zinc-600.
- **Signal Green** (`#22C55E`) — Success, "checked-in", RSVP confirmed states.
- **Alert Red** (`#F87171`) — Error states, destructive action warnings.
- **Amber Warning** (`#FBBF24`) — Caution states, capacity warnings.

---

## 3. Typography Rules

- **Display/Headlines:** Space Grotesk — weight 700–800, tracking `-0.04em`, leading `1.05`.
  Use for hero titles, section headers, page titles. Never centered when variance > 4.
- **Body:** Space Grotesk — weight 400–500, tracking `-0.01em`, leading `1.65`, max `65ch`.
  Secondary text color (`#A1A1AA`). Relaxed, readable, scientific.
- **Labels/Captions:** Space Grotesk — weight 600, size `11–12px`, tracking `0.06em`, uppercase.
  Used for form labels, badge text, section dividers.
- **Mono/Technical:** Space Mono — all numeric data, IDs, timestamps, codes, counts, check-in
  numbers. Enforces precision aesthetic. Size 13px body, 12px labels.
- **Scale:** `11px` label → `13px` caption → `14px` body-sm → `16px` body → `20px` subheading →
  `26px` title → `40px` heading → `56px` display
- **Banned Fonts:** Inter, Outfit, any generic system sans-serif for branded contexts.
  Georgia, Times New Roman, Garamond, Palatino — all banned everywhere.
  Serif fonts banned in all UI contexts for this project.

---

## 4. Component Stylings

- **Buttons (Primary):** Solar orange fill (`#F97316`). Border-radius `10px`. White text, weight 600.
  Shadow: `0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(249,115,22,0.2)`.
  Hover: orange-600 (`#EA580C`). Active: `scale(0.97)` + shadow collapse. No neon outer glows.

- **Buttons (Outline/Secondary):** Transparent background. Border `1px solid rgba(255,255,255,0.12)`.
  Text: zinc-200 (`#E4E4E7`). Hover: `rgba(255,255,255,0.06)` background. Active: `scale(0.98)`.

- **Buttons (Ghost):** No border, no background. Text zinc-400. Hover: `rgba(255,255,255,0.05)` fill.

- **Cards:** Background `#1A1A1E`. Border `1px solid rgba(255,255,255,0.07)`. Radius `16px`.
  Shadow: `0 1px 3px rgba(0,0,0,0.4)`. Interactive hover: border-color tightens to
  `rgba(255,255,255,0.14)` + subtle orange warmth backdrop `rgba(249,115,22,0.04)`.

- **Inputs/Textareas/Selects:** Background `#111113`. Border `1px solid rgba(255,255,255,0.1)`.
  Text: zinc-100. Placeholder: zinc-600. Radius `10px`.
  Focus: border-color `#F97316`, ring `0 0 0 3px rgba(249,115,22,0.15)`. No floating labels.
  Label always above, error text always below.

- **Badges:** Pill shape, radius `999px`. No solid color backgrounds.
  Orange role: `rgba(249,115,22,0.15)` bg + `#F97316` text.
  Green success: `rgba(34,197,94,0.15)` bg + `#22C55E` text.
  Red danger: `rgba(248,113,113,0.15)` bg + `#F87171` text.
  Gray default: `rgba(255,255,255,0.07)` bg + `#A1A1AA` text.

- **Tables:** Row hover: `rgba(255,255,255,0.03)`. Column dividers: `rgba(255,255,255,0.06)`.
  Header row: `rgba(255,255,255,0.04)`. No outer table borders. Numbers in Space Mono.

- **Skeleton Loaders:** Dark shimmer `#1A1A1E → #222228 → #1A1A1E`. Animated gradient sweep.
  Match exact layout dimensions. No circular spinners.

---

## 5. Layout Principles

- **Max-width container:** `1280px` centered with `40px` horizontal padding on desktop, `20px` mobile.
- **Hero section:** Always split-screen (`55fr / 45fr`) or asymmetrically left-aligned.
  Centered hero layouts are BANNED for this project.
- **Grid-first:** CSS Grid exclusively for all multi-column layouts. Never flexbox percentage math.
- **Tile/feature sections:** 2-column asymmetric grid — large featured card + 2 smaller cards
  in a stack. Never 3 equal columns.
- **Section vertical rhythm:** `clamp(4rem, 8vw, 7rem)` between major sections.
- **Card internal padding:** `24px–32px` generously.
- **Full-height sections:** Always `min-height: 100dvh` — never `height: 100vh` (iOS Safari jump).
- **Mobile:** Strict single column below `768px`. Zero horizontal overflow tolerated.

---

## 6. Motion & Interaction

- **Easing standard:** `cubic-bezier(0.16, 1, 0.3, 1)` — the "quick-out" curve for all transitions.
- **Orbital animation:** Hero visual uses 3 elliptical SVG rings with animated dot particles
  orbiting at different speeds (7s, 9s, 11s) and directions. Continuous, infinite, hardware-accelerated.
- **Float animation:** Decorative cards and preview elements float on `6–8s ease-in-out` loop.
- **Staggered cascade:** Lists and card grids reveal with `60ms` stagger per child using
  `animation-delay: calc(var(--index) * 60ms)`.
- **Pulse indicator:** Live RSVP and active seminar indicators pulse with orange breathing at `2s` intervals.
- **Tactile push:** All buttons compress to `scale(0.97)–scale(0.98)` on `:active`.
- **Input focus slide:** Border + focus ring animate with `0.18s cubic-bezier(0.16, 1, 0.3, 1)`.
- **Performance rules:** Animate ONLY `transform` and `opacity`. Never `top`, `left`, `width`, `height`.
  Grain/noise overlays ONLY on `fixed position` pseudo-elements with `pointer-events: none`.

---

## 7. Anti-Patterns (Banned)

- No emojis anywhere in UI text, code, or alt text — SVG icons or nothing
- No `Inter` font — Space Grotesk only
- No generic serifs (`Times New Roman`, `Georgia`, `Garamond`, `Palatino`)
- No pure black (`#000000`) — minimum Void Black (`#09090B`)
- No neon outer glows — no `box-shadow` with high-opacity saturated colors
- No AI purple/blue gradient aesthetic — Solar Orange is the ONLY accent
- No multi-accent color schemes — one accent, total discipline
- No excessive gradient text on large headers — solid color hierarchy instead
- No custom mouse cursors
- No 3-column equal card layouts — asymmetric mosaic or 2-column zig-zag only
- No generic placeholder names: "John Doe", "Jane Smith", "Acme Corp", "Nexus"
- No predictable fake data: "99.99%", "50%", exact round numbers
- No AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen", "Transform"
- No filler navigation hints: "Scroll to explore", bouncing chevrons, scroll arrows
- No broken image links — use `picsum.photos` with seeds or inline SVG composites
- No centered hero sections — always split or left-aligned
- No circular spinner loaders — skeletal shimmer loaders only
- No light backgrounds on ANY component — this is a dark-mode-first system
- No `background: #fff` or `background: white` anywhere in the codebase
- No `h-screen` — always `min-h-[100dvh]` for full-height sections
