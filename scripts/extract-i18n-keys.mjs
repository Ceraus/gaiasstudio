import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

const keyRe = /\bt\s*\(\s*['"]([^'"]+)['"]/g;
const used = new Map(); // key -> default from second arg if present
const defaultRe = /\bt\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]/g;

for (const file of walk(path.join(root, 'src'))) {
  const src = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = keyRe.exec(src))) {
    if (!used.has(m[1])) used.set(m[1], null);
  }
  while ((m = defaultRe.exec(src))) {
    used.set(m[1], m[2]);
  }
}

const en = flatten(JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/en.json'), 'utf8')));
const missing = [...used.keys()].filter((k) => !(k in en)).sort();
console.log('Used keys in code:', used.size);
console.log('Keys in en.json:', Object.keys(en).length);
console.log('Missing from en.json:', missing.length);
for (const k of missing) {
  console.log(`${k}\t${JSON.stringify(used.get(k) ?? '')}`);
}

fs.writeFileSync(
  path.join(root, 'scripts/i18n-code-missing.json'),
  JSON.stringify(missing.map((k) => ({ key: k, defaultEn: used.get(k) })), null, 2),
);
