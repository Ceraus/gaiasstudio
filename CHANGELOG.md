# Changelog

All notable changes to Gaia's Label Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.36] - 2026-07-26

### Added
- **Gaia's Essences branding** — the app now ships with a real icon/favicon
  and logo mark instead of a generic leaf glyph. The app icon appears in the
  header, browser tab, and taskbar/title bar (Windows/Linux); packaged builds
  auto-generate the `.ico`/`.icns` from a single 1024×1024 source (`build/icon.png`)
  via electron-builder. The full "Gaia's Essences" logo is featured on the
  Welcome screen. Business Information in Settings now defaults to Rosa's
  real shop details out of the box — **Gaia's Essences**, 1836 Westchester
  Ave, Unit #282, Bronx, NY 10472, and Rosa Suarez ·
  https://www.gaiasessences.com/ — so back labels, FDA checks, and order
  receipts are pre-filled without any manual setup. Window titles, exported
  filenames (`Gaia's Essences - Recipe Name - v01.pdf`), receipt letterheads,
  and the printer calibration sheet all now say "Gaia's Essences".

## [2.0.35] - 2026-07-26

### Changed
- **Windows packaging switched from an NSIS portable `.exe` to a plain zip**
  — the bundled AI model upgrade (Qwen2.5-0.5B → Qwen3-4B-Instruct-2507,
  ~2.4 GB) pushed the installer payload past NSIS's ~2 GB 32-bit mmap
  limit (`makensis` aborted with "failed creating mmap"). `npm run
  dist:win` now produces `Gaia's Label Studio-<version>-win.zip`; unzip
  and run `Gaia's Label Studio.exe` inside.

### Added
- **Guided walkthroughs + Help hub** — a first-run "Show me around" tour and
  five deeper tours (Design a label, Inventory & pricing, Orders & receipts,
  Money & profit, Printing like a pro) that spotlight real UI elements,
  navigate between screens, and fall back gracefully on empty states. All
  replayable from a new **? Help hub** in the header, fully bilingual
  (EN/ES). Snoozable **tip banners** on key screens: ✕ hides one for the
  session, "Got it" turns it off for good, and the hub can bring them all
  back. The first-run welcome card now hands off to the tour.
- **Shopping List** on Inventory — tracked ingredients that are out or
  running low collect themselves into one card, each with a **Buy** button
  (opens the saved supplier page) and a **Restocked** button (+1 container).
- **Per-client history & repeat orders** — filter the Orders list by client
  (with order count and lifetime total), and a **Repeat** button that starts
  a new order pre-filled with the same client and items.
- **Order → labels bridge** — a **Print labels** button on each order queues
  the newest saved design for every ordered recipe onto the mixed batch
  sheet, quantities pre-filled to match the order.
- **Profit dashboard** on Finances — revenue from completed Orders minus
  logged receipts = real profit for This Month / This Year / All Time, plus
  a 6-month sales-vs-spending breakdown (with a note keeping material COGS
  from being double-counted).
