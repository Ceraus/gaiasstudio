# Changelog — Clearplan Command

All notable changes to this project are documented in this file.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-07-10

### First production release of the Redux architecture.

This release constitutes the complete transplant and Redux-binding of every major
module from the Pre-Redux (Zustand) codebase into a unified Redux Toolkit store,
together with a full-stack Vault Import pipeline and a Meilisearch/Scout search gateway.

---

### Added

#### Authentication & Session
- **Login UI transplant** — full Pre-Redux visual shell (Tailwind layout, globe background,
  gradient card) grafted onto Redux `authSlice`; `useSelector`/`useDispatch` bindings for
  `email`, `password`, `handleSubmit`, and `login` dispatch preserved exactly.
- **Offline dev login** — `devSession.ts` + gitignored `src/dev/offlineAccount.local.ts`
  allow local development without Microsoft Entra SSO. `AuthContext` patched to detect and
  load dev session on startup; `logout` clears it.
- **Login preloader** — `LoginFallback` component in `LoginAuthLayout.tsx` replaces the
  generic "Loading…" spinner with a branded bootstrap screen (logo, spinner, version text).
- **SSO error passthrough** — `useSearchParams` reads `error` query param and surfaces it
  in the login form's error banner.

#### Branding
- **Clearplan Command rename** — all user-visible strings previously reading "Clearplan" or
  "Command" independently updated to "Clearplan Command" across `index.html`,
  `appConfig.ts`, `AuthGuard.tsx`, `LoginAuthLayout.tsx`, `LoginPage.tsx`, `AppShell.tsx`,
  `AppRoutes.tsx`, `ProfilePage.tsx`, `studioSlice.ts`, `AnimatedCommandLogo.tsx`,
  `PwaLifecycle.tsx`, `ActivityMapPage.tsx`, `AdminPages.tsx`, `ProjectPlanWorkspace.tsx`,
  `HubPlaceholderPage.tsx`, and `public/offline.html`. Internal code identifiers unchanged.
- **Favicon** — SVG favicon using the Command glyph path with blue gradient and glow effect.
- **Sidebar logo** — `AnimatedCommandLogo` replaces the old "CP ClearPlan" pill badge.
- **Sidebar version badge** — `v1.0.0` displayed at the bottom of the sidebar (hidden when
  collapsed). Version sourced from `package.json` via Vite `define: __APP_VERSION__`.

#### Shell & Navigation
- **Plexus effect** — `PlexusOverlay` canvas component ported from Pre-Redux and mounted
  inside the sidebar behind navigation links.
- **Header cleanup** — "ClearPlan" pill button removed; avatar fallback name updated.

#### Contract Hub
- **`contractsSlice`** — Redux slice managing `records`, `localDrafts`, `activeDraftId`,
  `formDraft`, `searchResults`, `searchQuery`, and full async thunk set:
  `loadContracts`, `submitContract`, `brokerMeilisearchQuery`.
- **`ContractDashboard`** — three-lane swimlane layout (Drafts / Pending Acceptance /
  Executed Contracts) with `LocalDraftCard`, `ServerContractCard`, KPI tiles, expiry
  warnings, and taxonomy quick-create bar.
- **`ContractCreation`** — split-pane Live Studio: `TaxonomyActionBar` (7-column grid,
  Vault Import, Import XLS, five taxonomy tiles), Builder/Layout tabs, dynamic field
  sections per taxonomy tier, `NOT AVAILABLE` toggles on every input, live PDF preview,
  `Save Draft` + `Finalize` buttons. All inputs bound to Redux `formDraft` via
  `updateDraftField`. `Finalize` dispatches `submitContract`.
- **`ClientDistributionMap`** — Leaflet/React-Leaflet map pulling client locations from
  Redux `clientDistributionSlice`. Full-bleed rendering (negative-margin wrapper in
  `ContractsPage`). Header strip with client count. Dynamic viewport height.
