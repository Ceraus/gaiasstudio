/**
 * Compile src/data/offlineIngredientCatalog.json from INGREDIENT_SEED plus
 * extra soap-maker names already in-repo (i18n keys, colorful icon map) and a
 * soap-relevant CosIng subset.
 *
 * This JSON is an *autocomplete / icon backlog only*. CosIng rows are never
 * written to INGREDIENT_SEED and must never be imported into Dexie via
 * syncIngredientCatalog(). Picking a suggestion is an explicit add.
 *
 * Run: node scripts/build-offline-ingredient-catalog.mjs
 *      node scripts/build-offline-ingredient-catalog.mjs --refresh-cosing
 *      node scripts/build-offline-ingredient-catalog.mjs --names-only
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = path.join(root, 'src/data/ingredientSeed.ts');
const iconPath = path.join(root, 'src/data/ingredientIconPaths.tsx');
const enPath = path.join(root, 'src/i18n/en.json');
const esPath = path.join(root, 'src/i18n/es.json');
const outPath = path.join(root, 'src/data/offlineIngredientCatalog.json');
const slugsPath = path.join(root, 'src/data/bundledIngredientIconSlugs.json');
const pngDir = path.join(root, 'public/assets/icons/ingredients');

const COSING_URL =
  'https://raw.githubusercontent.com/inhouse-work/cosing/master/data/ingredients.csv';
const COSING_RAW = path.join(root, 'scripts/cosing-raw.csv');

const TOKEN_ALIASES = {
  eo: 'essential oil',
  'essential oils': 'essential oil',
  glycerine: 'glycerin',
  colour: 'color',
  'vitamin e oil': 'tocopherol',
};

const CATEGORIES = new Set([
  'oil', 'butter', 'clay', 'botanical', 'floral', 'citrus', 'exfoliant',
  'essential-oil', 'fragrance', 'colorant', 'base', 'wax', 'additive',
  'milk', 'seed', 'spice', 'other',
]);

export function canonicalizeIngredientName(value) {
  let normalized = String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  for (const [from, to] of Object.entries(TOKEN_ALIASES)) {
    const pattern = new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    normalized = normalized.replace(pattern, to);
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

export function canonicalIngredientKey(candidate) {
  return canonicalizeIngredientName(candidate.inci?.trim() || candidate.name);
}

export function slugifyIngredientName(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function unescapeTs(value) {
  return value.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

function titleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/\bEo\b/g, 'EO')
    .replace(/\bFo\b/g, 'FO')
    .replace(/\bCi (\d+)/g, 'CI $1');
}

function inferCategory(value) {
  const text = String(value).toLowerCase();
  if (/essential oil|\beo\b|volatile oil/.test(text)) return 'essential-oil';
  if (/\bfragrance oil\b|\bfo\b|\bfragrance\b/.test(text)) return 'fragrance';
  if (/\bbutter\b/.test(text)) return 'butter';
  if (/\bwax\b/.test(text)) return 'wax';
  if (/clay|kaolin|bentonite/.test(text)) return 'clay';
  if (/color|colour|mica|pigment|ci \d/.test(text)) return 'colorant';
  if (/flower|floral|petal|blossom/.test(text)) return 'floral';
  if (/citrus|lemon|orange|lime|grapefruit/.test(text)) return 'citrus';
  if (/milk|lactis|\blac\b/.test(text)) return 'milk';
  if (/\boil\b|emollient/.test(text)) return 'oil';
  if (/seed|pod/.test(text)) return 'seed';
  if (/powder|scrub|exfoli|salt/.test(text)) return 'exfoliant';
  if (/extract|leaf|root|herb|botanical|fruit/.test(text)) return 'botanical';
  if (/soap base|glycerin base|melt & pour|sodium cocoate|surfactant|hydroxide/.test(text)) return 'base';
  if (/spice|cinnamon|clove|ginger/.test(text)) return 'spice';
  return 'additive';
}

function looksLikeSoapIngredient(name) {
  const text = name.toLowerCase();
  if (text.length < 4) return false;
  if (/\b(soap colorant|icon|path|drop)\b/.test(text) && !/\b(mica|clay|oil|butter)\b/.test(text)) {
    return /colorant|mica/.test(text);
  }
  return (
    /\b(oil|butter|wax|clay|extract|powder|mica|fragrance|essential|base|salt|milk|eo|fo|botanical|herb|petal|seed|juice|acid|glycerin|lye|hydroxide|charcoal|honey|oatmeal|vitamin|soap|lye)\b/.test(text)
    || text.split(/\s+/).length >= 2
  );
}

function parseSeed(source) {
  const start = source.indexOf('export const INGREDIENT_SEED');
  const end = source.indexOf('export const INGREDIENT_CATALOG_SIZE');
  const chunk = source.slice(start, end === -1 ? undefined : end);
  const entries = [];
  const re = /\{\s*name:\s*'((?:\\'|[^'])*)'\s*,\s*inci:\s*'((?:\\'|[^'])*)'[\s\S]*?category:\s*'([^']+)'/g;
  let match;
  while ((match = re.exec(chunk))) {
    const category = CATEGORIES.has(match[3]) ? match[3] : inferCategory(match[1]);
    entries.push({
      name: unescapeTs(match[1]),
      inci: unescapeTs(match[2]),
      category,
    });
  }
  return entries;
}

function parseColorfulIconKeys(source) {
  const start = source.indexOf('export const COLORFUL_INGREDIENT_ICON_MAP');
  if (start < 0) return [];
  const chunk = source.slice(start);
  const keys = [];
  const re = /^\s+'([^']+)':/gm;
  let match;
  while ((match = re.exec(chunk))) keys.push(match[1].trim());
  return [...new Set(keys)];
}

function parseMonoIconKeys(source) {
  const start = source.indexOf('export const INGREDIENT_ICON_MAP');
  const end = source.indexOf('const SORTED_INGREDIENT_ICON_KEYS');
  if (start < 0) return [];
  const chunk = source.slice(start, end === -1 ? undefined : end);
  const keys = [];
  const re = /^\s+'([^']+)':\s*\{/gm;
  let match;
  while ((match = re.exec(chunk))) keys.push(match[1].trim());
  return [...new Set(keys)];
}

function listExistingPngSlugs() {
  if (!fs.existsSync(pngDir)) return [];
  return fs.readdirSync(pngDir)
    .filter((file) => file.toLowerCase().endsWith('.png'))
    .map((file) => file.replace(/\.png$/i, ''))
    .sort();
}

function addAlias(entry, alias) {
  const trimmed = String(alias || '').trim();
  if (!trimmed) return;
  if (canonicalizeIngredientName(trimmed) === canonicalizeIngredientName(entry.name)) return;
  if (entry.inci && canonicalizeIngredientName(trimmed) === canonicalizeIngredientName(entry.inci)) return;
  const existing = new Set((entry.aliases ?? []).map((item) => canonicalizeIngredientName(item)));
  if (existing.has(canonicalizeIngredientName(trimmed))) return;
  entry.aliases = [...(entry.aliases ?? []), trimmed];
}

function ingredientNameKey(name) {
  return String(name).toLowerCase().replace(/ /g, '_');
}

function buildEnglishToSpanish(enNames, esNames) {
  const map = new Map();
  for (const [key, enName] of Object.entries(enNames)) {
    const esName = String(esNames[key] || '').trim();
    const english = String(enName || '').trim();
    if (!esName || !english) continue;
    if (canonicalizeIngredientName(esName) === canonicalizeIngredientName(english)) continue;
    map.set(canonicalizeIngredientName(english), esName);
  }
  return map;
}

/** Real i18n Spanish only — never invent CosIng translations. */
function lookupNameEs(name, enNames, esNames, enToEs) {
  const key = ingredientNameKey(name);
  const fromKey = String(esNames[key] || '').trim();
  const fromValue = enToEs.get(canonicalizeIngredientName(name)) || '';
  const es = fromKey || fromValue;
  const en = String(enNames[key] || name).trim();
  if (!es) return undefined;
  if (canonicalizeIngredientName(es) === canonicalizeIngredientName(en)) return undefined;
  if (canonicalizeIngredientName(es) === canonicalizeIngredientName(name)) return undefined;
  return es;
}

