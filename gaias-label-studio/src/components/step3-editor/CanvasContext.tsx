import { createContext, useContext } from "react";
import type { Canvas } from "fabric";

export interface CanvasContextValue {
  canvas: Canvas | null;
  /** Bumps whenever the canvas contents/selection change, so panels that read
   * imperative Fabric state (getObjects, getActiveObject, ...) know to re-render. */
  version: number;
  bump: () => void;
}

export const CanvasContext = createContext<CanvasContextValue>({ canvas: null, version: 0, bump: () => {} });

export function useCanvasContext() {
  return useContext(CanvasContext);
}
