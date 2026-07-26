import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { db } from '@/db/db';

// ── Log interception ──────────────────────────────────────────────────────────

type LogLevel = 'log' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  time: string;
}

const LOG_BUFFER: LogEntry[] = [];
let logInterceptInstalled = false;

function installLogIntercept() {
  if (logInterceptInstalled) return;
  logInterceptInstalled = true;
  const wrap =
    (level: LogLevel, orig: (...a: unknown[]) => void) =>
    (...args: unknown[]) => {
      orig.apply(console, args);
      LOG_BUFFER.push({
        level,
        message: args
          .map((a) =>
            a instanceof Error
              ? a.message
              : typeof a === 'object'
              ? JSON.stringify(a)
              : String(a)
          )
          .join(' '),
        time: new Date().toLocaleTimeString(),
      });
      if (LOG_BUFFER.length > 50) LOG_BUFFER.shift();
    };
  console.log = wrap('log', console.log.bind(console));
  console.warn = wrap('warn', console.warn.bind(console));
  console.error = wrap('error', console.error.bind(console));
}

// Install in dev or when debug panel is opened — avoids patching console in production.
if (import.meta.env.DEV) {
  installLogIntercept();
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'state' | 'db' | 'canvas' | 'logs';

interface DbCounts {
  ingredients: number;
  recipes: number;
  assets: number;
  drafts: number;
  versions: number;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DebugPanel() {
  const settings = useAppStore((s) => s.settings);
  const visible = import.meta.env.DEV || !!settings.debugMode;

  if (!visible) return null;
  return <DebugPanelInner />;
}

function DebugPanelInner() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('state');

  // Draggable state
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [pos, setPos] = useState({ x: 16, y: 16 }); // distance from bottom-right

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      setPos({
        x: Math.max(0, dragState.current.origX - dx),
        y: Math.max(0, dragState.current.origY - dy),
      });
      void rect; // suppress lint
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  if (!open) {
    return (
      <button
        title="Open Debug Panel"
        onClick={() => setOpen(true)}
        style={{ right: pos.x, bottom: pos.y }}
        className="fixed z-[9999] flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-lg text-white shadow-lg hover:bg-slate-700"
      >
        🐛
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{ right: pos.x, bottom: pos.y, width: 400, height: 500 }}
      className="fixed z-[9999] flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-xs text-slate-200 shadow-2xl"
    >
      {/* Header — drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="flex cursor-grab items-center justify-between bg-slate-800 px-3 py-2 active:cursor-grabbing"
      >
        <span className="font-mono font-semibold text-slate-100">🐛 Debug Panel</span>
        <button
          onClick={() => setOpen(false)}
          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-600 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-slate-700 bg-slate-800">
        {(['state', 'db', 'canvas', 'logs'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 font-mono text-xs capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-green-400 text-green-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'state' && <StateTab />}
        {tab === 'db' && <DbTab />}
        {tab === 'canvas' && <CanvasTab />}
        {tab === 'logs' && <LogsTab />}
      </div>
    </div>
  );
}

// ── State Tab ─────────────────────────────────────────────────────────────────

function StateTab() {
  const screen = useAppStore((s) => s.screen);
  const template = useAppStore((s) => s.template);
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const activeDraftId = useAppStore((s) => s.activeDraftId);
  const designId = useAppStore((s) => s.designId);
  const designJson = useAppStore((s) => s.designJson);
  const settings = useAppStore((s) => s.settings);

  const rows: [string, unknown][] = [
    ['screen', screen],
    ['template.id', template?.id ?? null],
    ['template.name', template?.name ?? null],
    ['activeRecipeId', activeRecipeId],
    ['activeDraftId', activeDraftId],
    ['designId', designId],
    ['designJson (bytes)', designJson ? designJson.length : null],
    ['settings.language', settings.language],
    ['settings.debugMode', settings.debugMode ?? false],
  ];

  return (
    <table className="w-full font-mono">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-slate-800">
            <td className="px-3 py-1 text-slate-400">{k}</td>
            <td className="break-all px-3 py-1 text-green-300">
              {v === null || v === undefined ? (
                <span className="text-slate-500">null</span>
              ) : (
                String(v)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── DB Tab ────────────────────────────────────────────────────────────────────

function DbTab() {
  const [counts, setCounts] = useState<DbCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ingredients, recipes, assets, drafts, versions] = await Promise.all([
        db.ingredients.count(),
        db.recipes.count(),
        db.assets.count(),
        db.drafts.count(),
        db.versions.count(),
      ]);
      setCounts({ ingredients, recipes, assets, drafts, versions });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-slate-400">Dexie row counts</span>
        <button
          onClick={() => void refresh()}
          className="rounded bg-slate-700 px-2 py-0.5 text-slate-300 hover:bg-slate-600"
        >
          ↻ Refresh
        </button>
      </div>
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : counts ? (
        <table className="w-full font-mono">
          <tbody>
            {(Object.entries(counts) as [keyof DbCounts, number][]).map(([k, v]) => (
              <tr key={k} className="border-b border-slate-800">
                <td className="px-3 py-1 text-slate-400">{k}</td>
                <td className="px-3 py-1 text-green-300">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

// ── Canvas Tab ────────────────────────────────────────────────────────────────

function CanvasTab() {
  const [info, setInfo] = useState<string>('');

  const refresh = useCallback(() => {
    const editor = (window as unknown as Record<string, unknown>).gaiaEditor as
      | {
          canvas?: { getObjects?: () => unknown[]; getActiveObject?: () => unknown };
        }
      | undefined;

    if (!editor) {
      setInfo('window.gaiaEditor is not set (editor not open)');
      return;
    }

    const canvas = editor.canvas;
    const objects = canvas?.getObjects?.() ?? [];
    const active = canvas?.getActiveObject?.();

    const lines: string[] = [];
    lines.push(`Total objects: ${objects.length}`);
    if (active) {
      const a = active as Record<string, unknown>;
      lines.push('');
      lines.push('── Selected object ──');
      lines.push(`type: ${a.type ?? 'unknown'}`);
      if (typeof a.left === 'number') lines.push(`left: ${a.left.toFixed(2)}`);
      if (typeof a.top === 'number') lines.push(`top: ${a.top.toFixed(2)}`);
      if (typeof a.width === 'number') lines.push(`width: ${a.width.toFixed(2)}`);
      if (typeof a.height === 'number') lines.push(`height: ${a.height.toFixed(2)}`);
      if (a.text !== undefined) lines.push(`text: "${String(a.text).slice(0, 60)}"`);
      if (a.fill !== undefined) lines.push(`fill: ${a.fill}`);
    } else {
      lines.push('No active selection');
    }

    setInfo(lines.join('\n'));
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <pre className="whitespace-pre-wrap break-all p-3 font-mono leading-5 text-green-300">
      {info}
    </pre>
  );
}

// ── Logs Tab ──────────────────────────────────────────────────────────────────

function LogsTab() {
  const [, forceRender] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => forceRender((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  });

  const levelColor: Record<LogLevel, string> = {
    log: 'text-slate-300',
    warn: 'text-yellow-300',
    error: 'text-red-400',
  };

  return (
    <div className="divide-y divide-slate-800 font-mono">
      {LOG_BUFFER.length === 0 ? (
        <p className="p-3 text-slate-500">No logs captured yet.</p>
      ) : (
        LOG_BUFFER.map((entry, i) => (
          <div key={i} className="px-3 py-1">
            <span className="mr-2 text-slate-500">{entry.time}</span>
            <span
              className={`mr-2 rounded px-1 text-[10px] font-bold uppercase ${
                entry.level === 'error'
                  ? 'bg-red-900 text-red-300'
                  : entry.level === 'warn'
                  ? 'bg-yellow-900 text-yellow-300'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {entry.level}
            </span>
            <span className={`break-all ${levelColor[entry.level]}`}>{entry.message}</span>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