function attachNameEs(entry, enNames, esNames, enToEs) {
  const nameEs = lookupNameEs(entry.name, enNames, esNames, enToEs);
  if (!nameEs) return;
  entry.nameEs = nameEs;
  addAlias(entry, nameEs);
}

function uniqueSlug(name, used) {
  const base = slugifyIngredientName(name) || 'ingredient';
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  used.add(slug);
  return slug;
}

function findExisting(byName, name) {
  const key = canonicalizeIngredientName(name);
  if (!key) return null;
  if (byName.has(key)) return byName.get(key);
  const words = key.split(' ').filter(Boolean);
  if (words.length < 2) return null;
  for (const [existingKey, entry] of byName) {
    if (existingKey.startsWith(`${key} `) || key.startsWith(`${existingKey} `)) return entry;
  }
  return null;
}

function remember(byName, keys, entry) {
  for (const key of keys) {
    if (key) byName.set(key, entry);
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') {
      cell += c;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
  }
  return rows;
}

/** Soap-relevant CosIng subset: oils, butters, EOs, colorants, bases, clays, waxes, botanicals. */
function classifyCosing(inci, functions, description) {
  const name = inci.toLowerCase().trim();
  const fn = functions.toLowerCase();
  const desc = description.toLowerCase();
  const blob = `${name} ${fn} ${desc}`;
  if (!name || name.length < 3) return null;
  if (/clay|kaolin|bentonite|montmorillonite|\billite\b/.test(blob)) return 'clay';
  if (/\bbutter\b/.test(name)) return 'butter';
  if (/\bwax\b/.test(name)) return 'wax';
  if (/\bcolorant\b/.test(fn) || /\bci\s*\d/.test(name) || /\bmica\b|\bpigment\b|\bcolorant\b/.test(name)) {
    return 'colorant';
  }
  if (/glycerin|cocoate|palmate|hydroxide|isethionate|\bsoap\b/.test(name)) return 'base';
  if (/\bcharcoal\b|\bhoney\b|\bmel\b|\boatmeal\b|\bavena sativa\b|\baloe barbadensis\b/.test(name) && !/\boil\b/.test(name)) {
    return 'botanical';
  }
  if (/volatile oil|essential oil/.test(desc) || (/\boil\b/.test(name) && /\b(fragrance|perfuming)\b/.test(fn))) {
    return 'essential-oil';
  }
  if (/\boil\b/.test(name)) return 'oil';
  const simple = !name.includes('/') && !/peg-|ppg-|copolymer|polymer|dimethicone|silicone|acrylate/.test(name);
  if (simple && /\b(powder|water|juice)\b/.test(name) && /\b(flower|leaf|root|herb|bark|fruit|seed|petal|blossom|aloe|oat|honey|charcoal)\b/.test(name)) {
    return 'botanical';
  }
  if (simple && /\bextract\b/.test(name) && /\b(flower|leaf|herb|petal|blossom)\b/.test(name)) {
    return 'botanical';
  }
  if (simple && /\b(fragrance|parfum)\b/.test(name) && name.split(/\s+/).length <= 4) return 'fragrance';
  return null;
}