- **`ContractsPage`** — persistent tab bar (Dashboard / New Contract / Client Map) always
  visible above content; `handleResumeDraft` callback routes from dashboard to Live Studio.
- **`ContractViewModal`** — read-only modal for viewing pending and executed contracts.
- **Local draft management** — `saveLocalDraft`, `resumeLocalDraft`, `deleteLocalDraft`,
  `loadServerContractIntoBuilder` actions in `contractsSlice`; `LocalDraft` type in
  `contract.ts`.
- **Legal disclaimer** — placeholder text block in PDF preview; corresponding textarea in
  Layout tab; `legalDisclaimer` field in `ContractFormDraft`.
- **"CONTRACT TYPE" badge** — displayed on Simple-1, Simple-2, and all future taxonomy
  types inside the Live Builder.
- **Light mode** — all dark tints removed from Contract Hub; `darkMode: 'class'` in
  `tailwind.config.ts`; `color-scheme: light` in `:root` CSS prevents OS-forced dark mode.
- **Icon sizing** — taxonomy bar icons at `h-[42px] w-[42px]` in 72 px wells, consistent
  across Dashboard `TaxonomyLane` and Creation `TaxonomyActionBar`.
- **"Total Investment" label** — strictly used in all financial summary rows; "Project
  Investment" and "Quote Total" labels replaced throughout.
- **Quote logic exclusion** — no Quote tabs, buttons, or routes exist anywhere in the codebase.
- **5-tier taxonomy enforcement** — `SIMPLE_1`, `SIMPLE_2`, `SLA_HELPDESK`,
  `SLA_MONTHLY_NETWORK`, `SLA_ACCESS_CONTROL` strictly applied to all type selectors,
  badges, PDF sections, and API payloads.

#### Meilisearch Search Gateway
- **`brokerMeilisearchQuery` thunk** — dispatches to `GET /api/v1/contracts/search` 
  (Laravel Scout → Meilisearch index `contracts`; SQL LIKE fallback when Meilisearch is
  not configured). Strictly scoped — no `quotes` index contacted.
- **`ContractSearchBar`** — standalone component with 300 ms debounce (matching Pre-Redux),
  minimum 2 characters, spinner during search, × clear button. Dispatches
  `brokerMeilisearchQuery` on every debounced keystroke; `clearSearch` on empty.
- **Search results pane** — replaces KPI tiles + swimlanes when a query is active; renders
  `SearchHitCard` per result with client name, 5-tier taxonomy badge, and Total Investment.
  Taxonomy quick-create lane hidden during active search to keep focus on results.
- **`searchContractsApi`** in `contractApi.ts` — typed wrapper for the search endpoint.

#### Mouse & Keyboard Settings
- **`preferencesSlice`** — Redux slice for `shortcutOverrides`, `radialMenuEnabled`,
  `reducedMotion`, `compactDensity`; `savePreferences` async thunk for backend PATCH.
- **`MouseKeyboardPanel`** — transplanted settings UI: toggles, `KeyboardShortcutEditor`,
  sensitivity sliders; all inputs bound to `useSelector`/`useDispatch`.
- **`useGlobalHotkeys`** — global `keydown` listener reading `shortcutOverrides` from Redux;
  mounted at root in `AppShell`.
- **`ProfilePage`** — two-tab layout: Account and Mouse & Keyboard.

#### Vault Import Pipeline
- **`vaultImportSlice`** — `brokerLegacyVaultData` async thunk sends raw `File` as
  `multipart/form-data` to `POST /api/v1/contracts/vault/extract`. Pipeline stages:
  `uploading` → `extracting` (2 s timer) → `succeeded` / `failed`.
- **`VaultImportModal`** — drag-and-drop zone (PDF, TXT, RTF, DOC, DOCX, XLS, XLSX, CSV);
  three-step progress stepper (Upload → Extract → Done); auto-slots `tier` and `draft`
  fields into Live Builder on success via `setActiveContractType` + `updateDraftField`.
