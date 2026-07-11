/**
 * BlueprintHubPage — full spatial plan workspace.
 *
 * ARCHITECTURE RULE: strictly decoupled from the global Redux store.
 * All canvas state lives in `useBlueprintStore` (Zustand). No
 * `useAppDispatch` / `useAppSelector` calls exist in this file or its
 * child components.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Top bar: plan info + upload + clear                          │
 *   ├────────────────────────────────────────────────────────────  │
 *   │ Horizontal toolbar: tool buttons + active tier selector      │
 *   ├──────────┬──────────────────────────────────┬───────────────┤
 *   │ Staging  │                                  │  Property     │
 *   │ Queue    │        Leaflet canvas            │  Panel        │
 *   │  (left)  │       (CRS.Simple)               │  (right)      │
 *   └──────────┴──────────────────────────────────┴───────────────┘
 */

import { useCallback, useRef } from 'react'
import L from 'leaflet'
import {
  DollarSign, GripVertical, Map, MousePointer, Pencil,
  Ruler, Shapes, Square, Trash2, Upload, WifiOff, X,
} from 'lucide-react'
import {
  useBlueprintStore,
  ALL_TIERS,
  BLUEPRINT_TIER_COLORS,
  BLUEPRINT_TIER_LABELS,
  type BlueprintPin,
  type BlueprintTier,
  type BlueprintTool,
  type StagedPin,
} from './useBlueprintStore'
import { BlueprintCanvas } from './BlueprintCanvas'

// ── Toolbar config ────────────────────────────────────────────────────────────

const TOOLS: {
  id:   BlueprintTool
  Icon: typeof MousePointer
  label: string
  hint:  string
}[] = [
  { id: 'select',    Icon: MousePointer, label: 'Select',    hint: 'Click to select pins or zones'            },
  { id: 'pin',       Icon: Pencil,       label: 'Pin',       hint: 'Click canvas to drop taxonomy pin'        },
  { id: 'polygon',   Icon: Shapes,       label: 'Polygon',   hint: 'Click vertices, double-click to close'    },
  { id: 'rectangle', Icon: Square,       label: 'Rectangle', hint: 'Click & drag a bounding rectangle'        },
  { id: 'polyline',  Icon: Ruler,        label: 'Measure',   hint: 'Click points, double-click to finish'     },
]

// ── Horizontal toolbar ────────────────────────────────────────────────────────

