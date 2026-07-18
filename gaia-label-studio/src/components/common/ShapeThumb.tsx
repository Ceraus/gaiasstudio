import type { AveryTemplate } from '@/types';

export default function ShapeThumb({
  template,
  size = 56,
}: {
  template: AveryTemplate;
  size?: number;
}) {
  const { labelWidthIn, labelHeightIn, shape, cornerRadiusIn } = template;
  const ar = labelWidthIn / labelHeightIn;
  let w: number;
  let h: number;
  if (ar >= 1) {
    w = size;
    h = size / ar;
  } else {
    h = size;
    w = size * ar;
  }
  const minSide = Math.min(w, h);
  const radius =
    shape === 'circle' || shape === 'oval'
      ? '50%'
      : shape === 'rounded-rectangle'
        ? `${(cornerRadiusIn / Math.min(labelWidthIn, labelHeightIn)) * minSide}px`
        : '4px';

  return (
    <div className="flex items-center justify-center" style={{ height: size, width: size }}>
      <div
        className="border-2 border-gaia-400 bg-gradient-to-br from-gaia-50 to-gaia-100"
        style={{ width: Math.max(6, w), height: Math.max(6, h), borderRadius: radius }}
      />
    </div>
  );
}
