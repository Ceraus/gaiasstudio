-- ============================================================================
-- Gaia's Label Studio — better-sqlite3 schema
-- ============================================================================
-- This is the canonical SQLite DDL for the desktop build. The running app
-- persists through Dexie/IndexedDB with IDENTICAL table shapes (src/db/db.ts,
-- version 9); swapping the persistence adapter in src/db/repositories.ts for a
-- better-sqlite3 layer requires no application-code changes.
--
-- Conventions
--   • ids are UUID strings (crypto.randomUUID()).
--   • *_at columns are Unix epoch **milliseconds** (Date.now()).
--   • Money is REAL in USD; fractional costs are $/gram or $/drop.
--   • JSON columns hold arrays/objects that never need relational queries
--     (canvas JSON, string arrays, usage snapshots).
--
-- Usage (main process):
--   const db = require('better-sqlite3')(path.join(saveSystemDir, 'gaia.db'));
--   db.pragma('journal_mode = WAL');
--   db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- Ingredients — the Smart Pantry. One row per raw material.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingredients (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  benefit          TEXT NOT NULL DEFAULT '',
  inci             TEXT,                          -- INCI / scientific name for back labels
  is_soap_base     INTEGER NOT NULL DEFAULT 0,    -- boolean
  active           INTEGER NOT NULL DEFAULT 0,    -- boolean; "part of my regular toolkit"
  category         TEXT,                          -- 'oil'|'butter'|'clay'|'botanical'|'floral'|'citrus'|
                                                  -- 'exfoliant'|'essential-oil'|'fragrance'|'colorant'|
                                                  -- 'base'|'wax'|'additive'|'milk'|'seed'|'spice'|'other'
  cost_per_oz      REAL,                          -- legacy pricing field (kept for migration)

  -- ── Inventory / COGS (the "Zero-Math" pricing model) ──────────────────────
  measurement_type TEXT,                          -- 'weight' (grams) | 'volume' (drops; 1 ml = 20 drops)
  purchase_size    REAL,                          -- e.g. 16 for a 16 oz bottle
  purchase_unit    TEXT,                          -- 'oz' | 'lbs' | 'ml' | 'g'
  purchase_price   REAL,                          -- what was paid for the container (USD)
  fractional_cost  REAL,                          -- AUTO: $/gram (weight) or $/drop (volume)
  supplier_url     TEXT,                          -- product page for the AI price importer
  stock_on_hand    REAL,                          -- current stock in base units (g or drops);
                                                  -- NULL = not tracked (work orders skip it)

  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ingredients_name     ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_active   ON ingredients(active);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);

-- ----------------------------------------------------------------------------
-- Recipes — a product (soap) definition.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipes (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  benefit            TEXT NOT NULL DEFAULT '',
  ingredient_ids     TEXT NOT NULL DEFAULT '[]',  -- JSON string[] of ingredients.id
  ingredient_amounts TEXT NOT NULL DEFAULT '{}',  -- JSON { [ingredientId]: grams|drops } PER BATCH
  bars_per_batch     REAL,                        -- units one batch yields; NULL/0 → 1
  retail_price       REAL,                        -- USD per bar; pre-fills work-order items
  net_weight         TEXT,
  directions         TEXT,
  warnings           TEXT,
  footer             TEXT,
  color              TEXT,                        -- optional Tailwind color key
  custom_costs       TEXT NOT NULL DEFAULT '[]',  -- JSON [{id,name,cost,unit?}] per-bar packaging costs
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);

