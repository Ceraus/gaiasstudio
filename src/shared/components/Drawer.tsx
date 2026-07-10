import { X } from "lucide-react";
import type { ReactNode } from "react";

interface DrawerProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Drawer({ title, open, onClose, children }: DrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30">
      <aside className="safe-top safe-bottom ml-auto flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" aria-label="Close drawer" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="app-scroll flex-1 overflow-y-auto p-4 scrollbar-soft sm:p-5">{children}</div>
      </aside>
    </div>
  );
}
