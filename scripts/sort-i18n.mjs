import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function sortDeep(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const sorted = {};
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en'))) {
    sorted[key] = sortDeep(obj[key]);
  }
  return sorted;
}

for (const locale of ['en', 'es']) {
  const filePath = path.join(root, `src/i18n/${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  fs.writeFileSync(filePath, `${JSON.stringify(sortDeep(data), null, 2)}\n`, 'utf8');
  console.log(`Sorted ${locale}.json`);
}
