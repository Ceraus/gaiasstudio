import { type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { Rnd } from 'react-rnd';

interface Props {
  title: ReactNode;
  children: ReactNode;
  /** Initial X position. Defaults to right-docked (window width − defaultWidth − right). */
  defaultX?: number;
  defaultY?: number;
  /** Starting width in px. */
  defaultWidth?: number;
  /** Starting height in px. 0 = unconstrained (panel grows with content up to maxH). */
  defaultHeight?: number;
  /** Right offset used when defaultX is omitted. */
  right?: number;
  minWidth?: number;
  minHeight?: number;
}

export default function FloatingPanel({
  title,
  children,
  defaultX,
  defaultY = 16,
  defaultWidth = 540,
  defaultHeight = 0,
  right = 16,
  minWidth = 260,
  minHeight = 160,
}: Props) {
  return (
    <Rnd
      bounds="window"
      dragHandleClassName="gaia-floating-panel-handle"
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth="calc(100vw - 16px)"
      maxHeight="calc(100vh - 16px)"
      default={{
        x: defaultX ?? Math.max(8, window.innerWidth - defaultWidth - right),
        y: defaultY,
        width: defaultWidth,
        height: defaultHeight > 0 ? defaultHeight : Math.min(640, window.innerHeight * 0.78),
      }}
      className="!fixed !z-30 flex flex-col overflow-hidden rounded-2xl bg-white shadow-panel ring-1 ring-slate-200"
      enableResizing={{
        top: false,
        right: true,
        bottom: true,
        left: false,
        topRight: false,
        bottomRight: true,
        bottomLeft: false,
        topLeft: false,
      }}
    >
      <div
        className="gaia-floating-panel-handle flex cursor-grab select-none items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="flex-1">{title}</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </Rnd>
  );
}
