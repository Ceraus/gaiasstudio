import { describe, expect, it } from 'vitest';
import { ALIGNMENT_GRID_IN, ALIGNMENT_GRID_PX, alignmentGridLines } from './overlay';
import { EDITOR_PPI } from '@/lib/units';

describe('Avery alignment grid', () => {
  it('uses a 1/8" spacing at editor PPI', () => {
    expect(ALIGNMENT_GRID_IN).toBe(0.125);
    expect(ALIGNMENT_GRID_PX).toBe(EDITOR_PPI * 0.125);
  });

  it('lays out 19 interior lines across a 2.5" trim', () => {
    const trim = 2.5 * EDITOR_PPI;
    const lines = alignmentGridLines(0, trim, ALIGNMENT_GRID_PX);
    expect(lines).toHaveLength(19);
    expect(lines[0]).toBeCloseTo(ALIGNMENT_GRID_PX);
    expect(lines.at(-1)).toBeCloseTo(trim - ALIGNMENT_GRID_PX);
  });

  it('skips edges so the cut ring is not doubled', () => {
    expect(alignmentGridLines(18.75, 375, 18.75)[0]).toBeCloseTo(37.5);
  });
});
