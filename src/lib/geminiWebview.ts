/** Helpers for the Electron <webview> that hosts Gemini in Prompt Builder. */

export type GeminiInjectResult = {
  ok: boolean;
  sent?: boolean;
  reason?: string;
};

export type GeminiHarvestResult = {
  dataUrl?: string;
  clickedDownload?: boolean;
  src?: string;
};

const INJECT_FN = `async (text) => {
  const deadline = Date.now() + 14000;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 80 && r.height > 18 && r.bottom > 0 && r.top < window.innerHeight;
  };
  const findBox = () => {
    const nodes = [
      ...document.querySelectorAll('div[contenteditable="true"]'),
      ...document.querySelectorAll('textarea'),
    ];
    return nodes.find(visible) || null;
  };
  let box = findBox();
  while (!box && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
    box = findBox();
  }
  if (!box) return { ok: false, reason: 'no-input' };
  box.focus();
  if (box instanceof HTMLTextAreaElement) {
    const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    proto?.set?.call(box, text);
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(box);
    sel?.removeAllRanges();
    sel?.addRange(range);
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted) {
      box.textContent = text;
      box.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
    }
  }
  await new Promise((r) => setTimeout(r, 250));
  const send = [...document.querySelectorAll('button')].find((b) => {
    const label = (b.getAttribute('aria-label') || b.textContent || '').trim();
    return /^(send|submit|enviar)$/i.test(label) || /send message|enviar mensaje/i.test(label);
  });
  if (send && !send.disabled) send.click();
  return { ok: true, sent: !!(send && !send.disabled) };
}`;

const HARVEST_FN = `async (seenSrc) => {
  const tooSmall = (img) => img.naturalWidth < 256 || img.naturalHeight < 256;
  const skip = (img) => /avatar|icon|logo|emoji|sprite|favicon/i.test((img.src || '') + (img.alt || ''));
  const imgs = [...document.querySelectorAll('img')].filter((img) => !tooSmall(img) && !skip(img));
  const newest = imgs[imgs.length - 1];
  if (!newest) return {};
  const src = newest.currentSrc || newest.src || '';
  if (!src || src === seenSrc) return {};
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('not-image');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { dataUrl, src };
  } catch {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /download/i.test(b.getAttribute('aria-label') || b.textContent || ''),
    );
    if (btn) {
      btn.click();
      return { clickedDownload: true, src };
    }
    return { src };
  }
}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebviewEl = any;

export async function injectGeminiPrompt(webview: WebviewEl, prompt: string): Promise<GeminiInjectResult> {
  if (!webview?.executeJavaScript) return { ok: false, reason: 'no-webview' };
  const script = `(${INJECT_FN})(${JSON.stringify(prompt)})`;
  try {
    const result = await webview.executeJavaScript(script, true);
    return (result ?? { ok: false, reason: 'empty' }) as GeminiInjectResult;
  } catch {
    return { ok: false, reason: 'exec-failed' };
  }
}

export async function harvestGeminiImage(
  webview: WebviewEl,
  seenSrc = '',
): Promise<GeminiHarvestResult> {
  if (!webview?.executeJavaScript) return {};
  const script = `(${HARVEST_FN})(${JSON.stringify(seenSrc)})`;
  try {
    const result = await webview.executeJavaScript(script, true);
    return (result ?? {}) as GeminiHarvestResult;
  } catch {
    return {};
  }
}

export function waitForWebviewReady(webview: WebviewEl, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve) => {
    if (!webview) {
      resolve();
      return;
    }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      webview.removeEventListener?.('did-stop-loading', done);
      resolve();
    };
    webview.addEventListener?.('did-stop-loading', done);
    window.setTimeout(done, timeoutMs);
  });
}
