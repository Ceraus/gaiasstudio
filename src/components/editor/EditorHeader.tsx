import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, Check, Cloud, Keyboard, Layers, Loader2, Printer, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useEditorStore } from '@/store/useEditorStore';
import { describeSize } from '@/lib/units';
import { editor } from '@/lib/fabric/editorController';
import { setsRepo } from '@/db/repositories';
import type { LabelSet } from '@/types';
import ShortcutsModal from './ShortcutsModal';

export default function EditorHeader() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const setDesignJson = useAppStore((s) => s.setDesignJson);
  const setLabelPng = useAppStore((s) => s.setLabelPng);
  const template = useAppStore((s) => s.template);
  const context = useAppStore((s) => s.context);
  const saveState = useEditorStore((s) => s.saveState);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [saveToSetOpen, setSaveToSetOpen] = useState(false);
  const [showAutosaved, setShowAutosaved] = useState(false);

  // Show "Autosaved" badge for 3 seconds after each successful autosave
  useEffect(() => {
    if (saveState === 'saved') {
      setShowAutosaved(true);
      const timer = setTimeout(() => setShowAutosaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveState]);

  // Press ? anywhere in the editor to toggle the shortcuts overlay
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '?') setShortcutsOpen((o) => !o);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const openExport = () => {
    setLabelPng(editor.exportLabelPng());
    setDesignJson(editor.serialize());
    goto('export');
  };

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button className="icon-btn" title={t('common.back')} onClick={() => goto('template')}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {template ? template.name : t('steps.design')}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {template ? describeSize(template) : ''} · {t(`template.${context}`)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-1 text-xs sm:flex"
            style={{ color: saveState === 'error' ? '#e11d48' : 'rgb(148 163 184)' }}
          >
            {saveState === 'saving' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('drafts.autoSaving', 'Saving…')}
              </>
            ) : showAutosaved ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-600">{t('drafts.autosaved', 'Autosaved')}</span>
              </>
            ) : saveState === 'error' ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('editor.saveError', 'Autosave failed — check storage')}
              </>
            ) : (
              <Cloud className="h-3.5 w-3.5" />
            )}
          </span>

          <button
            className="icon-btn"
            title={t('sets.saveToSet', 'Save to Label Set')}
            aria-label={t('sets.saveToSet', 'Save to Label Set')}
            onClick={() => setSaveToSetOpen(true)}
          >
            <Layers className="h-4 w-4" />
          </button>

          <button
            className="icon-btn"
            title={t('shortcuts.title', 'Keyboard shortcuts (?)')}
            aria-label={t('shortcuts.title', 'Keyboard shortcuts')}
            onClick={() => setShortcutsOpen(true)}
          >
            <Keyboard className="h-4 w-4" />
          </button>

          <button className="btn-primary" onClick={openExport}>
            <Printer className="h-4 w-4" /> {t('export.title')}
          </button>
        </div>
      </header>

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {saveToSetOpen && (
        <SaveToSetModal
          context={context}
          templateId={template?.id ?? ''}
          onClose={() => setSaveToSetOpen(false)}
          t={t}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Save-to-Set modal
// ---------------------------------------------------------------------------
function SaveToSetModal({
  context,
  templateId,
  onClose,
  t,
}: {
  context: string;
  templateId: string;
  onClose: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const [sets, setSets] = useState<LabelSet[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [ctx, setCtx] = useState<'front' | 'back' | 'side'>(
    context === 'back' ? 'back' : context === 'side' ? 'side' : 'front',
  );
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setsRepo.all().then(setSets).catch(() => {});
  }, []);

  const save = async () => {
    let id = selectedId;
    if (!id && newSetName.trim()) {
      setCreating(true);
      const set = await setsRepo.create(newSetName.trim());
      id = set.id;
      setCreating(false);
    }
    if (!id) return;
    setSaving(true);
    const json = editor.serialize();
    const thumb = editor.exportLabelPng();
    await setsRepo.update(id, {
      [`${ctx}Json`]: json,
      [`${ctx}TemplateId`]: templateId,
      [`${ctx}Thumb`]: thumb,
    });
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-800">{t('sets.saveToSet', 'Save to Label Set')}</p>
          <button className="icon-btn" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        {done ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" /> {t('sets.saved', 'Design saved to set!')}
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">{t('sets.chooseSide', 'Which side is this?')}</label>
              <div className="flex gap-2">
                {(['front', 'back', 'side'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCtx(c)}
                    className={`btn flex-1 ${ctx === c ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {t(`sets.ctx${c.charAt(0).toUpperCase() + c.slice(1)}`, c)}
                  </button>
                ))}
              </div>
            </div>

            {sets.length > 0 ? (
              <div>
                <label className="label">{t('sets.chooseSet', 'Choose a set')}</label>
                <select
                  className="input"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value="">{t('sets.newSetOption', '— create new set —')}</option>
                  {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            ) : null}

            {(!selectedId) && (
              <div>
                <label className="label">{t('sets.newSetName', 'New set name')}</label>
                <input
                  className="input"
                  placeholder={t('sets.namePlaceholder', 'e.g. Lavender Oatmeal Bar')}
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                />
              </div>
            )}

            <button
              className="btn-primary w-full"
              disabled={saving || creating || (!selectedId && !newSetName.trim())}
              onClick={() => void save()}
            >
              {saving || creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              {t('sets.saveBtn', 'Save design')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
