#!/usr/bin/env node
// The root package.json declares "type": "module" (needed for Vite + the
// renderer's ESM imports), but electron/tsconfig.json compiles the main
// process to CommonJS. Dropping a scoped package.json inside dist-electron/
// tells Node to treat every .js file under it as CommonJS regardless of the
// root manifest, without renaming every compiled file to .cjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "dist-electron");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "package.json"), JSON.stringify({ type: "commonjs" }, null, 2));
console.log(`Wrote ${path.join(outDir, "package.json")}`);
