import { describe, expect, it } from 'vitest';
import type { AveryDataset, AveryTemplate } from '@/types';
import dataset from '@/data/averyTemplates.json';
import { sheetPreviewCluster, sheetPreviewSlots } from './sheetPreviewLayout';

const catalog = dataset as AveryDataset;

function byId(id: string): AveryTemplate {
  const found = catalog.templates.find((t) => t.id === id);
  if (!found) throw new Error(`Missing catalog template ${id}`);
  return found;
}

describe('sheet preview layout vs Avery catalog', () => {
  it('5745 is four 1/4" rounds in a centered 2×2 cluster, not a full-sheet grid', () => {
    const t = byId('5745');
    expect(t.perSheet).toBe(4);
    expect(t.columns).toBe(2);
    expect(t.rows).toBe(2);
    expect(t.labelWidthIn).toBe(0.25);
    expect(t.labelHeightIn).toBe(0.25);

    const slots = sheetPreviewSlots(t);
    expect(slots).toHaveLength(4);
    for (const s of slots) {
      expect(s.wIn).toBeCloseTo(0.25);
      expect(s.hIn).toBeCloseTo(0.25);
    }

    const cluster = sheetPreviewCluster(slots);
    expect(cluster.widthIn).toBeCloseTo(0.5);
    expect(cluster.heightIn).toBeCloseTo(0.5);
    expect(cluster.centerXIn).toBeCloseTo(t.pageWidthIn / 2);
    expect(cluster.centerYIn).toBeCloseTo(t.pageHeightIn / 2);
    expect(cluster.widthIn / t.pageWidthIn).toBeLessThan(0.1);
  });

  it('6738 is four 3/4" rounds in a centered 2×2 cluster', () => {
    const t = byId('6738');
    expect(t.perSheet).toBe(4);
    expect(t.columns).toBe(2);
    expect(t.rows).toBe(2);

    const slots = sheetPreviewSlots(t);
    expect(slots).toHaveLength(4);
    const cluster = sheetPreviewCluster(slots);
    expect(cluster.widthIn).toBeCloseTo(1.5);
    expect(cluster.heightIn).toBeCloseTo(1.5);
    expect(cluster.centerXIn).toBeCloseTo(t.pageWidthIn / 2);
    expect(cluster.centerYIn).toBeCloseTo(t.pageHeightIn / 2);
  });

  it('22562 is nine 2.5" rounds in a 3×3 sheet grid', () => {
    const t = byId('22562');
    expect(t.perSheet).toBe(9);
    expect(t.columns).toBe(3);
    expect(t.rows).toBe(3);

    const slots = sheetPreviewSlots(t);
    expect(slots).toHaveLength(9);
    expect(new Set(slots.map((s) => s.col)).size).toBe(3);
    expect(new Set(slots.map((s) => s.row)).size).toBe(3);
    for (const s of slots) {
      expect(s.wIn).toBeCloseTo(2.5);
      expect(s.hIn).toBeCloseTo(2.5);
    }
  });

  it('5160 is thirty 2.625" × 1" rectangles in a 3×10 grid', () => {
    const t = byId('5160');
    expect(t.perSheet).toBe(30);
    expect(t.columns).toBe(3);
    expect(t.rows).toBe(10);

    const slots = sheetPreviewSlots(t);
    expect(slots).toHaveLength(30);
    expect(slots[0].wIn).toBeCloseTo(2.625);
    expect(slots[0].hIn).toBeCloseTo(1);
    expect(slots[1].xIn - slots[0].xIn).toBeCloseTo(2.625 + t.gutterXIn);
    expect(slots[3].yIn - slots[0].yIn).toBeCloseTo(1 + t.gutterYIn);
  });

  it('wrap ribbon uses rotated footprint: five tall strips, not a 9" landscape row', () => {
    const t = byId('ribbon-9x1-2');
    expect(t.rotateForPrint).toBe(true);
    expect(t.perSheet).toBe(5);
    expect(t.columns).toBe(5);
    expect(t.rows).toBe(1);

    const slots = sheetPreviewSlots(t);
    expect(slots).toHaveLength(5);
    for (const s of slots) {
      expect(s.wIn).toBeCloseTo(t.labelHeightIn);
      expect(s.hIn).toBeCloseTo(t.labelWidthIn);
      expect(s.wIn).toBeLessThan(s.hIn);
    }
  });
});
