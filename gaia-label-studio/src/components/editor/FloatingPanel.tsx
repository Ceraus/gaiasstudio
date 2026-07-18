import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

interface Props {
  title: ReactNode;
  children: ReactNode;
  defaultX?: number;
  defaultY?: number;
  width?: number;
  right?: number;
}

export default function FloatingPanel({
  title,
  children,
  defaultX,
  defaultY = 16,
  width = 288,
  right = 16,
}: Props) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: defaultX ?? Math.max(16, window.innerWidth - width - right),
    y: defaultY,
  }));
  const dragging = useRef<{ dx: number; dy: number } | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const w = elRef.current?.offsetWidth ?? width;
      const x = Math.min(Math.max(8, e.clientX - dragging.current.dx), window.innerWidth - w - 8);
      const y = Math.min(Math.max(8, e.clientY - dragging.current.dy), window.innerHeight - 48);
      setPos({ x, y });
    };
    const onUp = () => {
      dragging.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [width]);

  return (
    <div
      ref={elRef}
      className="fixed z-30 flex max-h-[82vh] flex-col overflow-hidden rounded-2xl bg-white shadow-panel ring-1 ring-slate-200"
      style={{ left: pos.x, top: pos.y, width }}
    >
      <div
        className="flex cursor-grab items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 active:cursor-grabbing"
        onPointerDown={(e) => {
          const rect = elRef.current!.getBoundingClientRect();
          dragging.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
        }}
      >
        <GripVertical className="h-4 w-4 text-slate-400" />
        <div className="flex-1 select-none">{title}</div>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
