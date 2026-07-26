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
| `Gaia's Label Studio-1.0.0-Portable.exe` | Single portable exe — no install, double-click to run |
| `Gaia's Label Studio-1.0.0-Setup.exe` | NSIS installer with optional install folder |
| `win-unpacked/Gaia's Label Studio.exe` | Unpacked dev build (~190 MB folder) |

Everything stays local (IndexedDB, same as the browser app). External links (AI generator, etc.) open in your default browser.

## What it does

- **Start from nothing.** No seed data. The canvas begins empty; you add your own
  photos, logo, shapes and text.
- **Pick a shape & size visually.** 49 print-verified templates covering circles,
  ovals, squares, rectangles and rounded stickers — including real Avery products
  (22807 2″ round, 6871 back label, and many more). No pixels, no coordinates.
- **A strict 4-layer canvas.** Every design spawns with the same stack — solid
  white **Base** → **Background** slot (AI/photo art drops in without reshuffling
  anything) → a template-shaped, 15%-opacity **Legibility Overlay** → the
  **Foreground** text & logo — so type stays readable over busy AI art.
- **A real editor.** Move / resize / rotate / crop / group, a full **layers panel**
  (**drag-and-drop reordering**, Ctrl/Shift **multi-select → group/ungroup**,
  hide, lock, rename, delete), **smart snapping guides** (magenta lines
  when things line up or center — on move *and* resize, plus equal-spacing guides),
  **visual bleed masks** (a dimmed ring + cut line + safe zone), rich **typography**
  with elegant Google Fonts, **curved text** on round/oval labels, opacity & blend
  modes, undo/redo, and a **movable properties window**.
- **Smart Pantry inventory.** Ingredients grouped into collapsible shelves
  (Colorants / Essential & Fragrance Oils / Carrier Oils & Butters / Botanicals &
  Additives / Soap Bases) with an **In-Use Only** toggle, per-shelf **Quick Set**
  bulk pricing for everything still missing a price, an **AI supplier-link
  importer** (paste a product URL → total price + container size are extracted
  locally, with Gemini as fallback via your Google AI Studio key → cost per
  gram/drop auto-calculates), and optional **stock-on-hand** tracking.
- **Client work orders & receipts.** Create an order per client (existing names
  auto-suggest), pick the recipes sold + quantities, and mark it **Completed** —
  the app deducts the exact fractional ingredient usage (grams of base/oils,
  drops of EO) from tracked stock, freezes a COGS snapshot, and generates a
  professional 8.5″×11″ **PDF receipt** (saved silently to `work_orders/` in the
  desktop app). Reopen restores exactly what was deducted.
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
- **Recipe & ingredient manager** with a live checklist (has a name / has
  ingredients / includes a soap base / has a benefit).
- **Assets drawer** with 4 tabs: My Photos, Library, Free Stock (Unsplash/Pixabay),
  and AI (open a generator, import the result).
- **True print routing.** `pdf-lib` stamps your flattened label onto the exact
  Avery grid at real inch dimensions — never the browser print dialog. WYSIWYG
  sheet preview, quantity + fill-sheet, and `PREFIX___01.pdf` file naming.
- **English & Spanish** (`react-i18next`).
- **Non-destructive history.** A 2000 ms debounced autosave writes snapshots you
  can restore from the History tab.

## Tech stack

| Concern | Library |
| --- | --- |
| App | React + Vite + TypeScript + Tailwind |
| Canvas editor | **Fabric.js v6** |
| State | **Zustand** (+ an imperative editor controller) |
| Local database | **Dexie / IndexedDB** |
| PDF export | **pdf-lib** |
| i18n | **react-i18next** |
| Fonts | **@fontsource** (offline) + Google Fonts (on demand) |
| Icons | lucide-react |

## Avery templates

`src/data/averyTemplates.json` is generated by `scripts/generate-avery-dataset.mjs`,
which merges Avery's authentic rectangle/address geometry (margins + gutters,
verified against Avery's published sizes) with a curated, mathematically-centered
set of round/oval/square/rounded templates.