- **`VaultImportModal` in Dashboard** — "Vault Import" and "Import XLS" buttons in
  `TaxonomyLane` open the same modal; on success navigates to the Live Builder tab.

#### Backend — Global-API (Laravel)
- **`POST /api/v1/contracts/vault/extract`** — new synchronous extraction endpoint inside
  the `auth:sanctum + org` contracts route group.
- **`VaultExtractController`** — validates upload, calls `VaultExtractService`, dispatches
  `ArchiveVaultDocumentJob` (non-blocking), returns 200 JSON matching
  `VaultMappedPayload { tier, draft }`.
- **`VaultExtractService`** — full synchronous pipeline:
  1. Native text extraction: PDF via `PdfTextBroker` (FlateDecode stream parser + `pdftotext`
     shell fallback), DOCX via `ZipArchive` XML extraction, TXT/CSV/RTF via direct read,
     DOC via `catdoc` shell fallback.
  2. Sanitization: `ContractOcrRegexBroker::sanitize()` strips hidden Unicode, control
     bytes, and mojibake.
  3. Qwen/Ollama inference: `POST {OLLAMA_URL}/api/generate` with `qwen2.5-coder` model,
     `format: json`, enforced 5-tier taxonomy prompt from `config/intelligent_extraction.php`.
  4. Taxonomy validation: rejects any `detected_type` outside the five allowed tiers.
  5. Regex truth layer: `ContractOcrRegexBroker::applyTruth()` overrides AI email,
     client name, total, and date fields when regex finds stronger matches.
  6. Draft mapping: extracted fields mapped to `ContractFormDraft` field names for direct
     Redux consumption (`entityName`, `contactEmail`, `serviceAddress`, `lineItems`, etc.).
  - No Gotenberg or Stirling-PDF dependency anywhere in this pipeline.
- **`PdfTextBroker`** — ported from Pre-Redux; native PHP PDF stream parser (no external
  packages). FlateDecode via `gzuncompress`/`gzinflate`; Tj/TJ text operator parsing.
  `pdftotext` shell fallback when binary is available.
- **`ContractOcrRegexBroker`** — ported from Pre-Redux; deterministic regex extraction
  (email, client name, currency total, effective date, contract duration) + `sanitize()`
  method for pre-AI text cleaning.
- **`ArchiveVaultDocumentJob`** — queued Laravel job (`documents` queue, 3 retries,
  30 s back-off). After extraction response is returned to frontend, pushes original file
  to `POST {PAPERLESS_URL}/api/documents/post_document/` for archival and Meilisearch
  indexing via Paperless-ngx.

### Changed

- `package.json` version `0.1.0` → `1.0.0`.
- `tailwind.config.ts` — `darkMode: 'class'` (was implicit `'media'`).
- `vite.config.ts` — `define: { __APP_VERSION__ }` injected from `package.json`.
- `index.html` — favicon updated to `favicon.svg`; title and meta tags updated to
  "Clearplan Command".
- `AppRoutes.tsx` — `RouteFallback` message updated; `/contracts` lazy-loads
  `ContractsPage`; `/login` wrapped in its own `Suspense`.
- `studioSlice.ts` — footer text updated to "Contract generated by Clearplan Command".
- `src/styles/index.css` — `color-scheme: light` on `:root`; globe fade-in keyframes.

### Fixed

- 404 from `loadContracts` treated as empty list (not a Redux error state).
- `finalizing` prop checked `createStatus === 'submitting'` (was `'loading'`).
- `Save Draft` button dark background caused by `darkMode: 'media'` + browser-forced dark
  mode — resolved by `darkMode: 'class'` + `color-scheme: light`.
- Taxonomy bar text overflow — CSS grid with `line-clamp-2` + `break-words`.
- Map height clipped — replaced fixed `520px` with `calc(100dvh - 11rem)`.

---

## [0.1.0] — 2026 (initial scaffold)

Initial Redux workspace scaffold (Vite + React + TypeScript + Tailwind).
Base auth shell, routing, AppShell, and Capacitor configuration.
