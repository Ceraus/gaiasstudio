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
//   • photo adjustments, drag-to-reorder, object clipboard, inch rulers
//   • mixed batch sheets, Workspace search / collections, 125% interface scale
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
    // A typical product round (Avery 22807 is 2"); the ring around the
    // legibility circle is only wide enough for curved type at this size.
    const bigRound = templates
      .filter((t) => t.shape === 'circle' && t.contexts.includes('front') && t.widthIn >= 1.5)
      .sort((a, b) => a.widthIn - b.widthIn)[0];
    // The smallest round in the catalogue, where the ring is too thin to use.
    const tinyRound = templates
      .filter((t) => t.shape === 'circle' && t.contexts.includes('front'))
      .sort((a, b) => a.widthIn - b.widthIn)[0];
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
      // Fabric sizes the cache canvas from the flat text box, so a cached
      // curved headline loses its ascenders along the arc.
      const uncached = active.objectCaching === false;
      e.setTextCurve(0);
      const recached = e.canvas.getActiveObject().objectCaching === true;
      e.setTextCurve(50);
      const png = e.exportLabelPng();
      return { hasPath, curveAmt, uncached, recached, pngOk: typeof png === 'string' && png.startsWith('data:image/png') && png.length > 1000 };
    });
    check('curved text applies a path', curved.hasPath, `gaiaCurve=${curved.curveAmt}`);
    check('curved text amount stored', curved.curveAmt === 50);
    check('curved text renders uncached so the arc is not clipped', curved.uncached);
    check('straightening text restores caching', curved.recached);
    check('curved design exports to PNG', curved.pngOk);

    // --- D. Front auto-layout from a recipe --------------------------------
    // Curved text has an unreliable bounding box (Fabric lays glyphs out along
    // the path, outside the box), so print safety is measured from the rendered
    // pixels instead: no ink may reach the die-cut edge.
    const inspectFront = async (templateId) => {
      await page.evaluate((id) => window.gaiaTest.startDesign(id, 'front'), templateId);
      await waitReady(templateId);
      return page.evaluate(async () => {
        const e = window.gaiaEditor;
        await window.gaiaTest.autoLayout('front', 5);
        const objs = e.canvas.getObjects().filter((o) => !String(o.gaiaKind || '').startsWith('__'));
        const productName = 'Lavender Dream Soap';
        const png = e.exportLabelPng();
        const edgeInk = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const { data } = ctx.getImageData(0, 0, c.width, c.height);
            const band = Math.round(c.width * 0.02);
            let hits = 0;
            for (let y = 0; y < c.height; y++) {
              for (let x = 0; x < c.width; x++) {
                if (x >= band && y >= band && x < c.width - band && y < c.height - band) continue;
                const i = (y * c.width + x) * 4;
                if (data[i] < 110 && data[i + 1] < 110 && data[i + 2] < 110) hits++;
              }
            }
            resolve(hits);
          };
          img.src = png;
        });
        return {
          n: objs.length,
          curvedName: objs.some((o) => typeof o.gaiaCurve === 'number' && o.gaiaCurve !== 0),
          showsName: objs.some((o) => typeof o.text === 'string' && o.text.includes(productName)),
          edgeInk,
        };
      });
    };

    if (bigRound) {
      const front = await inspectFront(bigRound.id);
      check('front auto-layout creates objects', front.n >= 2, `objects=${front.n}`);
      check(`front shows the product name (${bigRound.widthIn}" round)`, front.showsName);
      check('front product name is curved on round label', front.curvedName);
      check('front layout keeps ink away from the die-cut edge', front.edgeInk === 0, `edge pixels=${front.edgeInk}`);
    }

    if (tinyRound && tinyRound.id !== bigRound?.id) {
      const tiny = await inspectFront(tinyRound.id);
      check(`tiny ${tinyRound.widthIn}" round still shows the product name`, tiny.showsName);
      check(`tiny ${tinyRound.widthIn}" round keeps ink off the die-cut edge`, tiny.edgeInk === 0, `edge pixels=${tiny.edgeInk}`);
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
        const objs = e.canvas.getObjects().filter((o) => !String(o.gaiaKind || '').startsWith('__'));
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

    // --- G. Photo adjustments (brightness / contrast / saturation) ---------
    const adjust = await page.evaluate(async () => {
      const e = window.gaiaEditor;
      const img = e.canvas.getObjects().find((o) => o.type === 'image');
      e.canvas.setActiveObject(img);
      e.setImageAdjust({ brightness: 0.4, contrast: -0.2 });
      // The filter rebuild is coalesced into one animation frame.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const filterCount = (img.filters || []).length;
      const stored = img.gaiaAdjust;
      const survivesSave = JSON.parse(e.serialize()).objects.some(
        (o) => o.gaiaAdjust && o.gaiaAdjust.brightness === 0.4,
      );
      e.resetImageAdjust();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { filterCount, stored, survivesSave, afterReset: (img.filters || []).length };
    });
    check('image adjustments build one filter per changed amount', adjust.filterCount === 2, `filters=${adjust.filterCount}`);
    check('image adjustment amounts are stored on the object', adjust.stored && adjust.stored.brightness === 0.4);
    check('image adjustments survive serialization', adjust.survivesSave);
    check('reset clears every image filter', adjust.afterReset === 0);

    // --- H. Layers: drag-to-reorder ----------------------------------------
    const reorder = await page.evaluate(() => {
      const e = window.gaiaEditor;
      const visible = () => e.canvas.getObjects().filter((o) => !String(o.gaiaKind || '').startsWith('__'));
      const before = visible();
      // The panel lists top-most first, so index 0 == front of the stack.
      const bottom = before[0];
      e.reorderLayer(bottom.id, 0);
      const after = visible();
      return { movedToFront: after[after.length - 1].id === bottom.id, count: after.length, wasCount: before.length };
    });
    check('drag-to-reorder moves a layer to the front', reorder.movedToFront);
    check('reorder keeps every layer', reorder.count === reorder.wasCount, `layers=${reorder.count}`);

    // --- I. Object clipboard (copy / paste) --------------------------------
    const clipboard = await page.evaluate(async () => {
      const e = window.gaiaEditor;
      const count = () => e.canvas.getObjects().filter((o) => !String(o.gaiaKind || '').startsWith('__')).length;
      const objs = e.canvas.getObjects().filter((o) => !String(o.gaiaKind || '').startsWith('__'));
      const source = objs[objs.length - 1];
      e.canvas.setActiveObject(source);
      const copied = e.copySelected();
      const before = count();
      await e.pasteClipboard();
      const after = count();
      const pastedId = e.canvas.getActiveObject()?.id;
      // Deleting the original must not stop a further paste.
      e.canvas.setActiveObject(source);
      e.deleteSelected();
      await e.pasteClipboard();
      return { copied, added: after - before, freshId: pastedId !== source.id, afterDelete: count() === after };
    });
    check('copy reports success', clipboard.copied === true);
    check('paste adds exactly one layer', clipboard.added === 1, `added=${clipboard.added}`);
    check('pasted object gets a fresh id', clipboard.freshId);
    check('clipboard survives deleting the original', clipboard.afterDelete);

    // --- J. Mixed batch sheet ----------------------------------------------
    const batchOne = await page.evaluate((per) => window.gaiaTest.buildBatchPdf([Math.ceil(per / 2), Math.floor(per / 2)]), tpl.perSheet);
    const batchTwo = await page.evaluate((per) => window.gaiaTest.buildBatchPdf([per, per, 1]), tpl.perSheet);
    check('mixed batch fills exactly one sheet', batchOne.pages === 1 && batchOne.slots === tpl.perSheet, `slots=${batchOne.slots}`);
    check('mixed batch overflows onto more sheets', batchTwo.pages === 3, `pages=${batchTwo.pages}`);
    check(
      'mixed batch page is US Letter (612×792pt)',
      Math.round(batchOne.width) === 612 && Math.round(batchOne.height) === 792,
      `${Math.round(batchOne.width)}×${Math.round(batchOne.height)}pt`,
    );

    // --- K. Inch rulers -----------------------------------------------------
    const rulers = await page.evaluate(async () => {
      const { useEditorStore } = window.gaiaTestStores;
      const before = document.querySelectorAll('canvas').length;
      useEditorStore.getState().set({ rulersVisible: true });
      await new Promise((r) => setTimeout(r, 120));
      const withRulers = document.querySelectorAll('canvas').length;
      useEditorStore.getState().set({ rulersVisible: false });
      await new Promise((r) => setTimeout(r, 120));
      return { before, withRulers, after: document.querySelectorAll('canvas').length };
    });
    check('ruler toggle adds two ruler canvases', rulers.withRulers === rulers.before + 2, `${rulers.before} → ${rulers.withRulers}`);
    check('ruler toggle removes them again', rulers.after === rulers.before);

    // --- L. Interface scale -------------------------------------------------
    const scale = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    check('interface renders 25% larger by default', Math.abs(scale - 20) < 0.5, `root font-size=${scale}px`);

    // --- M. Workspace search, collections and batch selection ---------------
    const workspace = await page.evaluate(async () => {
      await window.gaiaTest.clearWorkspace();
      await window.gaiaTest.seedWorkspace();
      window.gaiaTestStores.useAppStore.getState().goto('drafts');
      await new Promise((r) => setTimeout(r, 350));

      const cards = () => document.querySelectorAll('[data-testid="draft-card"]').length;
      const search = document.querySelector('input[type="search"]');
      const setSearch = async (value) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(search, value);
        search.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 120));
        return cards();
      };

      const all = cards();
      const byName = await setSearch('cocoa');
      // "lavender" only appears as an ingredient of the recipe behind one design.
      const byIngredient = await setSearch('lavender');
      const byCollection = await setSearch('holiday');
      const noMatch = await setSearch('zzzznope');
      await setSearch('');

      const chips = [...document.querySelectorAll('button[aria-pressed]')]
        .map((b) => b.textContent || '')
        .filter((txt) => /Oily Skin|Holiday Gifts|Unfiled/.test(txt));

      const headers = [...document.querySelectorAll('[data-testid="draft-collection-header"]')]
        .map((d) => getComputedStyle(d).backgroundColor);

      await window.gaiaTest.clearWorkspace();
      return { all, byName, byIngredient, byCollection, noMatch, chips: chips.length, headers };
    });
    check('workspace lists every saved design', workspace.all === 3, `cards=${workspace.all}`);
    check('search matches a design name', workspace.byName === 1, `cards=${workspace.byName}`);
    check('search reaches through recipe to ingredient', workspace.byIngredient === 1, `cards=${workspace.byIngredient}`);
    check('search matches a collection name', workspace.byCollection === 1, `cards=${workspace.byCollection}`);
    check('search with no matches shows nothing', workspace.noMatch === 0);
    check('collection filter chips are rendered', workspace.chips === 3, `chips=${workspace.chips}`);
    check(
      'cards are colour-coded by collection',
      workspace.headers.length === 2 && new Set(workspace.headers).size === 2,
      workspace.headers.join(' / '),
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
