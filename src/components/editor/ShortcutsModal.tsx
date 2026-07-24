/**
 * ShortcutsModal — press ? in the editor (or click the ? button in the header)
 * to view all keyboard shortcuts in a clean overlay.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';
const alt = isMac ? '⌥' : 'Alt';

const GROUPS = [
  {
    label: 'History',
    rows: [
      [`${mod}+Z`, 'Undo'],
      [`${mod}+Y  /  ${mod}+Shift+Z`, 'Redo'],
    ],
  },
  {
    label: 'Selection',
    rows: [
      [`${mod}+A`, 'Select all'],
      [`${mod}+D`, 'Duplicate'],
      [`${mod}+G`, 'Group'],
      [`${mod}+Shift+G`, 'Ungroup'],
      [`Del / Backspace`, 'Delete'],
      [`Esc`, 'Deselect / close'],
    ],
  },
  {
    label: 'Move & Nudge',
    rows: [
      ['Arrow keys', 'Nudge 1 px'],
      ['Shift + Arrow', 'Nudge 10 px'],
    ],
  },
  {
    label: 'Layer Order',
    rows: [
      ['[ (bracket)', 'Move down one layer'],
      ['] (bracket)', 'Move up one layer'],
    ],
  },
  {
    label: 'Style',
    rows: [
      [`${mod}+Shift+C`, 'Copy style'],
      [`${mod}+Shift+V`, 'Paste style'],
    ],
  },
  {
    label: 'View',
    rows: [
      [`${mod}+= / Scroll up`, 'Zoom in'],
      [`${mod}+- / Scroll down`, 'Zoom out'],
      [`${mod}+0`, 'Fit to screen'],
    ],
  },
  {
    label: 'Text (while editing)',
    rows: [
      [`${mod}+B`, 'Bold'],
      [`${mod}+I`, 'Italic'],
      [`${mod}+U`, 'Underline'],
      ['Esc', 'Stop editing text'],
    ],
  },
  {
    label: 'Other',
    rows: [
      ['?', 'Show this help'],
      [`${mod}+P  /  ${alt}+P`, 'Toggle print overlay'],
    ],
  },
] as const;

export default function ShortcutsModal({ open, onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('shortcuts.title', 'Keyboard shortcuts')}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-gaia-600" />
            <h2 className="text-base font-semibold text-slate-800">
              {t('shortcuts.title', 'Keyboard Shortcuts')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gaia-500"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — two-column grid of groups */}
        <div className="grid flex-1 grid-cols-1 gap-x-8 gap-y-6 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{g.label}</p>
              <table className="w-full text-sm">
                <tbody>
                  {g.rows.map(([key, desc]) => (
                    <tr key={key} className="border-b border-slate-50">
                      <td className="py-1 pr-3 font-mono text-[12px] text-slate-600">
                        {key.split('/').map((k, i) => (
                          <span key={i}>
                            {i > 0 && <span className="mx-1 text-slate-300">/</span>}
                            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200">{k.trim()}</kbd>
                          </span>
                        ))}
                      </td>
                      <td className="py-1 text-slate-600">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 px-6 py-3">
          <p className="text-xs text-slate-400">
            {t('shortcuts.tip', 'Press ? anywhere in the editor to toggle this panel.')}
          </p>
        </div>
      </div>
    </div>
  );
}
