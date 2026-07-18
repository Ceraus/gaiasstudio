# Gaia's Label Studio

A standalone, offline-first desktop app for designing and printing labels and stickers — built to feel as approachable as Canva, but tuned specifically for print-at-home label sheets (Avery and Avery-compatible stock).

It ships with **zero pre-loaded data**. Every ingredient, recipe, photo, and design starts empty so you build exactly the library you want.

## Highlights

- **Canva-style canvas editor** (Fabric.js) — layers, drag/resize/rotate, grouping, rich text with Google Fonts, opacity, smart magenta alignment guides, and a visual "print safe-zone" overlay instead of raw pixel/margin numbers.
- **Movable floating toolbox** with four tabs: Add Shape, Layers, Design Tools (properties), and History.
- **Non-destructive version history** — every change auto-saves (2s after you stop editing) to a local SQLite database; click any past version in the History tab to restore it instantly.
- **Your own ingredient & recipe library** — a plain-English CRUD tool with a live checklist (name / ingredients / soap base / benefit) so a non-technical user always knows what's missing.
- **4-tab asset drawer**: My Photos (local upload), Library (everything you've saved), Free Stock (Unsplash/Pixabay, optional API keys), and AI (an embedded Google AI Studio browser tab — anything you generate there is silently captured and dropped into your Library).
- **58+ bundled Avery templates** spanning round, oval, square, and rectangle label stock, plus a one-click "Check for new Avery templates" refresh that attempts a live pull from avery.com.
- **One-click contextual auto-layout** for Front (logo-centered), Back (ingredients/warnings kept inside a safe zone, away from decorative borders), and Side/Wrap (centered ribbon bar) label contexts — built from your saved recipe, entirely optional, and fully editable afterwards. The canvas never starts pre-populated; this is an opt-in shortcut, not a locked template.
- **Print-ready PDF export via `pdf-lib`** — never relies on the OS/browser print dialog. Renders your design into the exact Avery grid geometry and paginates automatically across sheets. Files are named `PREFIX___01.pdf`, `PREFIX___02.pdf`, etc.
- **English / Spanish** UI via `react-i18next`.

## Tech stack

| Concern | Choice |
|---|---|
| Shell | Electron 33 |
| UI | React 18 + Vite + Tailwind CSS |
| Canvas editor | Fabric.js 6 |
| State | Zustand |
| Local database | better-sqlite3 (ingredients, recipes, projects, versions, library assets — all start empty) |
| Settings/secrets | electron-store (local-only, encrypted at rest) |
| PDF export | pdf-lib |
| Localization | react-i18next (English/Spanish) |
| Embedded AI browser | Electron `<webview>` + a `will-download` interceptor |

## Getting started

```bash
npm install
npm run dev            # Vite dev server only (renders in a normal browser tab using a
                        # localStorage/in-memory fallback for window.api — handy for UI work)
npm run dev:electron   # Full Electron app with hot-reloading renderer
npm run build           # Type-check + build the renderer and compile the main process
npm start                # Build then launch the packaged app locally
npm run package          # Build + electron-builder installer/app bundle
```

`npm install` also runs `electron-rebuild` for `better-sqlite3` automatically (via `postinstall`), since native modules must be compiled against Electron's Node ABI, not your system Node's.

## Project layout

```
electron/          Main process: SQLite schema/queries, electron-store settings,
                    Avery scraper, pdf-lib export engine, webview download interceptor,
                    all ipcMain handlers.
shared/contract.ts  Types + IPC channel names shared by main and renderer.
resources/          Bundled offline Avery template catalog (JSON).
scripts/            Avery catalog generator/scraper utilities (run outside the app too).
src/
  components/       step1-template, step2-assets, step3-editor, step4-print, recipes, settings
  lib/              Fabric.js helpers (smart guides, bleed mask, shape factory, font loader,
                     contextual layout engine, unit conversions, flatten-to-PDF-image helper)
  state/            Zustand stores (wizard/app state, editor/undo-redo state)
  i18n/             English + Spanish translation files
```

## Avery template catalog

`resources/avery_templates_offline.json` bundles real label dimensions and labels-per-sheet counts for ~58 SKUs (rounds from 0.75" to 3.5", ovals, squares, and the full 5160-family rectangle/address-label lineup, plus Avery 6871). Geometry for SKUs without a publicly documented pitch/margin is derived by centering the known grid on a Letter sheet; SKUs with widely-published exact geometry (5160–5167, 6871) are marked `verifiedGeometry: true` and use the documented figures.

Avery's site sits behind Cloudflare bot-management, so a plain HTTP request (curl, fetch from Node) is normally blocked with a 403 challenge page. The in-app "Check for new Avery templates" button (`electron/averyScraper.ts`) works around this by loading avery.com in a real, hidden Chromium window first (letting any JS challenge resolve), then issuing the API request from inside that page's own context. If Cloudflare still blocks it (e.g. an interactive challenge), the app simply keeps using the bundled catalog — nothing breaks.

## Data & privacy

- No seed/demo data is ever inserted — `ingredients`, `recipes`, `projects`, `versions`, and `library_assets` all start as empty SQLite tables.
- API keys (Google AI Studio, Unsplash, Pixabay) are stored only in local `electron-store`, encrypted at rest, and are never sent anywhere except directly to the corresponding provider's API when you use that feature.
