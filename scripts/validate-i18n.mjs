import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

const en = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/en.json'), 'utf8'));
const es = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/es.json'), 'utf8'));
const fe = flatten(en);
const fsEs = flatten(es);
const onlyEn = Object.keys(fe).filter((k) => !(k in fsEs));
const onlyEs = Object.keys(fsEs).filter((k) => !(k in fe));
console.log('en keys:', Object.keys(fe).length);
console.log('es keys:', Object.keys(fsEs).length);
console.log('missing in es:', onlyEn.length);
console.log('missing in en:', onlyEs.length);
if (onlyEn.length || onlyEs.length) process.exit(1);
console.log('PASS: en and es have identical key structure');
