import type { ReactNode } from "react";

interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  children: ReactNode;
}

export function Tabs({ tabs, active, onChange, children }: TabsProps) {
  return (
    <div>
      <div className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-slate-100 p-1 scrollbar-soft">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${active === tab.id ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
