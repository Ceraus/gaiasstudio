/**
 * One-off builder: fetch unique Unsplash landscape photo IDs and write
 * src/data/affirmationImages.ts. Reads the demo Client-ID from src/db/db.ts
 * at runtime — does not copy secrets into the generated map.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readKey(name) {
  const envName = name === 'UNSPLASH' ? 'UNSPLASH_ACCESS_KEY' : 'PIXABAY_KEY';
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return fromEnv;
  const db = readFileSync(join(root, 'src/db/db.ts'), 'utf8');
  const re =
    name === 'UNSPLASH'
      ? /DEFAULT_UNSPLASH_KEY = '([^']+)'/
      : /DEFAULT_PIXABAY_KEY = '([^']+)'/;
  const match = db.match(re);
  if (!match) throw new Error(`No ${name} key in env or src/db/db.ts`);
  return match[1];
}

function parseCatalog() {
  const src = readFileSync(join(root, 'src/data/affirmations.ts'), 'utf8');
  const start = src.indexOf('const CATALOG');
  const brace = src.indexOf('[', start);
  const end = src.indexOf('\n];', brace);
  const body = src.slice(brace, end);
  const rows = [];
  const re = /\{ category: '(\w+)', en: '((?:\\'|[^'])*)'/g;
  let match;
  const counters = {};
  while ((match = re.exec(body))) {
    const category = match[1];
    const en = match[2].replace(/\\'/g, "'");
    counters[category] = (counters[category] ?? 0) + 1;
    const id = `${category}-${String(counters[category]).padStart(3, '0')}`;
    rows.push({ id, category, en });
  }
  return rows;
}

const PEOPLE =
  /\b(man|woman|men|women|person|people|portrait|face|girl|boy|child|human|couple|model|selfie|tourist|hiker standing|someone)\b/i;
const OFFICE = /\b(office|desk|laptop|computer|keyboard|meeting|coworker|city street|skyscraper|traffic)\b/i;
const AI_SPARKLE = /\b(sparkle graphic|neon|cgi|3d render|illustration)\b/i;

function photoPath(urls) {
  const raw = urls?.raw || urls?.regular || urls?.full || '';
  const match = String(raw).match(/images\.unsplash\.com\/(photo-[a-z0-9-]+)/i);
  return match?.[1] ?? null;
}

function usable(photo) {
  if (!photo || photo.width < 1400) return false;
  const text = `${photo.alt_description || ''} ${photo.description || ''}`;
  if (PEOPLE.test(text) || OFFICE.test(text) || AI_SPARKLE.test(text)) return false;
  return Boolean(photoPath(photo.urls));
}

const QUERIES = {
  focus: [
    'misty pine forest landscape',
    'fog forest path landscape',
    'still mountain lake mist',
    'quiet woodland morning',
    'moss forest calm',
  ],
  esteem: [
    'sunrise meadow landscape',
    'golden hour hills',
    'wildflower sunrise field',
    'mountain sunrise light',
    'blooming garden flowers',
  ],
  forgive: [
    'still lake reflection landscape',
    'calm river water',
    'lavender field landscape',
    'soft morning mist water',
    'quiet pond reeds',
  ],
  hustle: [
    'golden hour mountain trail',
    'sunrise dirt path landscape',
    'warm morning woodland light',
    'desert sunrise landscape',
    'workshop wood natural light',
  ],
  calm: [
    'foggy mountains landscape',
    'calm ocean horizon',
    'still alpine lake',
    'misty water morning',
    'quiet forest fog',
  ],
  gratitude: [
    'wildflower field landscape',
    'golden meadow sunlight',
    'autumn trees landscape',
    'sunflower field',
    'harvest countryside',
  ],
  courage: [
    'ocean horizon dawn',
    'mountain ridge landscape',
    'alpine peak sunrise',
    'cliff ocean landscape',
    'dramatic sky mountains',
  ],
  rest: [
    'dusk clouds landscape',
    'evening sky water',
    'moonlight lake',
    'twilight forest',
    'cozy cabin woods dusk',
  ],
  presence: [
    'forest path landscape',
    'zen stones water',
    'still pond reflection',
    'mossy forest trail',
    'meditation garden nature',
  ],
  boundaries: [
    'stone wall garden landscape',
    'forest edge meadow',
    'shoreline rocks calm',
    'garden gate flowers',
    'quiet window interior plants',
  ],
};

const FILLER = [
  'nature landscape',
  'forest landscape',
  'mountain lake',
  'ocean waves calm',
  'waterfall forest',
  'desert dunes sunrise',
  'snow mountain landscape',
  'green hills landscape',
  'botanical leaves closeup',
  'pebbles beach',
  'lily pond',
  'cherry blossom tree',
  'canyon landscape',
  'northern lights landscape',
  'rain forest canopy',
  'wheat field sunset',
  'rocky coast landscape',
  'bamboo forest',
  'tulip field landscape',
  'icy lake winter',
];

const WORD_HINTS = [
  { re: /\b(water|river|ocean|sea|lake|flow|breath|still)\b/i, tags: ['water', 'lake', 'ocean', 'river'] },
  { re: /\b(mountain|rooted|grounded|stand|steady|unshaken|strong)\b/i, tags: ['mountain', 'peak', 'ridge'] },
  { re: /\b(forest|tree|wood|rooted|path|trail)\b/i, tags: ['forest', 'wood', 'path', 'trail'] },
  { re: /\b(light|radiant|shine|sunrise|sun|glow|bright)\b/i, tags: ['sunrise', 'sun', 'golden', 'light'] },
  { re: /\b(bloom|flower|garden|grow)\b/i, tags: ['flower', 'bloom', 'garden', 'wildflower'] },
  { re: /\b(rest|sleep|dusk|night|soft|gentle)\b/i, tags: ['dusk', 'evening', 'twilight', 'cloud'] },
  { re: /\b(path|journey|step|direction|road)\b/i, tags: ['path', 'trail', 'road'] },
  { re: /\b(stone|boundary|wall|edge|shore)\b/i, tags: ['stone', 'rock', 'shore', 'wall'] },
];

async function searchUnsplash(key, query, page) {
  const url =
    `https://api.unsplash.com/search/photos?page=${page}&per_page=30&orientation=landscape` +
    `&content_filter=high&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
  });
  if (res.status === 403 || res.status === 429) {
    const err = new Error(`Unsplash ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (!res.ok) throw new Error(`Unsplash ${res.status} for ${query}`);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

function pixabayPath(hit) {
  const preview = String(hit.previewURL || '');
  const match = preview.match(
    /cdn\.pixabay\.com\/photo\/(\d{4}\/\d{2}\/\d{2}\/\d{2}\/\d{2}\/[a-z0-9_-]+?)_\d+\.(jpe?g)/i,
  );
  if (match) {
    return {
      kind: 'pixabay',
      path: `${match[1]}_1280.${match[2]}`,
      width: hit.imageWidth || 1280,
    };
  }
  return null;
}

async function searchPixabay(key, query, page) {
  const url =
    `https://pixabay.com/api/?key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal` +
    `&category=nature&min_width=1400&safesearch=true&per_page=200&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pixabay ${res.status} for ${query}`);
  const data = await res.json();
  return Array.isArray(data.hits) ? data.hits : [];
}

function scorePhoto(photo, affirmation) {
  const text = `${photo.alt_description || ''} ${photo.description || ''}`.toLowerCase();
  let score = 0;
  for (const hint of WORD_HINTS) {
    if (hint.re.test(affirmation.en)) {
      if (hint.tags.some((tag) => text.includes(tag))) score += 3;
    }
  }
  if (photo.width >= 2000) score += 1;
  return score;
}

/** Well-known Unsplash landscape filenames — used to raise uniqueness without extra API calls. */
const CURATED_UNSPLASH = [
  'photo-1506905925346-21bda4d32df4',
  'photo-1469474968028-56623f02e42e',
  'photo-1470071459604-3b5ec3a7fe05',
  'photo-1441974231531-c6227db76b6e',
  'photo-1472214103451-9374bd1c798e',
  'photo-1501785888041-af3ef285b470',
  'photo-1464822759023-fed622ff2c3b',
  'photo-1483728642387-6c4b6e159317',
  'photo-1519681393784-d120267933ba',
  'photo-1475924156734-496f6cac6ec1',
  'photo-1507525428034-b723cf961d3e',
  'photo-1439066615861-d1af74d74000',
  'photo-1470770841072-f978cf4d019e',
  'photo-1476514525535-07fb3b4ae5f1',
  'photo-1493246507139-91e8fad9978e',
  'photo-1470252649378-9c29740c9fa8',
  'photo-1426604966848-d7adac402bff',
  'photo-1447752875215-b2761acb3c5d',
  'photo-1511497584788-876760111969',
  'photo-1448375240586-882707db888b',
  'photo-1473448912268-2022ce9504d3',
  'photo-1518173946687-a4c8892bbd9f',
  'photo-1502082553048-f009c37129b9',
  'photo-1513836279014-a89f7a76ae86',
  'photo-1446329813274-7c9036bd9a1f',
  'photo-1501854140801-50d01698950b',
  'photo-1433086966358-54859d0ed716',
  'photo-1500534314209-a25ddb2bd429',
  'photo-1500530855697-b586d89ba3ee',
  'photo-1540206395-68808572332f',
  'photo-1518837695005-2083093ee35b',
  'photo-1505118380757-91f5f5632de0',
  'photo-1432405972618-c60b0225b8f9',
  'photo-1468581264429-2548ef9eb732',
  'photo-1505142468610-359e7d316be0',
  'photo-1518495973542-4542c06a5843',
  'photo-1559827260-dc66d52bef19',
  'photo-1544551763-46a013bb70d5',
  'photo-1475924156734-496f6cac6ec1',
  'photo-1464822759023-fed622ff2c3b',
  'photo-1447752875215-b2761acb3c5d',
  'photo-1472214103451-9374bd1c798e',
  'photo-1506744038136-46273834b3fb',
  'photo-1439853949127-fa647821eba0',
  'photo-1470770903676-69b98201ea1c',
  'photo-1465056830514-6c97d72cce0e',
  'photo-1519681393784-d120267933ba',
  'photo-1482192505345-5655af888cc4',
  'photo-1500534314209-a25ddb2bd429',
  'photo-1418065460487-3e41a6c84dc5',
  'photo-1441974231531-c6227db76b6e',
  'photo-1470071459604-3b5ec3a7fe05',
  'photo-1469474968028-56623f02e42e',
  'photo-1506905925346-21bda4d32df4',
  'photo-1510797215324-95aa89f43c33',
  'photo-1549880338-65ddcdfd017b',
  'photo-1511593358241-7eea1f3c84e5',
  'photo-1464822759023-fed622ff2c3b',
  'photo-1483728642387-6c4b6e159317',
  'photo-1501785888041-af3ef285b470',
  'photo-1519681393784-d120267933ba',
  'photo-1475924156734-496f6cac6ec1',
  'photo-1507525428034-b723cf961d3e',
  'photo-1518837695005-2083093ee35b',
  'photo-1505118380757-91f5f5632de0',
  'photo-1559827260-dc66d52bef19',
  'photo-1544551763-46a013bb70d5',
  'photo-1470770841072-f978cf4d019e',
  'photo-1476514525535-07fb3b4ae5f1',
  'photo-1493246507139-91e8fad9978e',
  'photo-1470252649378-9c29740c9fa8',
  'photo-1426604966848-d7adac402bff',
  'photo-1511497584788-876760111969',
  'photo-1448375240586-882707db888b',
  'photo-1473448912268-2022ce9504d3',
  'photo-1518173946687-a4c8892bbd9f',
  'photo-1502082553048-f009c37129b9',
  'photo-1513836279014-a89f7a76ae86',
  'photo-1446329813274-7c9036bd9a1f',
  'photo-1501854140801-50d01698950b',
  'photo-1433086966358-54859d0ed716',
  'photo-1500530855697-b586d89ba3ee',
  'photo-1540206395-68808572332f',
  'photo-1432405972618-c60b0225b8f9',
  'photo-1468581264429-2548ef9eb732',
  'photo-1505142468610-359e7d316be0',
  'photo-1518495973542-4542c06a5843',
  'photo-1506744038136-46273834b3fb',
  'photo-1439853949127-fa647821eba0',
  'photo-1470770903676-69b98201ea1c',
  'photo-1465056830514-6c97d72cce0e',
  'photo-1482192505345-5655af888cc4',
  'photo-1510797215324-95aa89f43c33',
  'photo-1549880338-65ddcdfd017b',
  'photo-1511593358241-7eea1f3c84e5',
  'photo-1472214103451-9374bd1c798e',
  'photo-1441974231531-c6227db76b6e',
  'photo-1501785888041-af3ef285b470',
  'photo-1464822759023-fed622ff2c3b',
  'photo-1483728642387-6c4b6e159317',
  'photo-1519681393784-d120267933ba',
  'photo-1470071459604-3b5ec3a7fe05',
  'photo-1469474968028-56623f02e42e',
  'photo-1506905925346-21bda4d32df4',
  'photo-1418065460487-3e41a6c84dc5',
  'photo-1475924156734-496f6cac6ec1',
  'photo-1507525428034-b723cf961d3e',
  'photo-1439066615861-d1af74d74000',
  'photo-1470770841072-f978cf4d019e',
  'photo-1476514525535-07fb3b4ae5f1',
  'photo-1493246507139-91e8fad9978e',
  'photo-1470252649378-9c29740c9fa8',
  'photo-1426604966848-d7adac402bff',
  'photo-1447752875215-b2761acb3c5d',
  'photo-1511497584788-876760111969',
  'photo-1448375240586-882707db888b',
  'photo-1473448912268-2022ce9504d3',
  'photo-1518173946687-a4c8892bbd9f',
  'photo-1502082553048-f009c37129b9',
  'photo-1513836279014-a89f7a76ae86',
  'photo-1446329813274-7c9036bd9a1f',
  'photo-1501854140801-50d01698950b',
  'photo-1433086966358-54859d0ed716',
  'photo-1500534314209-a25ddb2bd429',
  'photo-1500530855697-b586d89ba3ee',
  'photo-1542273917363-3b1817f69a2d',
  'photo-1482192596544-9eb780fc7f66',
  'photo-1518020382113-a7e8fc38eac9',
  'photo-1559827260-dc66d52bef19',
  'photo-1544551763-46a013bb70d5',
  'photo-1518837695005-2083093ee35b',
  'photo-1505118380757-91f5f5632de0',
  'photo-1432405972618-c60b0225b8f9',
  'photo-1468581264429-2548ef9eb732',
  'photo-1505142468610-359e7d316be0',
  'photo-1518495973542-4542c06a5843',
  'photo-1506744038136-46273834b3fb',
  'photo-1439853949127-fa647821eba0',
  'photo-1470770903676-69b98201ea1c',
  'photo-1465056830514-6c97d72cce0e',
  'photo-1482192505345-5655af888cc4',
  'photo-1510797215324-95aa89f43c33',
  'photo-1549880338-65ddcdfd017b',
  'photo-1511593358241-7eea1f3c84e5',
];

