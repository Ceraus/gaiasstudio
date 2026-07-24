import type { Canvas, FabricObject } from 'fabric';

export interface TrimBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  cx: number;
  cy: number;
}

export interface Guide {
  vertical: boolean;
  pos: number;
  /** true when snapping to the label center (drawn slightly stronger). */
  center: boolean;
}

const SNAP_COLOR = 'rgba(236, 72, 153, 0.9)';

interface Candidate {
  pos: number;
  center: boolean;
}

/**
 * Snaps the moving object to the label center, the trim edges and the edges /
 * centers of other objects. Mutates target.left/top and returns the guide lines
 * to render. This powers both the magenta alignment guides and the logo
 * "snap-to-center" behaviour.
 */
export function computeSnapGuides(
  canvas: Canvas,
  target: FabricObject,
  trim: TrimBox,
  threshold = 7,
): Guide[] {
  const others = canvas
    .getObjects()
    .filter(
      (o) =>
        o !== target &&
        o.visible !== false &&
        !String((o as { gaiaKind?: string }).gaiaKind ?? '').startsWith('__'),
    );

  const br = target.getBoundingRect();
  const edgesX = [br.left, br.left + br.width / 2, br.left + br.width];
  const edgesY = [br.top, br.top + br.height / 2, br.top + br.height];

  const candX: Candidate[] = [
    { pos: trim.cx, center: true },
    { pos: trim.left, center: false },
    { pos: trim.right, center: false },
  ];
  const candY: Candidate[] = [
    { pos: trim.cy, center: true },
    { pos: trim.top, center: false },
    { pos: trim.bottom, center: false },
  ];
  const centersX: number[] = [];
  const centersY: number[] = [];
  for (const o of others) {
    const b = o.getBoundingRect();
    candX.push(
      { pos: b.left, center: false },
      { pos: b.left + b.width / 2, center: false },
      { pos: b.left + b.width, center: false },
    );
    candY.push(
      { pos: b.top, center: false },
      { pos: b.top + b.height / 2, center: false },
      { pos: b.top + b.height, center: false },
    );
    centersX.push(b.left + b.width / 2);
    centersY.push(b.top + b.height / 2);
  }

  // Equal-spacing guides: when there are 2+ other objects, offer positions that
  // make the moving object's center evenly spaced with an existing pair (3+ total).
  for (const p of equalSpacingCandidates(centersX)) candX.push({ pos: p, center: false });
  for (const p of equalSpacingCandidates(centersY)) candY.push({ pos: p, center: false });

  const bestX = pickBest(candX, edgesX, threshold);
  const bestY = pickBest(candY, edgesY, threshold);

  const guides: Guide[] = [];
  if (bestX) {
    target.set('left', target.left + bestX.delta);
    guides.push({ vertical: true, pos: bestX.cand.pos, center: bestX.cand.center });
  }
  if (bestY) {
    target.set('top', target.top + bestY.delta);
    guides.push({ vertical: false, pos: bestY.cand.pos, center: bestY.cand.center });
  }
  if (bestX || bestY) target.setCoords();
  return guides;
}

/**
 * Given the centers of the other objects, returns positions that would make the
 * moving object evenly spaced with an adjacent pair — powering equal-gap guides.
 */
function equalSpacingCandidates(centers: number[]): number[] {
  if (centers.length < 2) return [];
  const sorted = [...centers].sort((a, b) => a - b);
  const out = new Set<number>();
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const gap = b - a;
    out.add(a - gap); // extend the pattern to the left
    out.add(b + gap); // extend the pattern to the right
    out.add((a + b) / 2); // sit exactly between the pair
  }
  return [...out];
}

/**
 * Alignment guides shown while resizing an (unrotated) object: highlights when an
 * edge or center lines up with the label or another object. Visual only.
 */
export function computeResizeGuides(
  canvas: Canvas,
  target: FabricObject,
  trim: TrimBox,
  threshold = 6,
): Guide[] {
  if (Math.round((target.angle ?? 0) % 360) !== 0) return [];
  const others = canvas
    .getObjects()
    .filter(
      (o) =>
        o !== target &&
        o.visible !== false &&
        !String((o as { gaiaKind?: string }).gaiaKind ?? '').startsWith('__'),
    );
  const br = target.getBoundingRect();
  const edgesX = [br.left, br.left + br.width / 2, br.left + br.width];
  const edgesY = [br.top, br.top + br.height / 2, br.top + br.height];
  const candX: Candidate[] = [
    { pos: trim.cx, center: true },
    { pos: trim.left, center: false },
    { pos: trim.right, center: false },
  ];
  const candY: Candidate[] = [
    { pos: trim.cy, center: true },
    { pos: trim.top, center: false },
    { pos: trim.bottom, center: false },
  ];
  for (const o of others) {
    const b = o.getBoundingRect();
    candX.push(
      { pos: b.left, center: false },
      { pos: b.left + b.width, center: false },
    );
    candY.push(
      { pos: b.top, center: false },
      { pos: b.top + b.height, center: false },
    );
  }
  const guides: Guide[] = [];
  for (const edge of edgesX) {
    const hit = candX.find((c) => Math.abs(c.pos - edge) <= threshold);
    if (hit) guides.push({ vertical: true, pos: hit.pos, center: hit.center });
  }
  for (const edge of edgesY) {
    const hit = candY.find((c) => Math.abs(c.pos - edge) <= threshold);
    if (hit) guides.push({ vertical: false, pos: hit.pos, center: hit.center });
  }
  return guides;
}

function pickBest(cands: Candidate[], edges: number[], threshold: number) {
  let best: { delta: number; cand: Candidate } | null = null;
  for (const cand of cands) {
    for (const edge of edges) {
      const delta = cand.pos - edge;
      if (Math.abs(delta) <= threshold) {
        if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { delta, cand };
      }
    }
  }
  return best;
}

export function drawGuides(canvas: Canvas, guides: Guide[]) {
  if (!guides.length) return;
  const ctx = canvas.getContext();
  const cw = canvas.getWidth();
  const ch = canvas.getHeight();
  ctx.save();
  ctx.setLineDash([]);
  ctx.strokeStyle = SNAP_COLOR;
  for (const g of guides) {
    ctx.lineWidth = g.center ? 1.4 : 1;
    ctx.beginPath();
    if (g.vertical) {
      ctx.moveTo(g.pos, 0);
      ctx.lineTo(g.pos, ch);
    } else {
      ctx.moveTo(0, g.pos);
      ctx.lineTo(cw, g.pos);
    }
    ctx.stroke();
  }
  ctx.restore();
}
