# Gaia's Label Studio

An **offline-first, Canva-like label & sticker editor** with an automated **Avery
print-routing engine**. Built for a non-technical maker: zero math, fully visual,
drag-and-drop, start-to-finish — from a blank canvas to a print-ready PDF on real
Avery sheets.

Everything runs locally in the browser. Nothing is uploaded; your ingredient
library, recipes, saved images and version history all live on your computer.

```bash
npm install
npm run dev      # open the printed local URL
npm run build    # production build into dist/ (host it anywhere, or open locally)
npm run smoke    # headless-Chrome smoke test (run after `npm run build`)
npm run dist:win # build Windows desktop app (.exe) into release/
```

### Windows desktop (.exe)

```bash
npm run dist:win
```

Outputs in `gaia-label-studio/release/`:

| File | What it is |
| --- | --- |
| `Gaia's Label Studio-<version>-win.zip` | Zipped app folder — unzip and double-click `Gaia's Label Studio.exe` inside, no install |
| `win-unpacked/Gaia's Label Studio.exe` | Unpacked dev build (same contents as the zip, run in place) |

Windows packaging is a portable exe. The app does not ship GGUF weights or
in-process llama binaries.

Everything stays local (IndexedDB, same as the browser app). External links (AI generator, etc.) open in your default browser.

## What it does

- **Start from nothing.** No seed data. The canvas begins empty; you add your own
  photos, logo, shapes and text.
- **Pick a shape & size visually.** Hundreds of bundled Avery templates covering
  current US Letter circles, squares, rectangles and rounded stickers — including
  real products such as 22807 and 6871. No pixels, no coordinates.
- **A strict 4-layer canvas.** Every design spawns with the same stack — solid
  white **Base** → **Background** slot (AI/photo art drops in without reshuffling
  anything) → a template-shaped, 15%-opacity **Legibility Overlay** → the
  **Foreground** text & logo — so type stays readable over busy AI art and
  auto-layouts only ever regenerate the foreground.
- **A real editor.** Move / resize / rotate / crop / group, a full **layers panel**
  (drag-to-reorder, **Ctrl/Shift multi-select → group/ungroup**, hide, lock,
  rename, delete), **smart snapping guides** (magenta
  lines when things line up or center — on move *and* resize, plus equal-spacing
  guides), **visual bleed masks** (a dimmed ring + cut line + safe zone), rich
  **typography** with elegant Google Fonts, **curved text** on round/oval labels,
  non-destructive **photo adjustments** (brightness / contrast / saturation),
  opacity & blend modes, undo/redo, a real **object clipboard**
  (`Ctrl/Cmd+C/X/V`), and a properties panel that **docks or floats**.
- **A physical ruler.** Toggle inch rulers along the top and left canvas edges.
  Zero sits on the trim line, so what the ruler reads is what will measure on
  the printed sticker.
- **Smart Pantry inventory.** Ingredients grouped into collapsible shelves
  (Colorants / Essential & Fragrance Oils / Carrier Oils & Butters / Botanicals &
  Additives / Soap Bases) with an **In-Use Only** toggle, per-shelf **Quick Set**
  bulk pricing for everything still missing a price, an **AI supplier-link
  importer** (paste a product URL → total price + container size are extracted
  locally, with Gemini as fallback via your Google AI Studio key → cost per
  gram/drop auto-calculates), and optional **stock-on-hand** tracking. A shared
  **Custom Materials & Packaging library** (bags, boxes, labels) is priced once
  and reused across every recipe.
- **Client work orders & receipts.** Create an order per client (existing names
  auto-suggest), pick the recipes sold + quantities, and mark it **Completed** —
  the app deducts the exact fractional ingredient usage (grams of base/oils,
  drops of EO) from tracked stock, freezes a COGS snapshot, and generates a
  professional 8.5″×11″ **PDF receipt** (saved silently to `work_orders/` in the
  desktop app). Reopen restores exactly what was deducted.
- **Finances ledger.** Log supplier purchase receipts (vendor, date, category,
  line items, tax) with automatic This Month / This Year / All Time totals and
  a spend-by-category breakdown; line items can link to an ingredient or a
  custom material and sync the paid price straight back into Inventory.
- **Precise, zero-math properties.** Size & position are shown in **inches** with a
  **lock-proportions** toggle and a **center-on-label** button. Arrow keys nudge
  (Shift = larger), plus `Ctrl/Cmd+Z/Y/D/G`, `[`/`]` stacking, and `Del`/`Esc` —
  none of which fire while you're typing.
- **First-run coach marks** gently walk you through pick template → add photo/logo →
  auto-layout → export (dismissed state is remembered).
- **Auto-layouts from your recipes.** Front (curved product name on round labels +
  centered logo), Back (a guaranteed-fit, measure-and-shrink text block that flows
  long ingredient lists into **two columns** and never clips), and Side (ribbon)
  layouts are generated from your saved recipes and constrained to the safe area.
