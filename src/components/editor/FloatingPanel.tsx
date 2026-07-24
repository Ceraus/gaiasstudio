import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

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

type DragMode =
  | { kind: 'move'; dx: number; dy: number }
  | { kind: 'e'; startX: number; startW: number }         // resize right edge
  | { kind: 's'; startY: number; startH: number }         // resize bottom edge
  | { kind: 'se'; startX: number; startY: number; startW: number; startH: number }; // corner

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
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: defaultX ?? Math.max(16, window.innerWidth - defaultWidth - right),
    y: defaultY,
  }));
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });

  const op = useRef<DragMode | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const m = op.current;
      if (!m) return;
      e.preventDefault();

      if (m.kind === 'move') {
        const w = elRef.current?.offsetWidth ?? size.w;
        const x = Math.min(Math.max(8, e.clientX - m.dx), window.innerWidth - w - 8);
        const y = Math.min(Math.max(8, e.clientY - m.dy), window.innerHeight - 48);
        setPos({ x, y });
        return;
      }

      if (m.kind === 'e' || m.kind === 'se') {
        const rawW = m.startW + (e.clientX - m.startX);
        setSize((s) => ({ ...s, w: Math.max(minWidth, Math.min(rawW, window.innerWidth - 16)) }));
      }
      if (m.kind === 's' || m.kind === 'se') {
        const rawH = m.startH + (e.clientY - m.startY);
        setSize((s) => ({ ...s, h: Math.max(minHeight, Math.min(rawH, window.innerHeight - 32)) }));
      }
    };

    const onUp = () => { op.current = null; };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [minWidth, minHeight, size.w, size.h]);

  const panelH = size.h > 0 ? size.h : undefined;
  const maxH   = size.h > 0 ? undefined : '88vh';

  return (
    <div
      ref={elRef}
      className="fixed z-30 flex flex-col overflow-hidden rounded-2xl bg-white shadow-panel ring-1 ring-slate-200"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: panelH,
        maxHeight: maxH,
      }}
    >
      {/* ── Drag handle (title bar) ─────────────────────────────────────── */}
      <div
        className="flex cursor-grab select-none items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 active:cursor-grabbing"
        onPointerDown={(e) => {
          // Don't start move if user clicks a child button
          if ((e.target as HTMLElement).closest('button')) return;
          const rect = elRef.current!.getBoundingClientRect();
          op.current = { kind: 'move', dx: e.clientX - rect.left, dy: e.clientY - rect.top };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
      >
        <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="flex-1">{title}</div>
        {/* Size hint */}
        <span className="shrink-0 select-none text-[10px] text-slate-300">
          {size.w} × {panelH ?? '…'}
        </span>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

      {/* ── Right-edge resize strip ──────────────────────────────────────── */}
      <div
        className="absolute right-0 top-10 bottom-5 w-2 cursor-ew-resize"
        onPointerDown={(e) => {
          e.preventDefault();
          const rect = elRef.current!.getBoundingClientRect();
          op.current = { kind: 'e', startX: e.clientX, startW: rect.width };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
      />

      {/* ── Bottom-edge resize strip ─────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-5 right-5 h-2 cursor-ns-resize"
        onPointerDown={(e) => {
          e.preventDefault();
          const rect = elRef.current!.getBoundingClientRect();
          op.current = { kind: 's', startY: e.clientY, startH: rect.height };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
      />

      {/* ── Corner resize grip ───────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize"
        onPointerDown={(e) => {
          e.preventDefault();
          const rect = elRef.current!.getBoundingClientRect();
          op.current = {
            kind: 'se',
            startX: e.clientX,
            startY: e.clientY,
            startW: rect.width,
            startH: rect.height,
          };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
      >
        {/* Visual grip dots */}
        <svg
          viewBox="0 0 12 12"
          className="absolute bottom-1 right-1 h-3 w-3 text-slate-300"
          fill="currentColor"
        >
          <circle cx="10" cy="10" r="1.2" />
          <circle cx="6" cy="10" r="1.2" />
          <circle cx="10" cy="6" r="1.2" />
          <circle cx="2" cy="10" r="1.2" />
          <circle cx="6" cy="6" r="1.2" />
          <circle cx="10" cy="2" r="1.2" />
        </svg>
      </div>
    </div>
  );
}