- **Lot codes on printed labels** — an optional batch code (pre-filled from
  today's date) prints in tiny type inside the bottom edge of every label
  for cure-date traceability; handles rotated ribbon templates too.
- **Printer calibration page** — a downloadable test PDF (1-inch square,
  0.5-inch margin frame, inch rulers) that diagnoses the classic "labels
  print 2 mm off" scaling problem.
- **Full backup & restore** — Settings → Data now exports the ENTIRE
  database (every table, schema-agnostic, so future tables are included
  automatically) as one JSON file, and can restore it atomically (one
  transaction — a half-restored database is impossible; the app reloads
  after). The old export only covered ingredients/recipes/assets and had no
  restore. The desktop app additionally writes a **silent daily automatic
  backup** on launch into `backups/` inside Gaia's Save System, pruned to
  the newest 14 — Rosa never has to remember.
- **Client Work Orders & automated sales receipts** (Dexie v13) — a new
  Orders tab tracks what each client bought: type the client's name (existing
  clients auto-suggest, no duplicates), pick the recipes sold + quantities
  (unit prices pre-fill from each recipe's retail price), and mark the order
  **Completed** — the app previews and deducts the exact fractional
  ingredient usage (grams of base/oils, drops of EO) from tracked stock,
  freezes a COGS snapshot, and silently saves a professional 8.5"×11" PDF
  receipt to `work_orders/[Client_Name]_[ORD-xxx].pdf`. **Reopen** restores
  exactly what was deducted. Complements the Finances screen (expenses) with
  the sales side of the business.
- **Supplier-link price importer** — a "Paste supplier link to auto-fill
  pricing" field in the Inventory price modal. Three tiers: a local scraper
  (JSON-LD → meta tags → regexes), the **bundled offline AI** with a
  grammar-enforced JSON response (no key, nothing leaves the machine), and
  Gemini via the stored Google AI Studio key as a last resort. Detected
  price/size are confirmed before anything is saved; the link is remembered
  per ingredient for re-checks.
- **Stock on hand** (optional, per ingredient) with a "+1 container"
  shortcut in the price modal and low/out-of-stock badges on the inventory
  grid. Completed work orders deduct it automatically; untracked ingredients
  are left alone.
- **Bars per batch** on recipes (Revenue & Profit widget) — work orders
  deduct `ingredient amounts ÷ bars per batch × quantity sold`.
- **Strict 4-layer editor stack** — every canvas now spawns Base (white) →
  Background slot (AI/photo art swaps in *in place*, order never shuffles) →
  a template-shaped Legibility Overlay at 15% opacity → Foreground text/logo.
  Auto-layouts preserve the structural stack and only regenerate content.
- **Layers panel multi-select** — Ctrl/Cmd-click and Shift-click select
  multiple layers, with Group/Ungroup buttons in a new action bar (alongside
  the existing drag-to-reorder).
- **`electron/schema.sql`** — the canonical better-sqlite3 DDL mirroring
  Dexie v13 (all tables incl. clients / work_orders / work_order_items) for
  the desktop persistence adapter.
- **Custom Materials & Packaging library** — a reusable, shared list of
  packaging/materials costs (bags, boxes, labels) with categories, cost and
  unit, active/inactive states (Dexie v11). Managed from a new card on the
  Inventory screen; the Recipe Builder's Custom Costs section now offers
  one-tap chips to pull items from the library (or save a one-off cost back
  into it via a "Save to library" checkbox) instead of re-typing them per
  recipe.
- **Finances screen — automated receipt/expense ledger** (Dexie v12) — log
  purchase receipts (vendor, date, category, line items, tax) and see
  This Month / This Year / All Time totals plus a spend-by-category
  breakdown. Line items can link to an Ingredient or a Custom Material and
  optionally sync their cost straight back into Inventory on save. Includes
  a CSV export for handing records to an accountant.
- **`npm run restore:rosa`** / in-app maintenance action — deactivates all
  ingredients and force-restores Rosa's 28 seed recipes, for accounts whose
  recipes went missing. Also runnable headlessly via `GAIA_MAINTENANCE=1`
  (Electron loads, runs maintenance, and quits automatically).
- **Bilingual ingredient names & search** — every catalog ingredient now has
  a proper Spanish translation (`sync:i18n` script covers 658/670 entries),
  category labels are localized, and searching in Ingredients, Inventory,
  and the AI Prompt Builder matches both the English and Spanish name.
- **Redesigned export file names** — exports now save as
  `Gaia - Lavender Dream - v01.pdf` (brand, recipe/product name, per-series
  version) instead of an opaque `PREFIX___01.pdf` counter.
- **"Open in browser" for AI links** exposed via a new
  `electronAPI.openExternalUrl` bridge.

### Changed
- **Bundled AI model upgraded: Qwen2.5-0.5B → Qwen3-4B-Instruct-2507**
  (Q4_K_M, ~2.4 GB, Apache-2.0). One model now handles BOTH offline AI jobs:
  noticeably better benefit-tagline suggestions (and real Spanish support),
  plus reliable supplier-page extraction via node-llama-cpp's JSON-schema
  grammar. Sized for CPU-only desktops (8-core, 64 GB target): taglines in a
  few seconds, page extraction in tens of seconds. `npm run ai:fetch-model`
  downloads the new file.
- **Smoke suite hardening** — async page evaluations now stash results on a
  window global and poll (fixes intermittent "Promise was collected" CDP
  failures on modern Chrome), `puppeteer-core` bumped to ^25, and the stale
  "25% larger by default" check now tests what the app actually does since
  the 100%-default change: default 100%, and the Settings control really
  scales to 125% and back. New checks cover the 4-layer stack and layers
  multi-select → group → ungroup.
- **Ollama support removed entirely** — the app now ships with the bundled,
  fully offline local AI as the only AI backend. Settings no
  longer shows a backend toggle or Ollama URL/model fields, just an on/off
  toggle and "Test Connection" for the bundled model.
- **AI Suggestions are more prominent** — the Recipe Builder's benefit
  "Suggest" button is larger, and the status badge now reads
  "AI Suggestions" instead of the more cryptic "AI Ready".
- Removed the "Load Sample Prices" one-shot inventory seeder in favor of the
  Custom Materials library and manual pricing flows.

### Removed
- Dead code cleanup: an unused `debugLog` helper (`src/lib/debug.ts`), an
  unused re-export block in `src/db/repositories.ts`, and an unused
  `ROSA_RECIPE_COUNT` re-export from `src/lib/maintenance.ts`. No functional
  change.

## [2.0.31] - 2026-07-25

### Added
- **Bundled local AI (Qwen2.5-0.5B)** ships inside the Windows executable —
  no Ollama install required.
- **Built-in AI enabled by default**; Ollama remains an optional advanced path
  for users who want a larger model.
- **`npm run ai:fetch-model`** script for pre-build model download (~491MB).
- **Recipe list pagination** — "Your Recipes" on the Choose Recipe screen
  is now capped at 19 per page (matching the height of the editor column
  beside it), with Prev/Next controls and a "Page X of Y" indicator. Saving
  a new recipe automatically jumps to whichever page it landed on.
- **Complete ingredient icon coverage** — every ingredient in the database
  now has a purpose-built, colorful icon instead of falling back to a
  generic category icon. Added five new icon shapes (milk bottle, molecule,
  granular cluster, powder mound, lab flask) and 198 new colorful icon
  entries to cover every previously-uncovered ingredient.
- **Botanical ingredient icons in the AI Prompt Builder** — the "Botanical
  ingredients to feature" checklist (active recipe, all-botanicals, and full
  catalog sections) now shows each ingredient's icon alongside its name
  instead of plain text.