- **A searchable, colour-coded Workspace.** Saved designs live on gallery cards
  you can rename inline, duplicate, delete, and file into **Collections** —
  colour-coded product lines (e.g. Pastel Mint for *Oily Skin*) whose hex paints
  each card's border and header. One search box matches a design's own name and
  notes plus the names of everything it is filed under: template, collection,
  recipe, and every ingredient in that recipe, so searching "lavender" finds the
  label whose recipe merely contains lavender oil.
- **Mixed batch printing (ink saver).** Tick several different saved designs and
  queue them onto a single Avery sheet, with per-design quantities and a "fill
  evenly" action so a part-used sheet of sticker paper is never thrown away.
- **Recipe & ingredient manager** with a live checklist (has a name / has
  ingredients / includes a soap base / has a benefit).
- **Zero-math inventory & pricing** with a **supplier-link importer**: paste a
  product URL and the app extracts total price + container size — local
  scraper first, then **Ollama structured JSON** (when an external Ollama
  server is configured), then Gemini if a key is stored. Optional
  **stock-on-hand** tracking with low/out badges.
- **Client Work Orders & receipts.** Log what each client bought; completing
  an order deducts the exact fractional ingredient usage (grams / drops) from
  tracked stock, snapshots the material cost, and silently saves an 8.5″×11″
  **PDF receipt** to `work_orders/`. Reopen restores the deducted stock. The
  **Finances** tab covers the other direction — an expense ledger for supplier
  receipts with price sync back into Inventory.
- **Assets drawer** with 4 tabs: My Photos, Library, Free Stock (Unsplash/Pixabay),
  and AI (open a generator, import the result).
- **True print routing.** `pdf-lib` stamps your flattened label onto the exact
  Avery grid at real inch dimensions — never the browser print dialog. WYSIWYG
  sheet preview, quantity + fill-sheet, and `PREFIX___01.pdf` file naming.
- **English & Spanish** (`react-i18next`).
- **Sized for comfort.** Settings offers 100 / 110 / 125 / 140% interface
  scaling (default 100%) so every control and label can be as large as needed.
- **Non-destructive history.** A 2000 ms debounced autosave writes snapshots you
  can restore from the History tab.
