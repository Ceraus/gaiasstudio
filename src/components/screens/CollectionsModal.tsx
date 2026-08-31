import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, FolderPlus, Trash2 } from 'lucide-react';
import type { Collection } from '@/types';
import { collectionsRepo } from '@/db/repositories';
import Modal from '@/components/common/Modal';
import {
  COLLECTION_PALETTE,
  nextPaletteColor,
  readableTextOn,
} from '@/data/collectionPalette';

interface Props {
  open: boolean;
  collections: Collection[];
  /** Number of designs filed under each collection, keyed by collection id. */
  counts: Record<string, number>;
  onClose: () => void;
  onChanged: () => void;
}

/**
 * Create, rename, recolour and delete product-line collections.
 *
 * Deleting only un-files the designs — a maker should never lose artwork by
 * tidying up her folders.
 */
export default function CollectionsModal({ open, collections, counts, onClose, onChanged }: Props) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!open) setNewName('');
  }, [open]);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    await collectionsRepo.create(name, nextPaletteColor(collections.map((c) => c.color)));
    setNewName('');
    onChanged();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={480}
      title={t('collections.manageTitle', 'Collections')}
      footer={
        <div className="flex justify-end">
          <button className="btn-primary" onClick={onClose}>{t('common.done', 'Done')}</button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-slate-500">
        {t('collections.manageHint', 'Group your labels into product lines. Each collection colours its cards so you can spot them instantly.')}
      </p>

      <div className="mb-4 flex gap-2">
        <input
          className="input"
          placeholder={t('collections.namePlaceholder', 'e.g. Oily Skin, Holiday Gifts')}
          aria-label={t('collections.newCollection', 'New Collection')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void create(); }}
        />
        <button className="btn-primary shrink-0" disabled={!newName.trim()} onClick={() => void create()}>
          <FolderPlus className="h-4 w-4" />
          {t('collections.add', 'Add')}
        </button>
      </div>

      {collections.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
          {t('collections.empty', 'No collections yet. Add one above.')}
        </p>
      ) : (
        <ul className="space-y-2">
          {collections.map((c) => (
            <CollectionRow
              key={c.id}
              collection={c}
              count={counts[c.id] ?? 0}
              onChanged={onChanged}
            />
          ))}
        </ul>
      )}
    </Modal>
  );
}

function CollectionRow({
  collection,
  count,
  onChanged,
}: {
  collection: Collection;
  count: number;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(collection.name);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setName(collection.name), [collection.name]);

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === collection.name) { setName(collection.name); return; }
    void collectionsRepo.update(collection.id, { name: trimmed }).then(onChanged);
  };

  return (
    <li className="rounded-xl border border-slate-200 p-2.5">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
          style={{ background: collection.color, color: readableTextOn(collection.color) }}
          aria-hidden="true"
        >
          {count}
        </span>
        <input
          className="input py-1.5 text-sm"
          aria-label={t('collections.renameCollection', 'Collection name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
        {confirming ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
              onClick={() => void collectionsRepo.remove(collection.id).then(onChanged)}
            >
              {t('common.delete')}
            </button>
            <button className="btn-secondary px-2.5 py-1.5 text-xs" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <button
            className="icon-btn h-8 w-8 shrink-0 text-rose-500 hover:bg-rose-50"
            title={t('collections.deleteHint', 'Delete collection (designs are kept)')}
            aria-label={t('collections.deleteHint', 'Delete collection (designs are kept)')}
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
        {COLLECTION_PALETTE.map((p) => {
          const active = p.hex.toLowerCase() === collection.color.toLowerCase();
          return (
            <button
              key={p.hex}
              title={p.label}
              aria-label={p.label}
              aria-pressed={active}
              onClick={() => void collectionsRepo.update(collection.id, { color: p.hex }).then(onChanged)}
              className={`flex h-6 w-6 items-center justify-center rounded-full ring-offset-1 transition ${
                active ? 'ring-2 ring-slate-700' : 'ring-1 ring-slate-200 hover:ring-slate-400'
              }`}
              style={{ background: p.hex }}
            >
              {active && <Check className="h-3.5 w-3.5" style={{ color: readableTextOn(p.hex) }} />}
            </button>
          );
        })}
      </div>
    </li>
  );
}
