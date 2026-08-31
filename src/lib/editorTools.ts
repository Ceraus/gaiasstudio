/** Photoshop / Avery-style editor tools (keyboard shortcuts in parentheses). */
export type EditorTool =
  | 'move'
  | 'text'
  | 'image'
  | 'shape'
  | 'codes'
  | 'eraser'
  | 'hand'
  | 'zoom';

export type TextPlacementMode = 'standard' | 'curved';
export type PendingShapeKind =
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'line'
  | 'roundRect'
  | 'star'
  | 'arrow'
  | 'hexagon';

export const EDITOR_TOOL_SHORTCUTS: Record<string, EditorTool> = {
  v: 'move',
  t: 'text',
  i: 'image',
  u: 'shape',
  b: 'codes',
  e: 'eraser',
  h: 'hand',
  z: 'zoom',
};

export function toolFromKey(key: string): EditorTool | null {
  return EDITOR_TOOL_SHORTCUTS[key.toLowerCase()] ?? null;
}
