import { StaticCanvas } from "fabric";
import { withExportGuardsHidden } from "./fabricHelpers";

/**
 * Renders a saved canvas JSON snapshot to a flattened PNG data URL, ready to
 * be stamped into the print PDF grid. Runs on a detached, off-screen
 * StaticCanvas so it never disturbs whatever is currently shown in the
 * live editor. Bleed-mask guide bands are hidden for the duration of the
 * render so they never appear in the physical print output.
 */
export async function flattenProjectToDataUrl(
  canvasJson: string,
  widthPx: number,
  heightPx: number,
  multiplier = 4
): Promise<string> {
  const el = document.createElement("canvas");
  const staticCanvas = new StaticCanvas(el, { width: widthPx, height: heightPx, backgroundColor: "#ffffff" });
  await staticCanvas.loadFromJSON(JSON.parse(canvasJson));
  staticCanvas.renderAll();

  const dataUrl = await withExportGuardsHidden(staticCanvas as any, () => {
    staticCanvas.renderAll();
    return staticCanvas.toDataURL({ format: "png", multiplier });
  });

  staticCanvas.dispose();
  return dataUrl;
}
