#!/usr/bin/env node
/**
 * Puppeteer helper: fetch Avery REST catalog through real Chrome.
 * Called automatically when `npm run avery:scrape` hits TLS/Cloudflare issues.
 */
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_OUT = resolve(__dirname, 'avery-raw.json');

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const local = process.env.LOCALAPPDATA || '';
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    local && `${local}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

async function main() {
  const exe = findBrowser();
  if (!exe) {
    console.error('Chrome/Edge not found. Set CHROME_PATH or install Chrome.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
    );
    await page.goto('https://www.avery.com/templates', { waitUntil: 'domcontentloaded', timeout: 60000 });

    const catalog = await page.evaluate(async () => {
      const headers = { Accept: 'application/json' };
      const [blank, labels] = await Promise.all([
        fetch('https://www.avery.com/rest/blank/default/labels', { headers }).then((r) => r.json()),
        fetch('https://www.avery.com/rest/labels', { headers }).then((r) => r.json()),
      ]);
      return { blank, labels, fetchedAt: new Date().toISOString(), via: 'puppeteer' };
    });

    writeFileSync(RAW_OUT, JSON.stringify(catalog, null, 2));
    console.log(`Browser scrape saved -> ${RAW_OUT}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