function loadExistingUnsplash() {
  const byPath = new Map();
  const add = (path, category = null) => {
    if (!path || byPath.has(path)) return;
    byPath.set(path, { kind: 'unsplash', path, alt: '', width: 1600, category });
  };
  for (const path of CURATED_UNSPLASH) add(path);
  try {
    const src = readFileSync(join(root, 'src/data/affirmationImages.ts'), 'utf8');
    const re = /'(photo-[a-z0-9-]+)'/g;
    let match;
    while ((match = re.exec(src))) add(match[1]);
  } catch {
    /* first run */
  }
  return byPath;
}

async function collectPhotos(unsplashKey, pixabayKey) {
  const byPath = loadExistingUnsplash();
  const categoryPools = {};
  const queries = [];
  for (const [category, list] of Object.entries(QUERIES)) {
    for (const query of list) queries.push({ category, query });
  }
  for (const query of FILLER) queries.push({ category: null, query });

  let rateLimited = false;
  for (const { category, query } of queries) {
    if (rateLimited) break;
    for (const page of [1, 2]) {
      if (rateLimited) break;
      try {
        const results = await searchUnsplash(unsplashKey, query, page);
        for (const photo of results) {
          if (!usable(photo)) continue;
          const path = photoPath(photo.urls);
          if (!path || byPath.has(path)) continue;
          const entry = {
            kind: 'unsplash',
            path,
            alt: photo.alt_description || '',
            width: photo.width,
            category,
          };
          byPath.set(path, entry);
          if (category) (categoryPools[category] ??= []).push(entry);
        }
        process.stdout.write(`  unsplash ${query} p${page}: pool=${byPath.size}\n`);
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        process.stdout.write(`  skip unsplash ${query} p${page}: ${err.message}\n`);
        if (err.status === 403 || err.status === 429) {
          rateLimited = true;
          break;
        }
      }
    }
  }

  const pixabayQueries = [
    ...Object.entries(QUERIES).flatMap(([category, list]) =>
      list.slice(0, 2).map((query) => ({ category, query })),
    ),
    ...FILLER.map((query) => ({ category: null, query })),
  ];
  for (const { category, query } of pixabayQueries) {
    if (byPath.size >= 520) break;
    try {
      const hits = await searchPixabay(pixabayKey, query, 1);
      for (const hit of hits) {
        const parsed = pixabayPath(hit);
        if (!parsed || (parsed.width && parsed.width < 1400)) continue;
        const key = `${parsed.kind}:${parsed.path}`;
        if (byPath.has(key)) continue;
        const tags = String(hit.tags || '');
        if (PEOPLE.test(tags) || OFFICE.test(tags)) continue;
        const entry = {
          kind: parsed.kind,
          path: parsed.path,
          alt: tags,
          width: parsed.width || 1600,
          category,
        };
        byPath.set(key, entry);
        if (category) (categoryPools[category] ??= []).push(entry);
      }
      process.stdout.write(`  pixabay ${query}: pool=${byPath.size}\n`);
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      process.stdout.write(`  skip pixabay ${query}: ${err.message}\n`);
    }
  }

  return { byPath, categoryPools };
}