function Toolbar() {
  const { activeTool, activeTier, setActiveTool, setActiveTier, clearDraft } = useBlueprintStore()

  function switchTool(tool: BlueprintTool) {
    clearDraft()
    setActiveTool(tool)
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-3 py-2">
      {/* Tool buttons */}
      {TOOLS.map(({ id, Icon, label, hint }) => {
        const active = activeTool === id
        return (
          <button
            key={id}
            type="button"
            title={hint}
            aria-pressed={active}
            onClick={() => switchTool(id)}
            className={[
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all',
              active
                ? 'bg-[#166eb4] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-[#166eb4]/40 hover:bg-slate-50 hover:text-[#166eb4]',
            ].join(' ')}
          >
            <Icon size={13} aria-hidden />
            {label}
          </button>
        )
      })}

      {/* Divider */}
      <div className="mx-1 h-6 w-px bg-slate-200" aria-hidden />

      {/* Tier selector — shown always so operator can pick before placing a pin */}
      <div className="flex items-center gap-1">
        {ALL_TIERS.map((tier) => {
          const active = activeTier === tier
          const color  = BLUEPRINT_TIER_COLORS[tier]
          return (
            <button
              key={tier}
              type="button"
              title={BLUEPRINT_TIER_LABELS[tier]}
              aria-pressed={active}
              onClick={() => setActiveTier(tier)}
              className={[
                'flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all',
                active
                  ? 'text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
              ].join(' ')}
              style={active ? { backgroundColor: color, borderColor: color } : {}}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: active ? 'rgba(255,255,255,0.7)' : color }}
                aria-hidden
              />
              {BLUEPRINT_TIER_LABELS[tier].replace('SLA ', '')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Staging queue panel ───────────────────────────────────────────────────────

function StagingQueuePanel({ onAddToQueue }: { onAddToQueue: (tier: BlueprintTier) => void }) {
  const {
    stagingQueue, unstagePin, activeTool, setActiveTool,
    activeTier, setActiveTier,
  } = useBlueprintStore()

  // ── HTML drag-and-drop: item carries the staged pin ID ──
  function onDragStart(e: React.DragEvent, stagedId: string) {
    e.dataTransfer.setData('text/plain', stagedId)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="flex w-44 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-3 py-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Staging Queue
        </p>
      </div>

      {/* Quick-add buttons per tier */}
      <div className="space-y-1 border-b border-slate-100 p-2">
        {ALL_TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => onAddToQueue(tier)}
            title={`Queue a ${BLUEPRINT_TIER_LABELS[tier]} pin`}
            className="flex w-full items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-bold text-slate-600 transition hover:border-[#166eb4]/30 hover:bg-white"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: BLUEPRINT_TIER_COLORS[tier] }}
              aria-hidden
            />
            <span className="truncate">{BLUEPRINT_TIER_LABELS[tier]}</span>
          </button>
        ))}
      </div>

      {/* Queued items — draggable onto canvas */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
        {stagingQueue.length === 0 ? (
          <p className="text-center text-[10px] text-slate-400 pt-4">
            Queue empty.
            <br />Add tiers above.
          </p>
        ) : (
          stagingQueue.map((item: StagedPin) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => onDragStart(e, item.id)}
              className="flex cursor-grab items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm active:cursor-grabbing"
              title="Drag onto the blueprint to place"
            >
              <GripVertical size={11} className="shrink-0 text-slate-300" aria-hidden />
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: BLUEPRINT_TIER_COLORS[item.tier] }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-slate-700">
                {item.label}
              </span>
              <button
                type="button"
                aria-label="Remove from queue"
                onClick={() => unstagePin(item.id)}
                className="shrink-0 text-slate-400 hover:text-red-500"
              >
                <X size={10} aria-hidden />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Instruction */}
      {stagingQueue.length > 0 && (
        <p className="border-t border-slate-100 px-2 py-1.5 text-center text-[9px] text-slate-400">
          Drag to map or switch to Pin tool
        </p>
      )}
    </div>
  )
}

// ── Property panel (right) ────────────────────────────────────────────────────

function PropertyPanel() {
  const {
    pins, zones,
    selectedPinId, selectedZoneId,
    updatePin, removePin, selectPin,
    removeZone, updateZoneLabel, selectZone,
  } = useBlueprintStore()

  const selectedPin  = pins.find((p) => p.id === selectedPinId)
  const selectedZone = zones.find((z) => z.id === selectedZoneId)

  if (!selectedPin && !selectedZone) {
    return (
      <div className="flex w-52 shrink-0 flex-col items-center justify-center gap-2 border-l border-slate-200 bg-white px-4 py-8 text-center">
        <MousePointer size={24} className="text-slate-200" strokeWidth={1.5} aria-hidden />
        <p className="text-xs font-semibold text-slate-400">Nothing selected</p>
        <p className="text-[10px] text-slate-400">
          Click a pin or zone to view its properties.
        </p>
      </div>
    )
  }

  // ── Pin properties ────────────────────────────────────────────────────────

  if (selectedPin) {
    const color = BLUEPRINT_TIER_COLORS[selectedPin.tier]
    return (
      <div className="flex w-52 shrink-0 flex-col gap-3 border-l border-slate-200 bg-white p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: color }}
            >
              {BLUEPRINT_TIER_LABELS[selectedPin.tier]}
            </span>
            <p className="mt-1 truncate text-sm font-bold text-slate-800">{selectedPin.label}</p>
          </div>
          <button
            type="button"
            aria-label="Deselect"
            onClick={() => selectPin(null)}
            className="shrink-0 text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        </div>

        {/* Coordinates */}
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 font-mono text-[10px] text-slate-500 space-y-0.5">
          <p>y: {Math.round(selectedPin.lat)}</p>
          <p>x: {Math.round(selectedPin.lng)}</p>
        </div>

        {/* Label */}
        <div className="space-y-1">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Label
          </label>
          <input
            value={selectedPin.label}
            onChange={(e) => updatePin(selectedPin.id, { label: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#166eb4]/50 focus:ring-1 focus:ring-[#166eb4]/20"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Notes
          </label>
          <textarea
            rows={3}
            value={selectedPin.notes}
            onChange={(e) => updatePin(selectedPin.id, { notes: e.target.value })}
            placeholder="Site notes…"
            className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#166eb4]/50 focus:ring-1 focus:ring-[#166eb4]/20 placeholder:text-slate-300"
          />
        </div>

        {/* Total Investment */}
        <div className="space-y-1">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Total Investment
          </label>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5">
            <DollarSign size={11} className="shrink-0 text-slate-400" aria-hidden />
            <input
              type="number"
              min={0}
              step={100}
              value={selectedPin.totalInvestment ?? ''}
              onChange={(e) =>
                updatePin(selectedPin.id, {
                  totalInvestment: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="0"
              className="w-full min-w-0 border-none bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Tier re-assignment */}
        <div className="space-y-1">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Change Tier
          </label>
          <select
            value={selectedPin.tier}
            onChange={(e) => updatePin(selectedPin.id, { tier: e.target.value as BlueprintTier })}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-[#166eb4]/50"
          >
            {ALL_TIERS.map((t) => (
              <option key={t} value={t}>{BLUEPRINT_TIER_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={() => removePin(selectedPin.id)}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-red-50 py-2 text-xs font-semibold text-red-500 hover:bg-red-100"
        >
          <Trash2 size={12} aria-hidden />
          Remove Pin
        </button>
      </div>
    )
  }

  // ── Zone properties ────────────────────────────────────────────────────────

  if (selectedZone) {
    const typeLabel = selectedZone.type === 'polyline'
      ? 'Measurement'
      : selectedZone.type === 'rectangle' ? 'Rectangle' : 'Polygon'

    return (
      <div className="flex w-52 shrink-0 flex-col gap-3 border-l border-slate-200 bg-white p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: selectedZone.color }}
            >
              {typeLabel}
            </span>
            {selectedZone.tier && (
              <p className="mt-0.5 text-[10px] text-slate-400">
                {BLUEPRINT_TIER_LABELS[selectedZone.tier]}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Deselect"
            onClick={() => selectZone(null)}
            className="shrink-0 text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        </div>

        {/* Measurement summary */}
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 space-y-1">
          {selectedZone.measureLength !== null && (
            <div className="flex items-center justify-between text-[10px] text-slate-600">
              <span className="font-semibold">Perimeter</span>
              <span className="font-mono">{selectedZone.measureLength} px</span>
            </div>
          )}
          {selectedZone.measureArea !== null && (
            <div className="flex items-center justify-between text-[10px] text-slate-600">
              <span className="font-semibold">Area</span>
              <span className="font-mono">{selectedZone.measureArea} px²</span>
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Vertices</span>
            <span className="font-mono">{selectedZone.points.length}</span>
          </div>
        </div>

        {/* Label */}
        <div className="space-y-1">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Label
          </label>
          <input
            value={selectedZone.label}
            onChange={(e) => updateZoneLabel(selectedZone.id, e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#166eb4]/50 focus:ring-1 focus:ring-[#166eb4]/20"
          />
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={() => removeZone(selectedZone.id)}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-red-50 py-2 text-xs font-semibold text-red-500 hover:bg-red-100"
        >
          <Trash2 size={12} aria-hidden />
          Remove Zone
        </button>
      </div>
    )
  }

  return null
}

// ── Plan uploader ─────────────────────────────────────────────────────────────

function PlanUploader() {
  const { setPlanImage } = useBlueprintStore()

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const url = e.target?.result as string
      const img = new Image()
      img.onload = () => setPlanImage(url, img.naturalWidth, img.naturalHeight)
      img.src = url
    }
    reader.readAsDataURL(file)
  }, [setPlanImage])

  return (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#166eb4]/40 hover:text-[#166eb4]">
      <Upload size={13} aria-hidden />
      Upload Plan
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </label>
  )
}

// ── Drop-zone wrapper (receives dragged staged pins) ──────────────────────────

function CanvasDropZone({
  children,
  containerRef,
}: {
  children: React.ReactNode
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const { stagingQueue, promoteStagedPin } = useBlueprintStore()

  function onDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const stagedId = e.dataTransfer.getData('text/plain')
    if (!stagedId || !stagingQueue.find((i) => i.id === stagedId)) return

    // Convert screen coordinates to CRS.Simple pixel coordinates
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const relX  = e.clientX - rect.left
    const relY  = e.clientY - rect.top
    // Map visual position to canvas coordinates (approximate)
    const canvas = containerRef.current?.querySelector('canvas, .leaflet-container') as HTMLElement | null
    if (!canvas) return

    const canvasRect = canvas.getBoundingClientRect()
    const cx = e.clientX - canvasRect.left
    const cy = e.clientY - canvasRect.top

    // Use the Leaflet map instance to convert pixel offset to latlng
    const mapEl = canvas.closest('.leaflet-container') as HTMLElement & {
      _leaflet_map?: L.Map
    }
    let coord = { lat: cy, lng: cx }
    if (mapEl?._leaflet_map) {
      const ll = mapEl._leaflet_map.containerPointToLatLng([cx, cy])
      coord = { lat: ll.lat, lng: ll.lng }
    }

    promoteStagedPin(stagedId, coord)
  }

  return (
    <div className="flex min-h-0 flex-1" onDragOver={onDragOver} onDrop={onDrop}>
      {children}
    </div>
  )
}


// ── Main page ─────────────────────────────────────────────────────────────────

export function BlueprintHubPage() {
  const { pins, zones, clearAll, planImageUrl, stagePin } = useBlueprintStore()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine

  function handleAddToQueue(tier: BlueprintTier) {
    stagePin({ tier, label: BLUEPRINT_TIER_LABELS[tier] })
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100dvh - 5rem)' }}
    >
      {/* ── Top bar ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <Map size={17} className="text-[#166eb4]" aria-hidden />
          <span className="text-sm font-bold text-slate-800">Blueprint Hub</span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {pins.length} pin{pins.length !== 1 ? 's' : ''} · {zones.length} zone{zones.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
              <WifiOff size={11} aria-hidden />
              Offline
            </span>
          )}
          <PlanUploader />
          {(pins.length > 0 || zones.length > 0) && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-lg border border-red-200/60 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50"
            >
              <Trash2 size={12} aria-hidden />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <Toolbar />

      {/* ── Three-column work area ── */}
      <div className="flex min-h-0 flex-1">
        {/* Left: staging queue */}
        <StagingQueuePanel onAddToQueue={handleAddToQueue} />

        {/* Centre: Leaflet canvas with drag-drop receiver */}
        <CanvasDropZone containerRef={containerRef}>
          <div className="relative min-h-0 flex-1">
            <BlueprintCanvas containerRef={containerRef} className="h-full w-full" />

            {/* Empty-state overlay (no plan loaded) */}
            {!planImageUrl && (
              <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-8 py-6 text-center backdrop-blur">
                  <Map size={30} className="mx-auto text-slate-500" strokeWidth={1.5} aria-hidden />
                  <p className="mt-2 text-sm font-bold text-slate-300">No floor plan loaded</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Use <span className="font-semibold text-slate-400">Upload Plan</span> in the top bar
                  </p>
                </div>
              </div>
            )}
          </div>
        </CanvasDropZone>

        {/* Right: property panel */}
        <PropertyPanel />
      </div>
    </div>
  )
}