function findExact(byName, candidate) {
  const keys = [
    canonicalizeIngredientName(candidate.inci),
    canonicalizeIngredientName(candidate.name),
  ].filter(Boolean);
  for (const key of keys) {
    if (byName.has(key)) return byName.get(key);
  }
  return null;
}

async function loadCosingCsv() {
  const refresh = process.argv.includes('--refresh-cosing');
  if (!refresh && fs.existsSync(COSING_RAW)) {
    return fs.readFileSync(COSING_RAW, 'utf8');
  }
  console.log(`Downloading CosIng inventory from ${COSING_URL}`);
  const response = await fetch(COSING_URL);
  if (!response.ok) throw new Error(`CosIng download failed: ${response.status}`);
  const text = await response.text();
  fs.writeFileSync(COSING_RAW, text);
  return text;
}

function parseCosingRows(text) {
  const [header, ...rows] = parseCsv(text);
  const idx = Object.fromEntries(header.map((name, i) => [name.trim(), i]));
  if (idx.inci_name == null) {
    throw new Error('CosIng CSV is missing inci_name column');
  }
  return rows.map((row) => ({
    ref: String(row[idx.reference_number] || '').trim(),
    inci: String(row[idx.inci_name] || '').trim(),
    functions: String(row[idx.functions] || '').trim(),
    description: String(row[idx.description] || '').trim(),
  }));
}

function buildCatalog() {
  const seedSource = fs.readFileSync(seedPath, 'utf8');
  const iconSource = fs.readFileSync(iconPath, 'utf8');
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

  const byName = new Map();
  const usedSlugs = new Set();
  const entries = [];

  for (const seed of parseSeed(seedSource)) {
    const nameKey = canonicalizeIngredientName(seed.name);
    const existing = (nameKey && byName.get(nameKey)) || null;
    if (existing) {
      addAlias(existing, seed.name);
      if (seed.inci && !existing.inci) existing.inci = seed.inci;
      remember(byName, [nameKey, canonicalizeIngredientName(seed.inci)], existing);
      continue;
    }
    const entry = {
      name: seed.name,
      inci: seed.inci || undefined,
      aliases: [],
      category: seed.category,
      iconKey: uniqueSlug(seed.name, usedSlugs),
      source: 'seed',
    };
    entries.push(entry);
    remember(byName, [nameKey, canonicalizeIngredientName(seed.inci)], entry);
  }

  const enNames = en.ingredientNames ?? {};
  const esNames = es.ingredientNames ?? {};
  const enToEs = buildEnglishToSpanish(enNames, esNames);
  for (const [i18nKey, enName] of Object.entries(enNames)) {
    const name = String(enName || '').trim();
    if (!name) continue;
    const esName = String(esNames[i18nKey] || '').trim();
    const existing = findExisting(byName, name);
    if (existing) {
      addAlias(existing, name);
      addAlias(existing, esName);
      if (!existing.nameEs && canonicalizeIngredientName(name) === canonicalizeIngredientName(existing.name)) {
        attachNameEs(existing, enNames, esNames, enToEs);
      }
      continue;
    }
    const entry = {
      name,
      aliases: [],
      category: inferCategory(name),
      iconKey: uniqueSlug(name, usedSlugs),
      source: 'offline',
    };
    addAlias(entry, esName);
    attachNameEs(entry, enNames, esNames, enToEs);
    entries.push(entry);
    remember(byName, [canonicalizeIngredientName(name)], entry);
  }

  for (const iconKey of [...parseColorfulIconKeys(iconSource), ...parseMonoIconKeys(iconSource)]) {
    if (!looksLikeSoapIngredient(iconKey)) continue;
    const name = titleCase(iconKey);
    const existing = findExisting(byName, name);
    if (existing) {
      addAlias(existing, name);
      continue;
    }
    const entry = {
      name,
      aliases: [],
      category: inferCategory(name),
      iconKey: uniqueSlug(name, usedSlugs),
      source: 'offline',
    };
    entries.push(entry);
    remember(byName, [canonicalizeIngredientName(name)], entry);
  }

  return { byName, usedSlugs, entries };
}

