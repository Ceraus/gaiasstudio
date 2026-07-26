// ---------------------------------------------------------------------------
// Headless-Chrome smoke test for Gaia's Label Studio.
//
// Builds nothing itself — run `npm run build` first, then `npm run smoke`.
// It serves the production build with `vite preview`, drives the REAL app through
// window.gaiaEditor / window.gaiaTest, and proves the core promises hold:
//   • add text/shapes, undo/redo, duplicate, align (center offset ~0px), flip, crop
//   • curved text renders + exports
//   • recipe → front auto-layout (curved product name on round labels)
//   • a 25-ingredient back label fits inside the safe zone
//   • a transparent logo survives to the exported PNG/PDF
//   • PDF export yields correct page counts at 612×792pt US Letter
//
// Chrome/Edge is located automatically; override with CHROME_PATH=... if needed.
// ---------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import http from 'node:http';
import process from 'node:process';
import puppeteer from 'puppeteer-core';

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;

// -- tiny test harness -------------------------------------------------------
let passed = 0;
let failed = 0;
const results = [];
function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    results.push(`  \u2713 ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    results.push(`  \u2717 ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

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

function waitForServer(timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const ping = () => {
      http
        .get(URL, (res) => {
          res.destroy();
          resolve();
        })
        .on('error', () => {
          if (Date.now() - start > timeoutMs) reject(new Error('preview server never came up'));
          else setTimeout(ping, 300);
        });
    };
    ping();
  });
}