- **Two new Background Style palettes** — "Toasted Almond" and "Walnut Shell"
  join the AI Prompt Builder's style presets.
- **Alternating earth-tone recipe cards** — "Your Recipes" list cards now
  cycle through six earth tones (sand, clay, terracotta, sage, warm brown,
  moss) instead of plain white, using a global index so the pattern stays
  consistent across pagination.
- **Ingredient catalog sync/backfill** — `syncIngredientCatalog()`
  automatically backfills any of the 671 seed ingredients missing from an
  existing, non-empty local database, plus a manual "Sync library from
  catalog" button on the Ingredients screen, fixing accounts that only ever
  had a handful of ingredients seeded.
- **Zero-Math inventory, COGS & revenue system** — new `inventoryMath`
  helpers (oz/lb→gram and ml→drop conversions, margin math) and an
  `inventorySeed` of baseline supplier prices back a redesigned Inventory
  screen (category tabs, a zero-math "what did you pay / what size" modal)
  and a sticky Revenue & Profit widget in the Recipe Builder (retail price
  input, live gross profit, color-coded margin %). Recipes gained persisted
  retail price, COGS and profit-margin fields (Dexie v10).
- **Quick Set by Category** — bulk-apply one price to every ingredient in a
  category at once (e.g. "$0.05/g for all micas") from the Inventory screen,
  respecting weight vs. volume math.
- **Pinned "In-Use Ingredients" section** in Inventory — shows only
  ingredients referenced by saved recipes, above the category tabs.
- **Live stock photo search** — the Free Stock tab in Choose Background now
  runs real Unsplash + Pixabay searches in parallel and merges the results,
  with required attribution links, download caching into the offline asset
  library, and graceful no-key/no-results/error states. API keys are
  configured in Settings, with new "Get a free key" links.