function mergeCosingRows(byName, usedSlugs, entries, cosingRows) {
  let added = 0;
  let skipped = 0;
  for (const row of cosingRows) {
    const category = classifyCosing(row.inci, row.functions, row.description);
    if (!category) continue;
    const name = titleCase(row.inci);
    if (findExact(byName, { name, inci: row.inci })) {
      skipped += 1;
      continue;
    }
    const entry = {
      name,
      inci: row.inci,
      aliases: [],
      category,
      iconKey: uniqueSlug(name, usedSlugs),
      source: 'cosing',
    };
    entries.push(entry);
    remember(byName, [canonicalizeIngredientName(name), canonicalizeIngredientName(row.inci)], entry);
    added += 1;
  }
  return { added, skipped };
}

function finalizeCatalog(entries, enNames, esNames) {
  const enToEs = buildEnglishToSpanish(enNames, esNames);
  for (const entry of entries) attachNameEs(entry, enNames, esNames, enToEs);

  const catalog = entries
    .map((entry) => {
      const clean = {
        name: entry.name,
        source: entry.source,
        iconKey: entry.iconKey,
      };
      if (entry.nameEs) clean.nameEs = entry.nameEs;
      if (entry.inci) clean.inci = entry.inci;
      if (entry.category) clean.category = entry.category;
      if (entry.aliases?.length) clean.aliases = entry.aliases;
      return clean;
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));

  return catalog;
}

function logSpanishStats(catalog) {
  const withEs = catalog.filter((row) => row.nameEs).length;
  console.log(`Spanish common names (distinct from English): ${withEs} of ${catalog.length}`);
}

async function main() {
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
  const enNames = en.ingredientNames ?? {};
  const esNames = es.ingredientNames ?? {};

  if (process.argv.includes('--names-only')) {
    const catalog = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    const updated = finalizeCatalog(catalog, enNames, esNames);
    fs.writeFileSync(outPath, `${JSON.stringify(updated, null, 2)}\n`);
    console.log(`Updated Spanish names on existing catalog → ${path.relative(root, outPath)}`);
    logSpanishStats(updated);
    console.log('Hidden backlog only — not imported into Dexie / inventory.');
    return;
  }

  const { byName, usedSlugs, entries } = buildCatalog();
  const before = entries.length;
  const cosing = mergeCosingRows(byName, usedSlugs, entries, parseCosingRows(await loadCosingCsv()));
  const catalog = finalizeCatalog(entries, enNames, esNames);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`);
  const slugs = listExistingPngSlugs();
  fs.writeFileSync(slugsPath, `${JSON.stringify(slugs, null, 2)}\n`);
  const seedCount = catalog.filter((row) => row.source === 'seed').length;
  const offlineCount = catalog.filter((row) => row.source === 'offline').length;
  const cosingCount = catalog.filter((row) => row.source === 'cosing').length;
  console.log(
    `Wrote ${catalog.length} backlog names (${seedCount} seed copies, ${offlineCount} extra, ${cosingCount} CosIng) → ${path.relative(root, outPath)}`,
  );
  console.log(`Before CosIng merge: ${before}. Added ${cosing.added}, skipped ${cosing.skipped} existing.`);
  logSpanishStats(catalog);
  console.log(`Bundled PNG slugs: ${slugs.length} → ${path.relative(root, slugsPath)}`);
  console.log('Hidden backlog only — not imported into Dexie / inventory.');
}

main();