```bash
npm run avery:generate   # rebuild the bundled dataset
npm run avery:scrape     # pull Avery's full live catalog and merge (see note)
```

> The live scraper hits Avery's API, which is behind Cloudflare and blocks
> datacenter/CI IPs (HTTP 403). Run it from a normal desktop/residential network.
> The app is fully functional with the bundled dataset regardless.

## Architecture notes

- `src/lib/fabric/editorController.ts` — the imperative core: canvas lifecycle,
  the strict 4-layer stack, object factory, alignment/stacking/group/crop,
  layers (incl. drag-reorder + panel multi-select), undo/redo, debounced
  autosave, and selection sync into the Zustand store.
- `src/lib/fabric/overlay.ts` — the visual bleed mask / cut line / safe zone,
  drawn in the canvas `after:render` pass (identity space).
- `src/lib/supplierImport.ts` — the supplier-link price importer: main-process
  fetch (Electron, no CORS) or browser fetch, JSON-LD / meta / regex scraping,
  and the Gemini structured-extraction fallback.
- `src/lib/receiptPdf.ts` — the 8.5″×11″ pdf-lib client receipt (brand band,
  itemized table, totals, footer) + silent save into `work_orders/`.
- `src/db/repositories.ts` — repo layer incl. clients/work-orders, the exact
  fractional usage math (`computeOrderUsage`) and reversible stock deduction.
- `src/lib/fabric/snapping.ts` — smart alignment guides + snap-to-center.
- `src/lib/layoutEngine.ts` — context-specific Front/Back/Side auto-layouts.
- `src/lib/pdfExport.ts` — exact Avery-grid PDF stamping (handles rotated ribbons).
- `src/components/Shell.tsx` — lazy-loads the Editor (Fabric) and Export (pdf-lib)
  screens so those heavy libraries stay out of the initial bundle.
- `scripts/smoke.mjs` — a headless-Chrome smoke test driving the real app via
  `window.gaiaEditor` / `window.gaiaTest` (add/undo/redo/align/flip/crop, curved
  text, recipe auto-layouts, a 25-ingredient back label fitting the safe zone,
  transparent logo → PDF, and correct page counts at 612×792pt).

### This is the requested Electron/SQLite app, delivered web-first

The original brief asked for Electron + better-sqlite3 + `<webview>` + electron-store.
This implementation uses the **browser-native equivalents** so it is truly
plug-and-play (open it and go, host the `dist/` folder anywhere) and fully
testable, while mapping 1:1 onto the desktop stack if you later wrap it:

| Requested (Electron) | Here (web-first) | Wrapping later |
| --- | --- | --- |
| `better-sqlite3` tables | Dexie/IndexedDB tables (identical shapes) | Swap the repo layer in `src/db` for a SQLite adapter |
| `electron-store` (API keys) | Settings row in the DB (local only) | Move to `electron-store` in the repo layer |
| Node `fs` file picker | File input + drag-and-drop + data URLs | Add `fs` in the main process |
| `<webview>` + `will-download` | AI tab opens a generator; import the result | Add a `<webview>` + `session.on('will-download')` |

The table shapes in `src/db/db.ts` (ingredients, recipes, assets, versions,
settings, clients, work orders + items) already match a SQLite schema, so only
the persistence adapter changes. The canonical better-sqlite3 DDL — including
the Work Orders pipeline and the updated inventory fields (`supplier_url`,
`stock_on_hand`, `bars_per_batch`, `retail_price`) — lives in
**`electron/schema.sql`**.

The desktop shell (`electron/main.cjs`) additionally provides: silent PDF
saving into the portable save system (`gaia:save-pdf`), CORS-free supplier
page fetching for the price importer (`gaia:fetch-url`), the AI-image
`will-download` interceptor, and a 25% accessibility zoom
(`zoomFactor: 1.25`) with no horizontal scrolling.
