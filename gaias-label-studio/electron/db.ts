import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type {
  Ingredient,
  LibraryAsset,
  Project,
  ProjectVersion,
  Recipe,
  RecipeIngredientRef,
} from "../shared/contract";

let db: Database.Database;

export function initDatabase(userDataDir: string): Database.Database {
  const dataDir = path.join(userDataDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "gaia-label-studio.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Intentionally empty tables: no seed data is inserted anywhere in this file.
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      benefit TEXT NOT NULL DEFAULT '',
      is_soap_base INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      benefit TEXT NOT NULL DEFAULT '',
      ingredients_json TEXT NOT NULL DEFAULT '[]',
      directions TEXT NOT NULL DEFAULT '',
      warnings TEXT NOT NULL DEFAULT '',
      net_weight TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      template_sku TEXT NOT NULL,
      context TEXT NOT NULL DEFAULT 'front',
      recipe_id INTEGER,
      canvas_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      canvas_json TEXT NOT NULL,
      label TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS library_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'upload',
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized");
  return db;
}

const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------
export function listIngredients(): Ingredient[] {
  const rows = getDb().prepare(`SELECT * FROM ingredients ORDER BY name COLLATE NOCASE ASC`).all() as any[];
  return rows.map(rowToIngredient);
}

export function upsertIngredient(input: Partial<Ingredient> & { name: string; benefit: string; isSoapBase: boolean }): Ingredient {
  const ts = nowIso();
  if (input.id) {
    getDb()
      .prepare(`UPDATE ingredients SET name = ?, benefit = ?, is_soap_base = ?, updated_at = ? WHERE id = ?`)
      .run(input.name, input.benefit, input.isSoapBase ? 1 : 0, ts, input.id);
    return rowToIngredient(getDb().prepare(`SELECT * FROM ingredients WHERE id = ?`).get(input.id));
  }
  const result = getDb()
    .prepare(`INSERT INTO ingredients (name, benefit, is_soap_base, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
    .run(input.name, input.benefit, input.isSoapBase ? 1 : 0, ts, ts);
  return rowToIngredient(getDb().prepare(`SELECT * FROM ingredients WHERE id = ?`).get(result.lastInsertRowid));
}

export function deleteIngredient(id: number): void {
  getDb().prepare(`DELETE FROM ingredients WHERE id = ?`).run(id);
}

function rowToIngredient(row: any): Ingredient {
  return {
    id: row.id,
    name: row.name,
    benefit: row.benefit,
    isSoapBase: !!row.is_soap_base,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------
export function listRecipes(): Recipe[] {
  const rows = getDb().prepare(`SELECT * FROM recipes ORDER BY updated_at DESC`).all() as any[];
  return rows.map(rowToRecipe);
}

export function upsertRecipe(
  input: Partial<Recipe> & {
    name: string;
    benefit: string;
    ingredients: RecipeIngredientRef[];
    directions?: string;
    warnings?: string;
    netWeight?: string;
  }
): Recipe {
  const ts = nowIso();
  const ingredientsJson = JSON.stringify(input.ingredients ?? []);
  if (input.id) {
    getDb()
      .prepare(
        `UPDATE recipes SET name = ?, benefit = ?, ingredients_json = ?, directions = ?, warnings = ?, net_weight = ?, updated_at = ? WHERE id = ?`
      )
      .run(input.name, input.benefit, ingredientsJson, input.directions ?? "", input.warnings ?? "", input.netWeight ?? "", ts, input.id);
    return rowToRecipe(getDb().prepare(`SELECT * FROM recipes WHERE id = ?`).get(input.id));
  }
  const result = getDb()
    .prepare(
      `INSERT INTO recipes (name, benefit, ingredients_json, directions, warnings, net_weight, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(input.name, input.benefit, ingredientsJson, input.directions ?? "", input.warnings ?? "", input.netWeight ?? "", ts, ts);
  return rowToRecipe(getDb().prepare(`SELECT * FROM recipes WHERE id = ?`).get(result.lastInsertRowid));
}

export function deleteRecipe(id: number): void {
  getDb().prepare(`DELETE FROM recipes WHERE id = ?`).run(id);
}

function rowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    name: row.name,
    benefit: row.benefit,
    ingredients: JSON.parse(row.ingredients_json || "[]"),
    directions: row.directions,
    warnings: row.warnings,
    netWeight: row.net_weight,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export function listProjects(): Project[] {
  const rows = getDb().prepare(`SELECT * FROM projects ORDER BY updated_at DESC`).all() as any[];
  return rows.map(rowToProject);
}

export function upsertProject(
  input: Partial<Project> & { name: string; templateSku: string; context: string }
): Project {
  const ts = nowIso();
  if (input.id) {
    getDb()
      .prepare(
        `UPDATE projects SET name = ?, template_sku = ?, context = ?, recipe_id = ?, canvas_json = ?, updated_at = ? WHERE id = ?`
      )
      .run(input.name, input.templateSku, input.context, input.recipeId ?? null, input.canvasJson ?? null, ts, input.id);
    return rowToProject(getDb().prepare(`SELECT * FROM projects WHERE id = ?`).get(input.id));
  }
  const result = getDb()
    .prepare(
      `INSERT INTO projects (name, template_sku, context, recipe_id, canvas_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(input.name, input.templateSku, input.context, input.recipeId ?? null, input.canvasJson ?? null, ts, ts);
  return rowToProject(getDb().prepare(`SELECT * FROM projects WHERE id = ?`).get(result.lastInsertRowid));
}

export function deleteProject(id: number): void {
  getDb().prepare(`DELETE FROM projects WHERE id = ?`).run(id);
}

function rowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    templateSku: row.template_sku,
    context: row.context,
    recipeId: row.recipe_id,
    canvasJson: row.canvas_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Versions (non-destructive history)
// ---------------------------------------------------------------------------
export function saveVersion(projectId: number, canvasJson: string, label?: string): ProjectVersion {
  const ts = nowIso();
  const result = getDb()
    .prepare(`INSERT INTO versions (project_id, canvas_json, label, created_at) VALUES (?, ?, ?, ?)`)
    .run(projectId, canvasJson, label ?? null, ts);

  // Keep at most the 50 most recent versions per project to bound disk usage.
  getDb()
    .prepare(
      `DELETE FROM versions WHERE project_id = ? AND id NOT IN (
         SELECT id FROM versions WHERE project_id = ? ORDER BY created_at DESC LIMIT 50
       )`
    )
    .run(projectId, projectId);

  return rowToVersion(getDb().prepare(`SELECT * FROM versions WHERE id = ?`).get(result.lastInsertRowid));
}

export function listVersions(projectId: number): ProjectVersion[] {
  const rows = getDb()
    .prepare(`SELECT * FROM versions WHERE project_id = ? ORDER BY created_at DESC`)
    .all(projectId) as any[];
  return rows.map(rowToVersion);
}

export function getVersion(versionId: number): ProjectVersion {
  return rowToVersion(getDb().prepare(`SELECT * FROM versions WHERE id = ?`).get(versionId));
}

function rowToVersion(row: any): ProjectVersion {
  return {
    id: row.id,
    projectId: row.project_id,
    canvasJson: row.canvas_json,
    createdAt: row.created_at,
    label: row.label ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Library assets
// ---------------------------------------------------------------------------
export function listLibraryAssets(): LibraryAsset[] {
  const rows = getDb().prepare(`SELECT * FROM library_assets ORDER BY created_at DESC`).all() as any[];
  return rows.map(rowToAsset);
}

export function addLibraryAsset(input: { fileName: string; filePath: string; source: LibraryAsset["source"] }): LibraryAsset {
  const ts = nowIso();
  const result = getDb()
    .prepare(`INSERT INTO library_assets (file_name, file_path, source, created_at) VALUES (?, ?, ?, ?)`)
    .run(input.fileName, input.filePath, input.source, ts);
  return rowToAsset(getDb().prepare(`SELECT * FROM library_assets WHERE id = ?`).get(result.lastInsertRowid));
}

export function deleteLibraryAsset(id: number): void {
  getDb().prepare(`DELETE FROM library_assets WHERE id = ?`).run(id);
}

function rowToAsset(row: any): LibraryAsset {
  return {
    id: row.id,
    fileName: row.file_name,
    filePath: row.file_path,
    source: row.source,
    createdAt: row.created_at,
  };
}
