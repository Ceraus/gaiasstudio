import type { AveryTemplate } from '@/types';
import { footprintHeightIn, footprintWidthIn, slotPositionIn } from '@/lib/units';

export default function SheetMiniPreview({
  template,
  highlight = Infinity,
  maxHeight = 190,
}: {
  template: AveryTemplate;
  highlight?: number;
  maxHeight?: number;
}) {
  const { pageWidthIn, pageHeightIn, columns, rows, shape } = template;
  const height = maxHeight;
  const width = height * (pageWidthIn / pageHeightIn);
  const fw = footprintWidthIn(template);
  const fh = footprintHeightIn(template);

  const slots: { idx: number; left: number; top: number; w: number; h: number }[] = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const { xIn, yIn } = slotPositionIn(template, c, r);
      slots.push({
        idx,
        left: (xIn / pageWidthIn) * 100,
        top: (yIn / pageHeightIn) * 100,
        w: (fw / pageWidthIn) * 100,
        h: (fh / pageHeightIn) * 100,
      });
      idx++;
    }
  }

  const radius =
    shape === 'circle' || shape === 'oval' ? '50%' : shape === 'rounded-rectangle' ? '18%' : '2px';

  return (
    <div
      className="relative mx-auto rounded-md bg-white shadow-inner ring-1 ring-slate-200"
      style={{ width, height }}
    >
      {slots.map((s) => (
        <div
          key={s.idx}
          className={
            s.idx < highlight
              ? 'absolute border border-gaia-500 bg-gaia-300/70'
              : 'absolute border border-slate-200 bg-slate-100'
          }
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.w}%`,
            height: `${s.h}%`,
            borderRadius: radius,
          }}
        />
      ))}
    </div>
  );
}
