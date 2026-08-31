import type { AveryTemplate } from '@/types';
import { shapeColorTokens } from '@/lib/shapeColors';
import { sheetPreviewSlots } from '@/lib/sheetPreviewLayout';

const FILL_OFF = '#f1f5f9';
const STROKE_OFF = '#e2e8f0';

export default function SheetMiniPreview({
  template,
  highlight = Infinity,
  maxHeight = 190,
}: {
  template: AveryTemplate;
  highlight?: number;
  maxHeight?: number;
}) {
  const { pageWidthIn, pageHeightIn, shape } = template;
  const colors = shapeColorTokens(shape);
  const height = maxHeight;
  const width = height * (pageWidthIn / pageHeightIn);
  const slots = sheetPreviewSlots(template);
  const strokeIn = Math.min(pageWidthIn, pageHeightIn) * 0.0025;
  const fillId = `sheet-slot-fill-${template.id}`;

  return (
    <svg
      data-testid="sheet-mini-preview"
      viewBox={`0 0 ${pageWidthIn} ${pageHeightIn}`}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
      className="mx-auto block rounded-md bg-white shadow-inner ring-1 ring-slate-200"
      overflow="hidden"
      aria-hidden
      data-shape-color={colors.hex}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.tint} />
          <stop offset="100%" stopColor={colors.border} />
        </linearGradient>
      </defs>
      {slots.map((s) => {
        const on = s.idx < highlight;
        const fill = on ? `url(#${fillId})` : FILL_OFF;
        const stroke = on ? colors.hex : STROKE_OFF;
        if (shape === 'circle' || shape === 'oval') {
          return (
            <ellipse
              key={s.idx}
              data-testid="sheet-slot"
              data-col={s.col}
              data-row={s.row}
              cx={s.xIn + s.wIn / 2}
              cy={s.yIn + s.hIn / 2}
              rx={s.wIn / 2}
              ry={s.hIn / 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeIn}
            />
          );
        }
        const radius =
          shape === 'rounded-rectangle'
            ? (template.cornerRadiusIn || Math.min(s.wIn, s.hIn) * 0.18)
            : Math.min(s.wIn, s.hIn) * 0.02;
        return (
          <rect
            key={s.idx}
            data-testid="sheet-slot"
            data-col={s.col}
            data-row={s.row}
            x={s.xIn}
            y={s.yIn}
            width={s.wIn}
            height={s.hIn}
            rx={radius}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeIn}
          />
        );
      })}
    </svg>
  );
}