- **Foolproof backups.** One-click full-database export and atomic restore in
  Settings, plus a silent **daily automatic backup** in the desktop app
  (newest 14 kept in `backups/` inside Gaia's Save System).
- **Built-in walkthroughs.** A first-run guided tour plus five deeper tours
  (design, inventory, orders, money, printing) that spotlight the real UI —
  all replayable from the **? Help hub**, with snoozable tips on every key
  screen, in English and Spanish.
- **Closes the business loop.** A self-writing **shopping list** (Buy button
  opens the saved supplier page), per-client order history with one-click
  **repeat orders**, a **Print labels** bridge from any order to the batch
  sheet, a **profit dashboard** (sales − spending, by month), printed **lot
  codes** for batch traceability, and a **printer calibration page**.

## Tech stack

| Concern | Library |
| --- | --- |
| App | React + Vite + TypeScript + Tailwind |
| Canvas editor | **Fabric.js v6** |
| State | **Zustand** (+ an imperative editor controller) |
| Local database | **Dexie / IndexedDB** (ingredients, recipes, assets, versions, drafts, collections, label sets, materials, receipts, clients, work orders, settings) — better-sqlite3 DDL mirror in `electron/schema.sql` |
| PDF export | **pdf-lib** (Avery sheets, batch sheets, client receipts) |
| Local AI | **Optional external Ollama** (Tailscale/LAN HTTPS, per-task model routing). No bundled GGUF or node-llama-cpp. Google Translate and ComfyUI API stay separate. |
| i18n | **react-i18next** |
| Fonts | **@fontsource** (offline) + Google Fonts (on demand) |
| Icons | lucide-react |

## Avery templates

`src/data/averyTemplates.json` bundles the current Avery US catalog plus exact
sheet geometry from Avery's downloadable Word templates and MIT-licensed
gLabels geometry for products Avery still lists. Discontinued historic SKUs
are omitted. The catalog remains fully offline at runtime. The gLabels
attribution is in `THIRD_PARTY_LICENSES.md`.

```bash
npm run avery:generate   # rebuild the bundled dataset
npm run avery:scrape     # pull Avery's full live catalog and merge (see note)
npm run avery:scrape:docx       # verify inferred geometry from Avery Word files
npm run avery:import:glabels     # merge exact open-source Avery geometry
npm run avery:verify:pages       # verify product counts on current Avery pages
```

> The live scraper hits Avery's API, which is behind Cloudflare and blocks
> datacenter/CI IPs (HTTP 403). Run it from a normal desktop/residential network.
> The browser fallback handles this on a normal desktop. The app is fully
> functional with the bundled dataset regardless.
>
> The catalog intentionally includes uniform label/sticker sheets. Avery entries
> for assorted-size packs, CD media, divider tabs, cards and other non-uniform
> products are not represented by the app's rectangular-grid print engine.

## Architecture notes

- `src/lib/fabric/editorController.ts` — the imperative core: canvas lifecycle,
  the strict 4-layer stack, object factory, alignment/stacking/group/crop,
  layers (incl. drag-reorder + panel multi-select), undo/redo, debounced
  autosave, and selection sync into the Zustand store.
- `src/lib/fabric/overlay.ts` — the visual bleed mask / cut line / safe zone,
  drawn in the canvas `after:render` pass (identity space).
- `src/lib/localAi.ts` — optional Ollama client: structured outputs and
  per-task model routing. No in-process llama.
- `src/lib/aiTask.ts` — single-flight AI task helper with optional caching.
- `src/lib/supplierImport.ts` — the supplier-link price importer: main-process
  fetch (Electron, no CORS) or browser fetch, JSON-LD / meta / regex scraping,
  hybrid local AI, and the Gemini structured-extraction fallback.
- `src/lib/receiptPdf.ts` — the 8.5″×11″ pdf-lib client receipt (brand band,
  itemized table, totals, footer) + silent save into `work_orders/`.
- `src/db/repositories.ts` — repo layer incl. clients/work-orders, the exact
  fractional usage math (`computeOrderUsage`) and reversible stock deduction.
- `src/lib/fabric/snapping.ts` — smart alignment guides + snap-to-center.
- `src/lib/layoutEngine.ts` — context-specific Front/Back/Side auto-layouts.
- `src/lib/pdfExport.ts` — exact Avery-grid PDF stamping (handles rotated
  ribbons), for a single repeated design *and* for mixed batch sheets.
- `src/components/screens/BatchPrintScreen.tsx` — the ink-saving multi-design
  sheet, rasterizing each saved design off-screen via `editor.renderDesignPng`.
- `src/components/Shell.tsx` — lazy-loads the Editor (Fabric) and Export (pdf-lib)
  screens so those heavy libraries stay out of the initial bundle.
- `scripts/smoke.mjs` — a headless-Chrome smoke test driving the real app via
  `window.gaiaEditor` / `window.gaiaTest`. 53 checks covering add/undo/redo/
  align/flip/crop, curved text, photo adjustments, layer reordering, the object
  clipboard, recipe auto-layouts, a 25-ingredient back label fitting the safe
  zone, transparent logo → PDF, correct page counts at 612×792pt for both single
  and mixed batch sheets, the Workspace search index, and a pixel-level check
  that no ink reaches the die-cut edge.

### Desktop shell

`electron/main.cjs` wraps the production build. Two things there are worth
knowing about:

- **Auto-import.** One `will-download` interceptor is shared by the default
  session and the isolated `persist:aistudio` session used by the AI
  `<webview>`. PDFs land in the portable save system's `exports/` folder (the
  PDF Vault reads it); images are staged, converted to a data URL for the
  renderer and deleted. Conversion is async and capped at 24 MB so a large AI
  render can't stall the main process.
- **Guest isolation.** `will-attach-webview` strips the preload and forces
  `contextIsolation` on the embedded browser regardless of what the tag asks
  for; guest popups are re-hosted in the allowlisted AI window (same cookie jar,
  so Google sign-in still completes) rather than spawning an unaudited one. The
  `open-file` / `open-folder` IPC channels are scoped to the save system, and
  every permission request is denied.

### This is the requested Electron/SQLite app, delivered web-first

The original brief asked for Electron + better-sqlite3 + `<webview>` + electron-store.
The `<webview>` and `will-download` interceptor are now in the desktop shell;
persistence still uses the **browser-native equivalents** so the app stays truly
plug-and-play (open it and go, host the `dist/` folder anywhere) and fully
testable, while mapping 1:1 onto the desktop stack:

| Requested (Electron) | Here | Wrapping later |
| --- | --- | --- |
| `better-sqlite3` tables | Dexie/IndexedDB tables (identical shapes) | Swap the repo layer in `src/db` for a SQLite adapter |
| `electron-store` (API keys) | Settings row in the DB (local only) | Move to `electron-store` in the repo layer |
| Node `fs` file picker | Native picker over IPC on desktop; file input + drag-and-drop in the browser | — |
| `<webview>` + `will-download` | Both implemented in `electron/main.cjs` | — |

The table shapes in `src/db/db.ts` (ingredients, recipes, assets, versions,
drafts, collections, settings, custom materials, receipts, clients, work
orders + items) already match a SQLite schema, so only the persistence
adapter changes. The canonical better-sqlite3 DDL — including the Work Orders
pipeline and the updated inventory fields (`supplier_url`, `stock_on_hand`,
`bars_per_batch`, `retail_price`) — lives in **`electron/schema.sql`**.

The desktop shell (`electron/main.cjs`) additionally provides: silent PDF
saving into the portable save system (`gaia:save-pdf`), CORS-free supplier
page fetching for the price importer (`gaia:fetch-url`), the AI-image
`will-download` interceptor, and a 25% accessibility zoom
(`zoomFactor: 1.25`) with no horizontal scrolling.
