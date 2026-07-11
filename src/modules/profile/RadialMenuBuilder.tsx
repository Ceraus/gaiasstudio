/**
 * RadialMenuBuilder — visual ring builder for the right-click radial quick-action menu.
 *
 * Ported from Pre-Redux `RadialMenuBuilder.tsx`, adapted to Redux patterns:
 *   - State read from `useAppSelector(s => s.preferences)` instead of Zustand.
 *   - Mutations dispatched via `patchPreferences` + `savePreferences` thunk.
 *   - Ring preview uses an SVG canvas with freeform pointer-drag repositioning,
 *     matching the Pre-Redux geometry (RING_RADIUS = 96, NODE_R = 24).
 *   - No i18n dependency — all labels are plain English from `radialCatalog.ts`.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { patchPreferences, savePreferences } from '@/store/preferencesSlice'
import {
  RADIAL_CATALOG,
  RADIAL_MAX_SLOTS,
  RADIAL_MIN_SLOTS,
  slotPosition,
} from '@/shared/utils/radialCatalog'

// ── Canvas geometry (mirrors Pre-Redux constants) ─────────────────────────────
const PREVIEW  = 260
const CENTER   = PREVIEW / 2
const RING_R   = 96   // guide circle radius
const NODE_R   = 24   // half-size of each slot node (48px)

// ── Ring action slot colour ───────────────────────────────────────────────────
const NODE_COLOR       = '#166eb4'
const NODE_COLOR_EMPTY = '#e2e8f0'

const DRAG_MIME = 'application/x-cvg-radial'

export function RadialMenuBuilder() {
  const dispatch = useAppDispatch()
  const selected  = useAppSelector((s) => s.preferences.radialActions)
  const storedCount = useAppSelector((s) => s.preferences.radialCount)

  const [pickedFromPalette, setPickedFromPalette] = useState<string | null>(null)
  const [dragOverSlot, setDragOverSlot]           = useState<number | null>(null)

  // Freeform repositioning (same as Pre-Redux).
  const [repositioning, setRepositioning] = useState<number | null>(null)
  const draftPositions = useRef<number[][]>([])
  const previewRef     = useRef<HTMLDivElement>(null)

  const storedPositions: number[][] = [] // Redux v1: positions stored in-memory only

  const usingDefaults = selected.length === 0
  const slotCount = storedCount > 0 ? storedCount : Math.max(RADIAL_MIN_SLOTS, selected.length || 6)

  const slots = useMemo<(string | null)[]>(
    () => Array.from({ length: slotCount }, (_, i) => selected[i] ?? null),
    [selected, slotCount],
  )

  function labelFor(id: string): string {
    return RADIAL_CATALOG.find((e) => e.id === id)?.label ?? id
  }

  function commit(next: (string | null)[], count?: number) {
    const ids = next.filter((v): v is string => Boolean(v))
    dispatch(patchPreferences({ radialActions: ids, ...(count !== undefined ? { radialCount: count } : {}) }))
    dispatch(savePreferences(  { radialActions: ids, ...(count !== undefined ? { radialCount: count } : {}) }))
  }

  function assignToSlot(slotIndex: number, id: string) {
    const next = [...slots]
    for (let i = 0; i < next.length; i++) if (next[i] === id) next[i] = null
    next[slotIndex] = id
    commit(next)
    setPickedFromPalette(null)
  }

  function swapSlots(from: number, to: number) {
    if (from === to) return
    const next = [...slots];
    [next[from], next[to]] = [next[to], next[from]]
    commit(next)
  }

  function clearSlot(slotIndex: number) {
    const next = [...slots]
    next[slotIndex] = null
    commit(next)
  }

  function changeCount(delta: number) {
    const next = Math.min(RADIAL_MAX_SLOTS, Math.max(RADIAL_MIN_SLOTS, slotCount + delta))
    if (next === slotCount) return
    commit(slots.slice(0, next), next)
  }

  function onSlotClick(slotIndex: number) {
    if (pickedFromPalette) assignToSlot(slotIndex, pickedFromPalette)
  }

  function onSlotDrop(slotIndex: number, e: React.DragEvent) {
    e.preventDefault()
    setDragOverSlot(null)
    const payload = e.dataTransfer.getData(DRAG_MIME)
    if (!payload) return
    if (payload.startsWith('palette:')) assignToSlot(slotIndex, payload.slice('palette:'.length))
    else if (payload.startsWith('slot:'))  swapSlots(Number(payload.slice('slot:'.length)), slotIndex)
  }

  // Freeform pointer drag (same logic as Pre-Redux; positions stay in local state for v1)
  const startRepositioning = useCallback((idx: number, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    draftPositions.current = []
    setRepositioning(idx);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPreviewPointerMove = useCallback((e: React.PointerEvent) => {
    if (repositioning === null || !previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const dx = (e.clientX - rect.left  - CENTER) / RING_R
    const dy = (e.clientY - rect.top   - CENTER) / RING_R
    const lim = (CENTER - NODE_R) / RING_R
    draftPositions.current[repositioning] = [
      Math.max(-lim, Math.min(lim, dx)),
      Math.max(-lim, Math.min(lim, dy)),
    ]
    setRepositioning((r) => r)
  }, [repositioning])

  const onPreviewPointerUp = useCallback(() => {
    setRepositioning(null)
  }, [])

  const livePositions = repositioning !== null ? draftPositions.current : storedPositions

  return (
    <div className="space-y-4">
      {/* ── Slot count controls ── */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-600">Slots</span>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => changeCount(-1)}
            disabled={slotCount <= RADIAL_MIN_SLOTS}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Remove one slot"
          >
            <Minus size={12} />
          </button>
          <span className="min-w-[1.75rem] text-center text-xs font-semibold tabular-nums text-slate-700">
            {slotCount}
          </span>
          <button
            type="button"
            onClick={() => changeCount(1)}
            disabled={slotCount >= RADIAL_MAX_SLOTS}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Add one slot"
          >
            <Plus size={12} />
          </button>
        </div>
        <span className="font-mono text-[10px] text-slate-400">{RADIAL_MIN_SLOTS}–{RADIAL_MAX_SLOTS}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* ── Ring preview (SVG canvas) ── */}
        <div
          ref={previewRef}
          className={`relative mx-auto shrink-0 select-none rounded-2xl border border-slate-200 bg-slate-50/80 ${repositioning !== null ? 'cursor-grabbing' : ''}`}
          style={{ width: PREVIEW, height: PREVIEW }}
          aria-label="Radial ring preview — drag nodes to reposition"
          onPointerMove={onPreviewPointerMove}
          onPointerUp={onPreviewPointerUp}
          onPointerLeave={onPreviewPointerUp}
        >
          {/* Guide ring */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={PREVIEW}
            height={PREVIEW}
          >
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RING_R}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </svg>

          {/* Center mark */}
          <div
            className="pointer-events-none absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#166eb4]/40 bg-slate-900 text-[10px] font-black tracking-widest text-white shadow-[0_0_14px_rgba(22,110,180,0.45)]"
            style={{ left: CENTER, top: CENTER }}
          >
            CVG
          </div>

          {/* Slot nodes */}
          {slots.map((id, i) => {
            const custom = livePositions[i]
            const pos = custom
              ? { x: CENTER + custom[0] * RING_R, y: CENTER + custom[1] * RING_R }
              : slotPosition(i, slotCount, RING_R, CENTER, CENTER)
            const Icon  = null
            const active     = dragOverSlot === i
            const isRepos    = repositioning === i
            const label      = id ? labelFor(id) : ''
            const initials   = label ? label.slice(0, 2).toUpperCase() : '+'

            return (
              <button
                key={i}
                type="button"
                onClick={() => id ? clearSlot(i) : onSlotClick(i)}
                draggable={Boolean(id)}
                onDragStart={(e) => id && e.dataTransfer.setData(DRAG_MIME, `slot:${i}`)}
                onDragOver={(e) => { e.preventDefault(); setDragOverSlot(i) }}
                onDragLeave={() => setDragOverSlot((c) => (c === i ? null : c))}
                onDrop={(e) => onSlotDrop(i, e)}
                onPointerDown={(e) => startRepositioning(i, e)}
                title={id ? `${label} — click to clear · drag to move` : 'Empty — click to fill · drag a chip here'}
                aria-label={id ? label : 'Empty slot'}
                className={`group absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border text-[10px] font-bold transition-colors active:cursor-grabbing ${
                  isRepos
                    ? 'z-10 scale-110 border-[#166eb4] bg-[#166eb4]/15 text-[#166eb4] shadow-lg'
                    : id
                      ? 'border-slate-300 bg-white text-slate-700 shadow-sm hover:border-red-400 hover:text-red-500'
                      : active || pickedFromPalette
                        ? 'border-[#166eb4] bg-[#166eb4]/10 text-[#166eb4]'
                        : 'border-dashed border-slate-300 text-slate-400 hover:border-[#166eb4]/60 hover:text-[#166eb4]'
                }`}
                style={{ left: pos.x, top: pos.y }}
              >
                <span>{initials}</span>
                {id ? (
                  <span className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex">
                    <X size={10} aria-hidden />
                  </span>
                ) : null}
              </button>
            )
          })}

          {/* Drag hint */}
          {repositioning !== null && (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
              <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-medium text-slate-200">
                Release to place
              </span>
            </div>
          )}
        </div>

        {/* ── Action palette ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-600">Action palette</p>
            <span className="font-mono text-[10px] text-slate-500">
              {usingDefaults ? 'defaults' : `${selected.length} / ${slotCount} filled`}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Drag a chip onto a slot, or tap a chip then tap a slot.{' '}
            <strong className="font-semibold text-slate-700">Drag a node in the preview to reposition it.</strong>
          </p>

          <div className="flex flex-wrap gap-1.5">
            {RADIAL_CATALOG.map((entry) => {
              const inUse  = selected.includes(entry.id)
              const picked = pickedFromPalette === entry.id
              return (
                <button
                  key={entry.id}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData(DRAG_MIME, `palette:${entry.id}`)}
                  onClick={() => setPickedFromPalette(picked ? null : entry.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    picked
                      ? 'border-[#166eb4] bg-[#166eb4] text-white'
                      : inUse
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-600'
                        : 'border-slate-300 text-slate-600 hover:border-[#166eb4]/60 hover:text-[#166eb4]'
                  }`}
                  title={inUse ? 'In use' : 'Add to ring'}
                >
                  {entry.label}
                </button>
              )
            })}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            {!usingDefaults && (
              <button
                type="button"
                onClick={() => { dispatch(patchPreferences({ radialActions: [], radialCount: 0 })); dispatch(savePreferences({ radialActions: [], radialCount: 0 })) }}
                className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-900 hover:underline"
              >
                <RotateCcw size={12} aria-hidden />
                Reset all
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