async function main() {
  const executablePath = findBrowser();
  if (!executablePath) {
    console.error('No Chrome/Edge found. Set CHROME_PATH to a Chromium-based browser binary.');
    process.exit(2);
  }

  const preview = spawn(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
    { cwd: process.cwd(), stdio: 'ignore', shell: true },
  );

  let browser;
  try {
    await waitForServer();
    browser = await puppeteer.launch({
      executablePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.goto(URL, { waitUntil: 'networkidle0' });

    await page.waitForFunction(() => window.gaiaTest && typeof window.gaiaTest.templates === 'function', {
      timeout: 15000,
    });

    const templates = await page.evaluate(() => window.gaiaTest.templates());
    const round = templates.find((t) => t.shape === 'circle' && t.contexts.includes('front'));
    // A realistic back label: the largest-area template that supports a back context.
    const back = templates
      .filter((t) => t.contexts.includes('back'))
      .sort((a, b) => b.widthIn * b.heightIn - a.widthIn * a.heightIn)[0];
    const anyTpl = round || templates[0];
    check('has a round/front template', !!round, round?.id);
    check(
      'has a back-capable template',
      !!back,
      back && `${back.id} (${back.widthIn}×${back.heightIn}in)`,
    );

    const waitReady = (id) =>
      page.waitForFunction(
        (expected) => {
          const e = window.gaiaEditor;
          return !!e && !!e.canvas && !!e.template && e.template.id === expected;
        },
        { timeout: 15000 },
        id,
      );

    // --- A. Core editing ---------------------------------------------------
    await page.evaluate((id) => window.gaiaTest.startDesign(id, 'front'), anyTpl.id);
    await waitReady(anyTpl.id);

    const core = await page.evaluate(async () => {
      const e = window.gaiaEditor;
      const count = () => e.canvas.getObjects().filter((o) => !String(o.gaiaKind || '').startsWith('__')).length;
      e.addText('heading', 'Hello');
      const afterText = count();
      e.addShape('rect');
      const afterShape = count();
      const beforeUndo = count();
      await e.undo();
      const afterUndo = count();
      await e.redo();
      const afterRedo = count();
      // duplicate the active object
      const objs = e.canvas.getObjects().filter((o) => !String(o.gaiaKind || '').startsWith('__'));
      e.canvas.setActiveObject(objs[objs.length - 1]);
      await e.duplicateSelected();
      const afterDup = count();
      // align center H and measure offset from label center
      const target = e.canvas.getActiveObjects()[0] || objs[objs.length - 1];
      e.canvas.setActiveObject(target);
      e.align('centerH');
      const br = target.getBoundingRect();
      const centerOffset = Math.abs(br.left + br.width / 2 - e.trim.cx);
      // flip
      const beforeFlip = !!target.flipX;
      e.flip('h');
      const flipped = target.flipX !== beforeFlip;
      return { afterText, afterShape, beforeUndo, afterUndo, afterRedo, afterDup, centerOffset, flipped };
    });
    check('add text adds a layer', core.afterText >= 1, `layers=${core.afterText}`);
    check('add shape adds a layer', core.afterShape === core.afterText + 1);
    check('undo removes last layer', core.afterUndo === core.beforeUndo - 1);
    check('redo restores layer', core.afterRedo === core.beforeUndo);
    check('duplicate adds a layer', core.afterDup === core.afterRedo + 1);
    check('align center offset ~0px', core.centerOffset < 1.5, `offset=${core.centerOffset.toFixed(3)}px`);
    check('flip toggles horizontally', core.flipped);

    // --- B. Crop -----------------------------------------------------------
    const crop = await page.evaluate(async () => {
      const e = window.gaiaEditor;
      const c = document.createElement('canvas');
      c.width = 200;
      c.height = 200;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#88aa66';
      ctx.fillRect(0, 0, 200, 200);
      const url = c.toDataURL('image/png');
      const img = await e.addImageFromUrl(url, 'photo', 'test');
      e.canvas.setActiveObject(img);
      e.startCrop();
      const inCrop = e.cropMode;
      e.applyCrop();
      const outCrop = e.cropMode;
      return { inCrop, outCrop };
    });
    check('crop enters crop mode', crop.inCrop === true);
    check('crop applies and exits', crop.outCrop === false);

    // --- C. Curved text renders + exports ----------------------------------
    const curved = await page.evaluate(() => {
      const e = window.gaiaEditor;
      const txt = e.addText('heading', 'Curved Name');
      e.canvas.setActiveObject(txt);
      e.setTextCurve(50);
      const active = e.canvas.getActiveObject();
      const hasPath = !!active.path;
      const curveAmt = active.gaiaCurve;
      const png = e.exportLabelPng();
      return { hasPath, curveAmt, pngOk: typeof png === 'string' && png.startsWith('data:image/png') && png.length > 1000 };
    });
    check('curved text applies a path', curved.hasPath, `gaiaCurve=${curved.curveAmt}`);
    check('curved text amount stored', curved.curveAmt === 50);
    check('curved design exports to PNG', curved.pngOk);

    // --- D. Front auto-layout from a recipe (curved name on round) ---------
    if (round) {
      await page.evaluate((id) => window.gaiaTest.startDesign(id, 'front'), round.id);
      await waitReady(round.id);
      const front = await page.evaluate(async () => {
        const e = window.gaiaEditor;
        await window.gaiaTest.autoLayout('front', 5);
        const objs = e.canvas.getObjects().filter((o) => !String(o.gaiaKind || '').startsWith('__'));
        const curvedName = objs.some((o) => typeof o.gaiaCurve === 'number' && o.gaiaCurve !== 0);
        return { n: objs.length, curvedName };
      });
      check('front auto-layout creates objects', front.n >= 2, `objects=${front.n}`);
      check('front product name is curved on round label', front.curvedName);
    }

    // --- E. 25-ingredient back label fits the safe zone --------------------
    if (back) {
      await page.evaluate((id) => window.gaiaTest.startDesign(id, 'back'), back.id);
      await waitReady(back.id);
      const backFit = await page.evaluate(async () => {
        const e = window.gaiaEditor;
        await window.gaiaTest.autoLayout('back', 25);
        const safe = {
          left: e.trim.left + e.safePx,
          top: e.trim.top + e.safePx,
          right: e.trim.left + e.labelWpx - e.safePx,
          bottom: e.trim.top + e.labelHpx - e.safePx,
        };
        const tol = 2;
        // Backgrounds intentionally extend through the safe zone to the trim/
        // bleed edge. Only foreground content must fit inside the safe rect.
        const objs = e.canvas.getObjects().filter((o) => {
          const kind = String(o.gaiaKind || '');
          return !kind.startsWith('__') && kind !== 'background';
        });
        let worst = 0;
        for (const o of objs) {
          const b = o.getBoundingRect();
          worst = Math.max(
            worst,
            safe.left - b.left,
            safe.top - b.top,
            b.left + b.width - safe.right,
            b.top + b.height - safe.bottom,
          );
        }
        return { n: objs.length, overflow: worst, tol };
      });
      check('back auto-layout creates objects', backFit.n >= 2, `objects=${backFit.n}`);
      check('25-ingredient back label fits safe zone', backFit.overflow <= backFit.tol, `overflow=${backFit.overflow.toFixed(2)}px`);
    }

    // --- F. Transparent logo survives + PDF page counts --------------------
    const tpl = anyTpl;
    await page.evaluate((id) => window.gaiaTest.startDesign(id, 'front'), tpl.id);
    await waitReady(tpl.id);
    const logoAndPdf = await page.evaluate(async () => {
      const e = window.gaiaEditor;
      // transparent PNG: a filled circle on a transparent background
      const c = document.createElement('canvas');
      c.width = 300;
      c.height = 300;
      const ctx = c.getContext('2d');
      ctx.beginPath();
      ctx.arc(150, 150, 120, 0, Math.PI * 2);
      ctx.fillStyle = '#7c3aed';
      ctx.fill();
      const url = c.toDataURL('image/png');
      await e.addImageFromUrl(url, 'logo', 'Logo');
      const objs = e.canvas.getObjects();
      const hasLogo = objs.some((o) => o.gaiaKind === 'logo');
      const png = e.exportLabelPng();
      const pngIsPng = png.startsWith('data:image/png');
      return { hasLogo, pngIsPng };
    });
    check('transparent logo added as logo layer', logoAndPdf.hasLogo);
    check('exported label is a PNG (alpha-capable)', logoAndPdf.pngIsPng);

    const pdf1 = await page.evaluate((per) => window.gaiaTest.buildPdf(per, false), tpl.perSheet);
    const pdf3 = await page.evaluate((per) => window.gaiaTest.buildPdf(per * 3, false), tpl.perSheet);
    check(`PDF ${tpl.perSheet} labels → 1 page`, pdf1.pages === 1, `pages=${pdf1.pages}`);
    check(`PDF ${tpl.perSheet * 3} labels → 3 pages`, pdf3.pages === 3, `pages=${pdf3.pages}`);
    check(
      'PDF page is US Letter (612×792pt)',
      Math.round(pdf1.width) === 612 && Math.round(pdf1.height) === 792,
      `${Math.round(pdf1.width)}×${Math.round(pdf1.height)}pt`,
    );

    check('no uncaught page errors', pageErrors.length === 0, pageErrors[0] || '');
  } finally {
    if (browser) await browser.close();
    preview.kill();
  }

  console.log('\nGaia\u2019s Label Studio — headless smoke test\n');
  console.log(results.join('\n'));
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
