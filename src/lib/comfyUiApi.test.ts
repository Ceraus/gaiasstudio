import { describe, expect, it, beforeEach } from 'vitest';
import {
  comfyUrlCandidates,
  comfyUrlFromOllama,
  invalidateComfyBase,
  isComfyHttpAlive,
  isComfyNetworkFailure,
  normalizeComfyBaseUrl,
} from './comfyUiApi';

describe('ComfyUI connection helpers', () => {
  beforeEach(() => {
    invalidateComfyBase();
  });

  it('normalizes missing protocol and trailing slashes', () => {
    expect(normalizeComfyBaseUrl('')).toBe('http://127.0.0.1:8188');
    expect(normalizeComfyBaseUrl('100.90.140.100:8188/')).toBe('http://100.90.140.100:8188');
    expect(normalizeComfyBaseUrl('http://127.0.0.1:8188/')).toBe('http://127.0.0.1:8188');
  });

  it('hunts the saved URL first, then localhost fallbacks', () => {
    const urls = comfyUrlCandidates({ comfyUiUrl: 'http://100.90.140.100:8188' });
    expect(urls[0]).toBe('http://100.90.140.100:8188');
    expect(urls).toContain('http://127.0.0.1:8188');
    expect(urls).toContain('http://localhost:8188');
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('does not duplicate localhost when that is the saved URL', () => {
    const urls = comfyUrlCandidates({ comfyUiUrl: 'http://127.0.0.1:8188/' });
    expect(urls.filter((url) => url === 'http://127.0.0.1:8188')).toHaveLength(1);
  });

  it('derives ComfyUI on the same Tailscale host as Ollama', () => {
    expect(comfyUrlFromOllama('https://alaster.tail18528d.ts.net')).toBe('http://alaster.tail18528d.ts.net:8188');
    expect(comfyUrlFromOllama('http://127.0.0.1:11434')).toBeNull();
    const urls = comfyUrlCandidates({
      comfyUiUrl: 'http://100.90.140.100:8188',
      ollamaUrl: 'https://alaster.tail18528d.ts.net',
    });
    expect(urls).toContain('http://alaster.tail18528d.ts.net:8188');
  });

  it('treats any non-500 HTTP reply as alive', () => {
    expect(isComfyHttpAlive(200)).toBe(true);
    expect(isComfyHttpAlive(405)).toBe(true);
    expect(isComfyHttpAlive(0)).toBe(false);
    expect(isComfyHttpAlive(502)).toBe(false);
  });

  it('classifies offline and network errors, not workflow failures', () => {
    expect(isComfyNetworkFailure(new Error('Could not reach ComfyUI.'))).toBe(true);
    expect(isComfyNetworkFailure(new Error('Timed out waiting for ComfyUI.'))).toBe(true);
    expect(isComfyNetworkFailure(new Error('Unreachable — start ComfyUI with --enable-cors-header'))).toBe(true);
    expect(isComfyNetworkFailure(new Error('Failed to fetch'))).toBe(true);
    expect(isComfyNetworkFailure(new Error('ComfyUI job failed.'))).toBe(false);
    expect(isComfyNetworkFailure(new Error('Failed to submit ComfyUI job (400)'))).toBe(false);
  });
});
