/**
 * Restore Rosa's 28 recipes and deactivate all active ingredients.
 *
 * Uses headless Chrome against the production build (vite preview).
 * For the Electron portable save system, use Settings → "Restore Rosa's 28 recipes"
 * or set GAIA_MAINTENANCE=1 when Electron is available:
 *   npm run build && npm run restore:rosa
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = path.join(root, 'dist', 'index.html');
const PORT = 4180;
const URL = `http://localhost:${PORT}/`;

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const local = process.env.LOCALAPPDATA || '';
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    local && `${local}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

function waitForServer(timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const ping = () => {
      http.get(URL, (res) => {
        res.destroy();
        resolve();
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('preview server never came up'));
        else setTimeout(ping, 300);
      });
    };
    ping();
  });
}

async function runWithPuppeteer() {
  if (!existsSync(distIndex)) {
    console.error('Production build missing. Run: npm run build');
    process.exit(1);
  }

  const executablePath = findBrowser();
  if (!executablePath) {
    console.error('Chrome/Edge not found. Set CHROME_PATH or install a Chromium browser.');
    process.exit(1);
  }

  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
    shell: true,
  });

  try {
    await waitForServer();
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(() => typeof window.gaiaMaintenance !== 'undefined', { timeout: 30000 });

    const result = await page.evaluate(async () => window.gaiaMaintenance.runRosaMaintenance());

    await browser.close();

    console.log('Maintenance complete (browser IndexedDB via vite preview):');
    console.log(`  Deactivated: ${result.ingredientsDeactivated} ingredients`);
    console.log(`  Restored: ${result.recipesRestored} recipes`);
    console.log('  Recipe names:', result.recipeNames.join(', '));
    console.log('\nNote: browser preview uses its own IndexedDB. For the Electron app save system,');
    console.log('open the app → Settings → "Restore Rosa\'s 28 recipes".');
  } finally {
    preview.kill();
  }
}

async function runWithElectron() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR || path.join(root, 'release');
  const electronBin = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
  const electronCli = existsSync(electronBin)
    ? electronBin
    : path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');

  if (!existsSync(electronBin) && !existsSync(electronCli)) {
    return false;
  }

  console.log(`Save system: ${path.join(portableDir, "Gaia's Save System")}`);
  console.log('Running Rosa maintenance via Electron…');

  await new Promise((resolve, reject) => {
    const child = spawn(electronCli, ['.'], {
      cwd: root,
      env: { ...process.env, GAIA_MAINTENANCE: '1', PORTABLE_EXECUTABLE_DIR: portableDir },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });
  return true;
}

async function main() {
  if (process.env.GAIA_USE_PUPPETEER === '1') {
    await runWithPuppeteer();
    return;
  }

  try {
    const usedElectron = await runWithElectron();
    if (usedElectron) return;
  } catch (err) {
    console.warn('Electron maintenance failed, falling back to puppeteer:', err.message);
  }

  await runWithPuppeteer();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
