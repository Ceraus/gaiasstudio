import { describe, expect, it } from 'vitest';
import { snapEdgesToGrid } from './snapping';
import { ALIGNMENT_GRID_PX } from './overlay';

describe('snapEdgesToGrid', () => {
  const origin = 18.75;
  const end = origin + 375;

  it('snaps an edge onto the nearest 1/8" line', () => {
    const edge = origin + ALIGNMENT_GRID_PX * 4 + 3;
    expect(snapEdgesToGrid([edge], origin, end, ALIGNMENT_GRID_PX, 7)).toBeCloseTo(-3);
  });

  it('snaps to the trim edge when closer than an interior line', () => {
    expect(snapEdgesToGrid([origin + 2], origin, end, ALIGNMENT_GRID_PX, 7)).toBeCloseTo(-2);
  });

  it('returns null when nothing is within the threshold', () => {
    expect(snapEdgesToGrid([origin + 9], origin, end, ALIGNMENT_GRID_PX, 7)).toBeNull();
  });

  it('prefers the closer of several edges', () => {
    const near = origin + ALIGNMENT_GRID_PX + 1;
    const far = origin + ALIGNMENT_GRID_PX * 3 + 4;
    expect(snapEdgesToGrid([near, far], origin, end, ALIGNMENT_GRID_PX, 7)).toBeCloseTo(-1);
  });
});
