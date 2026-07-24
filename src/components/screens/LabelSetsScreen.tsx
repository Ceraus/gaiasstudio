/**
 * LabelSetsScreen — Group front, back, and side labels into named sets.
 *
 * Workflow:
 *   1. Create a named set (+ optional recipe link).
 *   2. In the editor, use "Save to Set" to write the current design into
 *      the front / back / side slot of a chosen set.
 *   3. Here, tap any slot thumbnail to load that design back into the editor.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { LabelSet, Recipe } from '@/types';
import { setsRepo, recipesRepo } from '@/db/repositories';
import { useAppStore } from '@/store/useAppStore';
import averyData from '@/data/averyTemplates.json';
import type { AveryDataset } from '@/types';
import Modal from '@/components/common/Modal';

const templates = (averyData as AveryDataset).templates;

export default function LabelSetsScreen() {
  const { t } = useTranslation();
  const setDesignJson = useAppStore((s) => s.setDesignJson);
  const startNewDesign = useAppStore((s) => s.startNewDesign);

  const [sets, setSets] = useState<LabelSet[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [newName, setNewName] = useState('');
  const [newRecipeId, setNewRecipeId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const reload = async () => {
    const [s, r] = await Promise.all([setsRepo.all(), recipesRepo.all()]);
    setSets(s);
    setRecipes(r);
  };

  useEffect(() => { void reload(); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await setsRepo.create(newName.trim(), newRecipeId || undefined);
    setNewName('');
    setNewRecipeId('');
    setFormOpen(false);
    setCreating(false);
    void reload();
  };

  const remove = (id: string) => setConfirmDeleteId(id);

  const doRemove = async (id: string) => {
    setConfirmDeleteId(null);
    await setsRepo.remove(id);
    void reload();
  };

  const openSlot = (set: LabelSet, ctx: 'front' | 'back' | 'side') => {
    const json = ctx === 'front' ? set.frontJson : ctx === 'back' ? set.backJson : set.sideJson;
    const tplId = ctx === 'front' ? set.frontTemplateId : ctx === 'back' ? set.backTemplateId : set.sideTemplateId;
    const tpl = templates.find((t) => t.id === tplId);
    if (!json || !tpl) {
      alert(t('sets.slotEmpty', 'No design saved here yet. Open the editor and use "Save to Set" to add one.'));
      return;
    }
    // startNewDesign navigates to 'editor' and resets designJson to null.
    // setDesignJson must be called AFTER so the canvas restores the saved design.
    // The redundant goto('editor') was also setting previousScreen:'editor' (wrong).
    startNewDesign(tpl, ctx);
    setDesignJson(json);
  };

  return (
    <div className="h-full overflow-y-auto bg-gaia-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gaia-900">{t('sets.title', 'Label Sets')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {t('sets.subtitle', 'Group front, back, and side designs for each product into one named set so you never lose track of them.')}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setFormOpen((o) => !o)}
          >
            <Plus className="h-4 w-4" /> {t('sets.new', 'New Set')}
          </button>
        </div>

        {/* Create form */}
        {formOpen && (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-slate-800">{t('sets.createTitle', 'New label set')}</p>
              <button className="icon-btn" onClick={() => setFormOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t('sets.name', 'Set name')}</label>
                <input
                  className="input"
                  placeholder={t('sets.namePlaceholder', 'e.g. Lavender Oatmeal Bar')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void create()}
                />
              </div>
              <div>
                <label className="label">{t('sets.recipe', 'Linked recipe')} <span className="font-normal text-slate-400">({t('common.optional')})</span></label>
                <select
                  className="input"
                  value={newRecipeId}
                  onChange={(e) => setNewRecipeId(e.target.value)}
                >
                  <option value="">{t('common.none')}</option>
                  {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="btn-primary"
                disabled={!newName.trim() || creating}
                onClick={() => void create()}
              >
                <Plus className="h-4 w-4" /> {t('common.save')}
              </button>
              <button className="btn-secondary" onClick={() => setFormOpen(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}

        {/* Sets grid */}
        {sets.length === 0 ? (
          <div className="mt-12 rounded-2xl border-2 border-dashed border-gaia-200 bg-white p-12 text-center">
            <Layers className="mx-auto h-10 w-10 text-gaia-300" />
            <p className="mt-3 font-medium text-slate-500">{t('sets.empty', 'No label sets yet.')}</p>
            <p className="mt-1 text-sm text-slate-400">
              {t('sets.emptyHint', 'Create a set, then save your front, back, and side designs into it from the editor.')}
            </p>
            <button className="btn-primary mt-5" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> {t('sets.new', 'New Set')}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {sets.map((set) => (
              <SetCard
                key={set.id}
                set={set}
                recipe={recipes.find((r) => r.id === set.recipeId)}
                onOpen={openSlot}
                onDelete={() => void remove(set.id)}
                t={t}
              />
            ))}
          </div>
        )}

        {/* How-to hint */}
        <div className="mt-8 rounded-xl bg-gaia-50 px-4 py-3 text-xs text-slate-500 ring-1 ring-gaia-100">
          <p className="font-semibold text-gaia-700 mb-1">{t('sets.howToTitle', 'How to save a design to a set')}</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>{t('sets.howTo1', 'Design your front / back / side label in the editor.')}</li>
            <li>{t('sets.howTo2', 'In the editor header, click the Layers icon → "Save to Set".')}</li>
            <li>{t('sets.howTo3', 'Choose this set and the correct context (Front, Back, or Side).')}</li>
            <li>{t('sets.howTo4', 'The design is saved here. Click any slot thumbnail to reopen it.')}</li>
          </ol>
        </div>
      </div>

      <Modal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        width={360}
        title={
          <span className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {t('common.confirmDeleteTitle')}
          </span>
        }
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>
              {t('common.cancel')}
            </button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              onClick={() => { if (confirmDeleteId) void doRemove(confirmDeleteId); }}
            >
              {t('common.delete')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">{t('common.confirmDeleteBody')}</p>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Set card
// ---------------------------------------------------------------------------
function SetCard({
  set,
  recipe,
  onOpen,
  onDelete,
  t,
}: {
  set: LabelSet;
  recipe: Recipe | undefined;
  onOpen: (set: LabelSet, ctx: 'front' | 'back' | 'side') => void;
  onDelete: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const [expanded, setExpanded] = useState(true);

  const contexts: { ctx: 'front' | 'back' | 'side'; label: string; thumb?: string; json?: string }[] = [
    { ctx: 'front', label: t('sets.ctxFront', 'Front'), thumb: set.frontThumb, json: set.frontJson },
    { ctx: 'back',  label: t('sets.ctxBack',  'Back'),  thumb: set.backThumb,  json: set.backJson  },
    { ctx: 'side',  label: t('sets.ctxSide',  'Side'),  thumb: set.sideThumb,  json: set.sideJson  },
  ];

  const filledCount = useMemo(() => contexts.filter((c) => c.json).length, [set]);

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gaia-100 text-gaia-700">
          <Layers className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-800">{set.name}</p>
          <p className="text-xs text-slate-500">
            {recipe ? (
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{recipe.name}</span>
            ) : (
              <span className="text-slate-400">{t('sets.noRecipe', 'No recipe linked')}</span>
            )}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
          filledCount === 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {filledCount}/3 {t('sets.slots', 'slots')}
        </span>
        <button
          className="icon-btn text-slate-400 hover:text-rose-500"
          title={t('common.delete')}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          className="icon-btn text-slate-400"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded
            ? <ChevronUp className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Slots */}
      {expanded && (
        <div className="grid grid-cols-3 gap-px bg-slate-100 border-t border-slate-100">
          {contexts.map(({ ctx, label, thumb, json }) => (
            <button
              key={ctx}
              className="flex flex-col items-center gap-2 bg-white px-4 py-4 text-center transition hover:bg-gaia-50 group"
              onClick={() => onOpen(set, ctx)}
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt={label}
                  className="h-24 w-full rounded-lg object-contain ring-1 ring-slate-200 group-hover:ring-gaia-400 transition"
                />
              ) : (
                <div className="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-slate-300 group-hover:border-gaia-300 transition">
                  <Plus className="h-6 w-6" />
                </div>
              )}
              <span className="text-xs font-semibold text-slate-600">{label}</span>
              {json ? (
                <span className="flex items-center gap-1 text-[10px] text-gaia-600">
                  <ArrowRight className="h-3 w-3" /> {t('sets.open', 'Open in editor')}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">{t('sets.empty', 'Empty — design not saved yet')}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
