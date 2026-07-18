import type { LabelShape } from "../../../shared/contract";

export function ShapePreview({ shape, widthIn, heightIn }: { shape: LabelShape; widthIn: number; heightIn: number }) {
  const ratio = widthIn / heightIn;
  const boxW = ratio >= 1 ? 56 : 56 * ratio;
  const boxH = ratio >= 1 ? 56 / ratio : 56;

  const radiusClass = shape === "circle" ? "rounded-full" : shape === "oval" ? "rounded-full" : shape === "square" ? "rounded-md" : "rounded-lg";

  return (
    <div className="flex h-16 w-16 items-center justify-center">
      <div
        className={`border-2 border-brand-500 bg-brand-100 ${radiusClass}`}
        style={{ width: boxW, height: boxH }}
      />
    </div>
  );
}