-- ----------------------------------------------------------------------------
-- Clients — one row per customer (Phase 2: Work Orders).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  notes      TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- ----------------------------------------------------------------------------
-- Work Orders — a sale to a client. Completing an order deducts tracked
-- ingredient stock and freezes a usage/COGS snapshot for reversibility.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_orders (
  id             TEXT PRIMARY KEY,
  order_number   TEXT NOT NULL UNIQUE,            -- human-friendly 'ORD-001'
  client_id      TEXT NOT NULL REFERENCES clients(id),
  client_name    TEXT NOT NULL,                   -- denormalized for dashboard/receipts
  status         TEXT NOT NULL DEFAULT 'open'     -- 'open' | 'completed'
                 CHECK (status IN ('open', 'completed')),
  notes          TEXT,
  subtotal       REAL NOT NULL DEFAULT 0,         -- sum of item line totals (USD)
  total          REAL NOT NULL DEFAULT 0,         -- grand total (USD)
  material_cost  REAL,                            -- COGS snapshot computed at completion
  usage_snapshot TEXT,                            -- JSON WorkOrderUsageLine[]: exactly what was
                                                  -- deducted, so "Reopen" can restore stock
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  completed_at   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_work_orders_client  ON work_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status  ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_created ON work_orders(created_at);

-- ----------------------------------------------------------------------------
-- Work Order Items — one recipe line per row. Name & unit price are frozen at
-- order time so receipts survive later recipe renames/deletes.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_order_items (
  id            TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  recipe_id     TEXT NOT NULL,                    -- soft reference to recipes.id
  recipe_name   TEXT NOT NULL,                    -- denormalized at time of sale
  quantity      REAL NOT NULL CHECK (quantity > 0),
  unit_price    REAL NOT NULL DEFAULT 0,          -- USD per unit at time of sale
  line_total    REAL NOT NULL DEFAULT 0,          -- quantity × unit_price
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_work_order_items_order  ON work_order_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_items_recipe ON work_order_items(recipe_id);

-- ----------------------------------------------------------------------------
-- Set Purchases — items bought together in one purchase (e.g. a 36-mica set);
-- the total price is split equally across the assigned ingredients.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS set_purchases (
  id                       TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  total_price              REAL NOT NULL,
  item_count               INTEGER NOT NULL,
  price_per_item           REAL NOT NULL,         -- AUTO: total_price / item_count
  assigned_ingredient_ids  TEXT NOT NULL DEFAULT '[]', -- JSON string[]
  created_at               INTEGER NOT NULL
);

-- ----------------------------------------------------------------------------
-- Assets — user photos / logos / AI images stored as data URLs (offline-first).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL,                       -- 'photo'|'logo'|'ai'|'stock'|'background'
  data_url   TEXT NOT NULL,
  width      INTEGER NOT NULL,
  height     INTEGER NOT NULL,
  file_size  INTEGER,
  archived   INTEGER NOT NULL DEFAULT 0,          -- boolean
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_kind ON assets(kind);

-- ----------------------------------------------------------------------------
-- Versions — non-destructive design history (bounded to 40 per design in code).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS versions (
  id          TEXT PRIMARY KEY,
  design_id   TEXT NOT NULL,
  template_id TEXT NOT NULL,
  context     TEXT NOT NULL,                      -- 'front' | 'back' | 'side'
  canvas_json TEXT NOT NULL,                      -- serialized Fabric.js canvas
  thumbnail   TEXT,
  label       TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_versions_design ON versions(design_id);

-- ----------------------------------------------------------------------------
-- Label Sets — front/back/side designs grouped for one product line.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS label_sets (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  recipe_id         TEXT,
  front_json        TEXT,
  back_json         TEXT,
  side_json         TEXT,
  front_template_id TEXT,
  back_template_id  TEXT,
  side_template_id  TEXT,
  front_thumb       TEXT,
  back_thumb        TEXT,
  side_thumb        TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

-- ----------------------------------------------------------------------------
-- Drafts — the Workspace scratchpad (auto-saved work in progress).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drafts (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  design_json TEXT NOT NULL,
  template_id TEXT NOT NULL,
  context     TEXT NOT NULL,
  thumb       TEXT,
  notes       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drafts_updated ON drafts(updated_at);

-- ----------------------------------------------------------------------------
-- Settings — single-row app configuration (id is always 'app').
-- API keys stay local; in a hardened build move them to electron-store / keytar.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id                TEXT PRIMARY KEY CHECK (id = 'app'),
  language          TEXT NOT NULL DEFAULT 'en',
  filename_prefix   TEXT NOT NULL DEFAULT 'ROSA',
  google_ai_api_key TEXT,
  unsplash_key      TEXT,
  pixabay_key       TEXT,
  bleed_in          REAL NOT NULL DEFAULT 0.0625,
  safe_in           REAL NOT NULL DEFAULT 0.0625,
  onboarded         INTEGER NOT NULL DEFAULT 0,
  brand_colors      TEXT NOT NULL DEFAULT '[]',   -- JSON string[] of hex colors
  business_name     TEXT,
  business_address  TEXT,
  contact           TEXT,
  debug_mode        INTEGER NOT NULL DEFAULT 0,
  show_label_sets   INTEGER NOT NULL DEFAULT 0
);
