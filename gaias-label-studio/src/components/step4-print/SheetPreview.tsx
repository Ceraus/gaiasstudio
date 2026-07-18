import type { AveryTemplate } from "../../../shared/contract";

const SHEET_W_IN = 8.5;
const SHEET_H_IN = 11;
const PREVIEW_PX_PER_IN = 36;

export function SheetPreview({ template, quantity }: { template: AveryTemplate; quantity: number }) {
  const slots = template.columns * template.rows;
  const sheetsNeeded = Math.max(1, Math.ceil(quantity / slots));
  const previewSheets = Math.min(sheetsNeeded, 3);

  return (
    <div className="flex flex-wrap gap-6">
      {Array.from({ length: previewSheets }).map((_, sheetIdx) => {
        const filledOnThisSheet = Math.max(0, Math.min(slots, quantity - sheetIdx * slots));
        return (
          <div
            key={sheetIdx}
            className="relative rounded-md border border-gray-300 bg-white shadow-sm"
            style={{ width: SHEET_W_IN * PREVIEW_PX_PER_IN, height: SHEET_H_IN * PREVIEW_PX_PER_IN }}
          >
            {Array.from({ length: template.rows }).map((_, row) =>
              Array.from({ length: template.columns }).map((_, col) => {
                const index = row * template.columns + col;
                const filled = index < filledOnThisSheet;
                const left = (template.marginLeftIn + col * template.pitchXIn) * PREVIEW_PX_PER_IN;
                const top = (template.marginTopIn + row * template.pitchYIn) * PREVIEW_PX_PER_IN;
                const w = template.widthIn * PREVIEW_PX_PER_IN;
                const h = template.heightIn * PREVIEW_PX_PER_IN;
                const isCircleLike = template.shape === "circle" || template.shape === "oval";
                return (
                  <div
                    key={`${row}-${col}`}
                    className={[
                      "absolute border",
                      filled ? "border-brand-500 bg-brand-100" : "border-gray-300 bg-gray-100",
                      isCircleLike ? "rounded-full" : "rounded-sm",
                    ].join(" ")}
                    style={{ left, top, width: w, height: h }}
                  />
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
