import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const enPath = path.join(root, 'src/i18n/en.json');
const esPath = path.join(root, 'src/i18n/es.json');

function fixTrailingCommas(raw) {
  return raw.replace(/,(\s*[}\]])/g, '$1');
}

function parseJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const fixed = fixTrailingCommas(raw);
  try {
    return JSON.parse(fixed);
  } catch (e) {
    console.error(`Failed to parse ${filePath}:`, e.message);
    process.exit(1);
  }
}

function sortDeep(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const sorted = {};
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en'))) {
    sorted[key] = sortDeep(obj[key]);
  }
  return sorted;
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function unflatten(flat) {
  const rootObj = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cur = rootObj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return rootObj;
}

/** Spanish translations for keys missing from es.json (key -> es value). */
const ES_TRANSLATIONS = {
  // Filled by script output / manual curation — see sync pass below
};

function translateToEs(key, enValue) {
  if (ES_TRANSLATIONS[key]) return ES_TRANSLATIONS[key];
  // Fallback: mark for review with English (will be replaced in second pass)
  return `[ES] ${enValue}`;
}

function syncTrees(en, es) {
  const fe = flatten(en);
  const fsEs = flatten(es);
  const allKeys = new Set([...Object.keys(fe), ...Object.keys(fsEs)]);

  const mergedEn = { ...fe };
  const mergedEs = { ...fsEs };

  for (const key of allKeys) {
    if (!(key in mergedEn) && key in mergedEs) {
      mergedEn[key] = mergedEs[key]; // copy es -> en if missing in en
    }
    if (!(key in mergedEs) && key in mergedEn) {
      mergedEs[key] = translateToEs(key, mergedEn[key]);
    }
  }

  return {
    en: sortDeep(unflatten(mergedEn)),
    es: sortDeep(unflatten(mergedEs)),
    missingInEs: Object.keys(fe).filter((k) => !(k in fsEs)),
    missingInEn: Object.keys(fsEs).filter((k) => !(k in fe)),
  };
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

const en = parseJsonFile(enPath);
const es = parseJsonFile(esPath);

const beforeFe = flatten(en);
const beforeFs = flatten(es);
console.log('Before sync — en keys:', Object.keys(beforeFe).length, 'es keys:', Object.keys(beforeFs).length);

const missingInEs = Object.keys(beforeFe).filter((k) => !(k in beforeFs)).sort();
const missingInEn = Object.keys(beforeFs).filter((k) => !(k in beforeFe)).sort();
console.log('Missing in es:', missingInEs.length);
console.log('Missing in en:', missingInEn.length);

if (missingInEs.length) {
  console.log('\n--- Keys missing in es.json ---');
  for (const k of missingInEs) {
    console.log(`${k}: ${JSON.stringify(String(beforeFe[k]).slice(0, 100))}`);
  }
}
if (missingInEn.length) {
  console.log('\n--- Keys missing in en.json ---');
  for (const k of missingInEn) {
    console.log(`${k}: ${JSON.stringify(String(beforeFs[k]).slice(0, 100))}`);
  }
}

// Export missing keys report for assistant
const reportPath = path.join(root, 'scripts/i18n-missing-report.json');
fs.writeFileSync(
  reportPath,
  JSON.stringify({ missingInEs: missingInEs.map((k) => ({ key: k, en: beforeFe[k] })), missingInEn: missingInEn.map((k) => ({ key: k, es: beforeFs[k] })) }, null, 2),
);

console.log('\nReport written to scripts/i18n-missing-report.json');