- **Local AI copywriting assist (optional, 100% offline)** — a new opt-in
  "Local AI" section in Settings (Ollama base URL + model, Test Connection)
  backs a "✨ Suggest" button in the Recipe Builder that drafts a
  benefit/tagline from selected ingredients via a local Ollama model.
  Preview-only (Use this / Edit first / Discard); it never touches pricing
  math or compliance-sensitive label text (INCI/warnings).

### Changed
- **Default interface scale is now 100%** (was 125%); the "default" badge
  in Settings → Interface size moved to the 100% option accordingly.
- **Header navigation** no longer fights over an artificial ~1024px width
  budget — the tab bar, "Hi Rosa" greeting, New Label/AI Prompt/Settings
  buttons and language switcher all render fully on one line, using the
  window's actual full width instead of a fixed max-width container.

### Fixed
- The "active draft in progress" dot on the Workspace tab was being
  cropped by the nav's horizontally-scrolling wrapper; removed the
  now-unnecessary scroll container so the dot renders uncropped.
- WorkflowStepper tooltips were appearing underneath the header instead of
  stacking above it; fixed the z-index order.
- **Misaligned ingredient rows** — `IngredientRow` was rebuilt as a proper
  CSS grid (icon | name | actions) so long names truncate correctly instead
  of being clipped from the left, action buttons never get pushed off-row,
  and row height is uniform whether or not a benefit line is present.
- **"Includes a soap base" recipe check** now actually inspects the active
  ingredient list for a base/soap-base ingredient (amber warning if
  missing) instead of always showing a hardcoded checkmark.

## [2.0.29] - 2026-07-24

### Added
- **Workspace dashboard** — designs can now be filed under colour-coded
  Collections (product lines). Global search reaches through a design's
  template, collection, recipe and that recipe's ingredients, so searching
  "lavender" finds a label whose recipe simply contains it. Collection filter
  chips (including an "Unfiled" bucket) show live counts, and a Collections
  manager lets you create, rename, recolour and delete collections.
- **Mixed batch printing ("Ink Saver")** — queue several different saved
  designs onto one Avery sheet from the Workspace, with a live sheet preview,
  per-design quantity steppers, and a "fill evenly" action that tops up the
  last sheet so it's never wasted. Designs with a different label size are
  flagged and excluded rather than mis-printed.
- **Digital inch rulers** — a toggleable physical ruler along the canvas
  edges, zeroed on the trim line, for precise by-hand placement.
- **Interface scale** — a 100/110/125/140% display-size setting in Settings
  for accessibility; the whole UI (not just the canvas) scales together.
- Non-destructive brightness/contrast/saturation adjustments on images.
- Drag-to-reorder in the Layers panel.
- Real object clipboard (Ctrl/Cmd+C/X/V) alongside the existing style painter.
- Undockable Properties panel (floats in its own movable window).
- Spanish and English translations for every new string (54 additions each).

### Changed
- The round front label layout is now a true front face — curved product
  name arcing along the ring, benefit tagline and net weight inside the
  legibility circle — instead of duplicating the back label's content.
- README documents the Workspace/Collections model, mixed batch printing,
  the ruler and the interface scale.

### Fixed
- Curved text no longer loses its ascenders to Fabric's object cache; it now
  renders uncached while curved and re-caches once straightened.
- Content that can't fit a label is dropped from the least important line
  upward instead of overflowing past the die-cut.

### Security
- A single, shared `will-download` interceptor (main + AI-Studio sessions)
  with async, size-capped image conversion and sanitized filenames.
- Embedded `<webview>`s are forced into `contextIsolation`, denied a
  preload, and have every permission request refused; popups are routed
  through an allowlisted, session-sharing AI browser window instead of
  spawning unaudited windows.
- `open-file` / `open-folder` IPC is scoped to the portable save-system
  directory so a compromised renderer can't launch arbitrary files.

## [2.0.28] - 2026-07-19

Initial tracked release — offline-first label & sticker editor with an
Avery print-routing engine, recipe/ingredient library, and PDF export.