function photoRef(entry) {
  if (entry.kind === 'unsplash') return entry.path;
  if (entry.kind === 'pixabay') return `pixabay:${entry.path}`;
  return entry.path;
}

function assignPhotos(rows, byPath, categoryPools) {
  const used = new Set();
  const map = {};
  const leftovers = [...byPath.values()].sort((a, b) => {
    if (a.kind === b.kind) return 0;
    return a.kind === 'unsplash' ? -1 : 1;
  });

  const take = (pool, row) => {
    const available = pool.filter((p) => !used.has(photoRef(p)));
    if (available.length === 0) return null;
    available.sort((a, b) => {
      const kindBoost = (x) => (x.kind === 'unsplash' ? 10 : 0);
      return scorePhoto(b, row) + kindBoost(b) - (scorePhoto(a, row) + kindBoost(a));
    });
    const pick = available[0];
    used.add(photoRef(pick));
    return pick;
  };

  for (const row of rows) {
    const pool = categoryPools[row.category] ?? [];
    const picked = take(pool, row) || take(leftovers, row);
    if (picked) map[row.id] = photoRef(picked);
  }

  return map;
}

function renderFile(rows, map) {
  const unique = new Set(Object.values(map));
  const missing = rows.filter((r) => !map[r.id]).map((r) => r.id);
  const lines = rows.map((row) => {
    const photo = map[row.id];
    if (!photo) return `  // missing ${row.id}`;
    return `  '${row.id}': '${photo}',`;
  });

  return `/**
 * One landscape photo per builtin catalog affirmation.
 * Unsplash images.unsplash.com paths, or stable Pixabay CDN URLs.
 * No API key at runtime. Offline / 404: the welcome pill keeps its CSS gradient.
 *
 * Unique photos: ${unique.size} / ${rows.length}
 * Missing mappings: ${missing.length}
 */
import type { AffirmationCategory } from './affirmations';

export const AFFIRMATION_IMAGE_WIDTH = 1600;

/** images.unsplash.com photo path, e.g. photo-1506905925346-21bda4d32df4 */
export type UnsplashPhotoId = string;

export const AFFIRMATION_IMAGE_BY_ID: Readonly<Record<string, UnsplashPhotoId>> = {
${lines.join('\n')}
};

const ALL_PHOTO_IDS = Object.values(AFFIRMATION_IMAGE_BY_ID);

const CATEGORY_FALLBACK: Record<AffirmationCategory, UnsplashPhotoId> = {
  focus: AFFIRMATION_IMAGE_BY_ID['focus-001'] ?? ALL_PHOTO_IDS[0],
  esteem: AFFIRMATION_IMAGE_BY_ID['esteem-001'] ?? ALL_PHOTO_IDS[0],
  forgive: AFFIRMATION_IMAGE_BY_ID['forgive-001'] ?? ALL_PHOTO_IDS[0],
  hustle: AFFIRMATION_IMAGE_BY_ID['hustle-001'] ?? ALL_PHOTO_IDS[0],
  calm: AFFIRMATION_IMAGE_BY_ID['calm-001'] ?? ALL_PHOTO_IDS[0],
  gratitude: AFFIRMATION_IMAGE_BY_ID['gratitude-001'] ?? ALL_PHOTO_IDS[0],
  courage: AFFIRMATION_IMAGE_BY_ID['courage-001'] ?? ALL_PHOTO_IDS[0],
  rest: AFFIRMATION_IMAGE_BY_ID['rest-001'] ?? ALL_PHOTO_IDS[0],
  presence: AFFIRMATION_IMAGE_BY_ID['presence-001'] ?? ALL_PHOTO_IDS[0],
  boundaries: AFFIRMATION_IMAGE_BY_ID['boundaries-001'] ?? ALL_PHOTO_IDS[0],
};

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function affirmationImagePhotoId(
  id: string,
  category?: AffirmationCategory,
): UnsplashPhotoId {
  const mapped = AFFIRMATION_IMAGE_BY_ID[id];
  if (mapped) return mapped;
  if (category && CATEGORY_FALLBACK[category]) return CATEGORY_FALLBACK[category];
  return ALL_PHOTO_IDS[hashSeed(id) % ALL_PHOTO_IDS.length] ?? ALL_PHOTO_IDS[0];
}

/** Landscape crop suitable for the wide welcome pill. */
export function getAffirmationImageUrl(
  id: string,
  category?: AffirmationCategory,
): string {
  const photo = affirmationImagePhotoId(id, category);
  if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
  if (photo.startsWith('pixabay:')) {
    return \`https://cdn.pixabay.com/photo/\${photo.slice('pixabay:'.length)}\`;
  }
  return \`https://images.unsplash.com/\${photo}?auto=format&fit=crop&w=\${AFFIRMATION_IMAGE_WIDTH}&q=80\`;
}
`;
}

const rows = parseCatalog();
if (rows.length !== 460) {
  console.warn(`Catalog parse count ${rows.length} (expected 460)`);
}
console.log(`Catalog rows: ${rows.length}`);
const counts = {};
for (const row of rows) counts[row.category] = (counts[row.category] ?? 0) + 1;
console.log('By category', counts);

const unsplashKey = readKey('UNSPLASH');
const pixabayKey = readKey('PIXABAY');
const { byPath, categoryPools } = await collectPhotos(unsplashKey, pixabayKey);
console.log(`Unique usable photos: ${byPath.size}`);
const map = assignPhotos(rows, byPath, categoryPools);
const assigned = Object.keys(map).length;
const unique = new Set(Object.values(map)).size;
console.log(`Assigned ${assigned}/${rows.length} with ${unique} unique photos`);

writeFileSync(join(root, 'src/data/affirmationImages.ts'), renderFile(rows, map), 'utf8');
writeFileSync(
  join(root, '.tmp-affirmation-images.json'),
  JSON.stringify({ assigned, unique, total: rows.length, map }, null, 2),
  'utf8',
);
console.log('Wrote src/data/affirmationImages.ts');
