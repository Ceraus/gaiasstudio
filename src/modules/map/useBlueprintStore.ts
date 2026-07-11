/**
 * useBlueprintStore — isolated Zustand state conductor for the Blueprint Hub.
 *
 * ARCHITECTURE RULE: This store MUST NOT import from @/store/* (Redux).
 * The Blueprint Hub is fully decoupled from the global Redux tree so that
 * complex canvas draw operations never trigger global re-renders.
 *
 * Math layer: Euclidean distance and Shoelace area formulas in pixel space
 * (CRS.Simple coordinates). Turf.js is imported for polygon operations;
 * note that in CRS.Simple all "units" are pixels, not meters.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import area from '@turf/area'
import length from '@turf/length'
import { polygon as turfPolygon, lineString as turfLineString } from '@turf/helpers'
import { apiClient } from '@/core/api'

// ── 5-tier taxonomy ───────────────────────────────────────────────────────────

export type BlueprintTier =
  | 'SIMPLE_1'
  | 'SIMPLE_2'
  | 'SLA_HELPDESK'
  | 'SLA_MONTHLY_NETWORK'
  | 'SLA_ACCESS_CONTROL'

export const BLUEPRINT_TIER_LABELS: Record<BlueprintTier, string> = {
  SIMPLE_1:            'Simple-1',
  SIMPLE_2:            'Simple-2',
  SLA_HELPDESK:        'SLA Helpdesk',
  SLA_MONTHLY_NETWORK: 'SLA Monthly Network',
  SLA_ACCESS_CONTROL:  'SLA Access Control',
}

export const BLUEPRINT_TIER_COLORS: Record<BlueprintTier, string> = {
  SIMPLE_1:            '#7c3aed',
  SIMPLE_2:            '#4f46e5',
  SLA_HELPDESK:        '#166eb4',
  SLA_MONTHLY_NETWORK: '#0891b2',
  SLA_ACCESS_CONTROL:  '#f59e0b',
}

export const ALL_TIERS: BlueprintTier[] = [
  'SIMPLE_1',
  'SIMPLE_2',
  'SLA_HELPDESK',
  'SLA_MONTHLY_NETWORK',
  'SLA_ACCESS_CONTROL',
]

// ── Tool enumeration ──────────────────────────────────────────────────────────

export type BlueprintTool =
  | 'select'
  | 'pin'
  | 'polygon'
  | 'rectangle'
  | 'polyline'

// ── Coordinate type ───────────────────────────────────────────────────────────

export interface BlueprintCoord {
  lat: number   // CRS.Simple y-pixel
  lng: number   // CRS.Simple x-pixel
}

// ── Entity types ──────────────────────────────────────────────────────────────

export interface BlueprintPin {
  id: string
  lat: number
  lng: number
  tier: BlueprintTier
  label: string
  notes: string
  /** Optional financial summary shown in property panel (Total Investment). */
  totalInvestment?: number
  createdAt: string
}

export type ZoneType = 'polygon' | 'rectangle' | 'polyline'

export interface BlueprintZone {
  id: string
  type: ZoneType
  points: BlueprintCoord[]
  closed: boolean
  /** Pixel-space area (px²) for closed shapes — Shoelace formula. */
  measureArea:   number | null
  /** Pixel-space perimeter / length (px) for all shapes — Euclidean sum. */
  measureLength: number | null
  label: string
  color: string
  tier?: BlueprintTier
  createdAt: string
}

/** Pre-placement item held in the drag-and-drop staging queue. */
export interface StagedPin {
  id: string
  tier: BlueprintTier
  label: string
}

/** Context menu target shown on right-click. */
export interface ContextMenuState {
  screenX: number
  screenY: number
  targetId: string
  targetType: 'pin' | 'zone'
}

// ── Pixel-space math ──────────────────────────────────────────────────────────

/** Shoelace polygon area in pixel² (CRS.Simple). */
export function shoelaceArea(points: BlueprintCoord[]): number {
  if (points.length < 3) return 0
  let sum = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    sum += points[i]!.lng * points[j]!.lat
    sum -= points[j]!.lng * points[i]!.lat
  }
  return Math.round(Math.abs(sum) / 2)
}

/** Euclidean polyline length in pixels (CRS.Simple). */
export function euclideanLength(points: BlueprintCoord[]): number {
  if (points.length < 2) return 0
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i]!.lng - points[i - 1]!.lng
    const dy = points[i]!.lat - points[i - 1]!.lat
    total += Math.sqrt(dx * dx + dy * dy)
  }
  return Math.round(total * 10) / 10
}

/**
 * Turf.js area of a closed polygon (in "square-degree-equivalents" when
 * coordinates are pixel-based). For display purposes in CRS.Simple, prefer
 * `shoelaceArea` which stays in pixel² without unit confusion. This function
 * is available for callers that need GeoJSON polygon-compatible calculations.
 */
export function turfPolygonArea(points: BlueprintCoord[]): number {
  if (points.length < 3) return 0
  try {
    const ring = points.map((p) => [p.lng, p.lat] as [number, number])
    ring.push(ring[0]!)
    return Math.round(area(turfPolygon([ring])))
  } catch {
    return shoelaceArea(points)
  }
}

/**
 * Turf.js lineString length. In CRS.Simple pixel-coordinates the result is
 * effectively "pixel-km" — use `euclideanLength` for display. Available for
 * callers that need Turf GeoJSON compatibility.
 */
export function turfLineLength(points: BlueprintCoord[]): number {
  if (points.length < 2) return 0
  try {
    const coords = points.map((p) => [p.lng, p.lat] as [number, number])
    return Math.round(length(turfLineString(coords), { units: 'kilometers' }) * 100) / 100
  } catch {
    return euclideanLength(points)
  }
}

// ── Store interface ───────────────────────────────────────────────────────────

interface BlueprintState {
  // Plan surface
  planImageUrl:  string | null
  planBounds:    [[number, number], [number, number]]

  // Active tool + tier
  activeTool:  BlueprintTool
  activeTier:  BlueprintTier

  // In-progress drawing state
  draftPoints: BlueprintCoord[]
  /** Rectangle draw: starting corner captured on mousedown. */
  rectDraftStart: BlueprintCoord | null

  // Persisted entities (session-local, no backend trace)
  pins:           BlueprintPin[]
  zones:          BlueprintZone[]
  selectedPinId:  string | null
  selectedZoneId: string | null

  // Staging queue
  stagingQueue: StagedPin[]

  // Context menu
  contextMenu: ContextMenuState | null

  // ── Actions ────────────────────────────────────────────────────────────────

  setPlanImage(url: string, widthPx?: number, heightPx?: number): void

  setActiveTool(tool: BlueprintTool): void
  setActiveTier(tier: BlueprintTier): void

  pushDraftPoint(coord: BlueprintCoord): void
  commitPolygon(): void
  commitPolyline(): void
  commitRectangle(corners: BlueprintCoord[]): void
  clearDraft(): void

  setRectDraftStart(coord: BlueprintCoord | null): void

  addPin(pin: Omit<BlueprintPin, 'id' | 'createdAt'>): void
  updatePin(id: string, patch: Partial<Omit<BlueprintPin, 'id'>>): void
  removePin(id: string): void
  selectPin(id: string | null): void

  removeZone(id: string): void
  selectZone(id: string | null): void
  updateZoneLabel(id: string, label: string): void

  stagePin(item: Omit<StagedPin, 'id'>): void
  unstagePin(id: string): void
  promoteStagedPin(stagedId: string, coord: BlueprintCoord): void

  openContextMenu(state: ContextMenuState): void
  closeContextMenu(): void

  hydrate(pins: BlueprintPin[], zones: BlueprintZone[]): void
  clearAll(): void

  /** Persist spatial coordinates, taxonomy pins, and drawn geometry to Global-API. */
  brokerBlueprintSave(planId: string): Promise<void>
  /** Load persisted blueprint hub state from Global-API. */
  brokerBlueprintLoad(planId: string): Promise<void>
}

// ── ID factory ────────────────────────────────────────────────────────────────

function uid(): string {
  return `bp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBlueprintStore = create<BlueprintState>()(
  subscribeWithSelector((set, get) => ({
    planImageUrl:   null,
    planBounds:     [[0, 0], [1000, 1000]],
    activeTool:     'select',
    activeTier:     'SIMPLE_1',
    draftPoints:    [],
    rectDraftStart: null,
    pins:           [],
    zones:          [],
    selectedPinId:  null,
    selectedZoneId: null,
    stagingQueue:   [],
    contextMenu:    null,

    // ── Plan surface ─────────────────────────────────────────────────────────

    setPlanImage(url, widthPx = 1000, heightPx = 1000) {
      set({
        planImageUrl:   url,
        planBounds:     [[0, 0], [heightPx, widthPx]],
        draftPoints:    [],
        rectDraftStart: null,
        selectedPinId:  null,
        selectedZoneId: null,
        contextMenu:    null,
      })
    },

    // ── Tool ─────────────────────────────────────────────────────────────────

    setActiveTool(tool) {
      set({
        activeTool:     tool,
        draftPoints:    [],
        rectDraftStart: null,
        selectedPinId:  null,
        selectedZoneId: null,
        contextMenu:    null,
      })
    },

    setActiveTier(tier) { set({ activeTier: tier }) },

    // ── Draft ─────────────────────────────────────────────────────────────────

    pushDraftPoint(coord) {
      set((s) => ({ draftPoints: [...s.draftPoints, coord] }))
    },

    commitPolygon() {
      const { draftPoints, activeTier } = get()
      if (draftPoints.length < 3) { set({ draftPoints: [] }); return }
      const area   = shoelaceArea(draftPoints)
      const perim  = euclideanLength([...draftPoints, draftPoints[0]!])
      const zone: BlueprintZone = {
        id:            uid(),
        type:          'polygon',
        points:        draftPoints,
        closed:        true,
        measureArea:   area,
        measureLength: perim,
        label:         `Zone ${area} px²`,
        color:         BLUEPRINT_TIER_COLORS[activeTier],
        tier:          activeTier,
        createdAt:     new Date().toISOString(),
      }
      set((s) => ({ zones: [...s.zones, zone], draftPoints: [] }))
    },

    commitPolyline() {
      const { draftPoints, activeTier } = get()
      if (draftPoints.length < 2) { set({ draftPoints: [] }); return }
      const dist = euclideanLength(draftPoints)
      const zone: BlueprintZone = {
        id:            uid(),
        type:          'polyline',
        points:        draftPoints,
        closed:        false,
        measureArea:   null,
        measureLength: dist,
        label:         `${dist} px`,
        color:         BLUEPRINT_TIER_COLORS[activeTier],
        tier:          activeTier,
        createdAt:     new Date().toISOString(),
      }
      set((s) => ({ zones: [...s.zones, zone], draftPoints: [] }))
    },

    commitRectangle(corners) {
      const { activeTier } = get()
      if (corners.length < 4) return
      const area   = shoelaceArea(corners)
      const perim  = euclideanLength([...corners, corners[0]!])
      const zone: BlueprintZone = {
        id:            uid(),
        type:          'rectangle',
        points:        corners,
        closed:        true,
        measureArea:   area,
        measureLength: perim,
        label:         `Rect ${area} px²`,
        color:         BLUEPRINT_TIER_COLORS[activeTier],
        tier:          activeTier,
        createdAt:     new Date().toISOString(),
      }
      set((s) => ({
        zones:          [...s.zones, zone],
        rectDraftStart: null,
      }))
    },

    clearDraft() { set({ draftPoints: [], rectDraftStart: null }) },

    setRectDraftStart(coord) { set({ rectDraftStart: coord }) },

    // ── Pins ─────────────────────────────────────────────────────────────────

    addPin(pin) {
      const newPin: BlueprintPin = { ...pin, id: uid(), createdAt: new Date().toISOString() }
      set((s) => ({ pins: [...s.pins, newPin], selectedPinId: newPin.id }))
    },

    updatePin(id, patch) {
      set((s) => ({ pins: s.pins.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
    },

    removePin(id) {
      set((s) => ({
        pins:          s.pins.filter((p) => p.id !== id),
        selectedPinId: s.selectedPinId === id ? null : s.selectedPinId,
        contextMenu:   null,
      }))
    },

    selectPin(id) {
      set({ selectedPinId: id, selectedZoneId: null, contextMenu: null })
    },

    // ── Zones ─────────────────────────────────────────────────────────────────

    removeZone(id) {
      set((s) => ({
        zones:          s.zones.filter((z) => z.id !== id),
        selectedZoneId: s.selectedZoneId === id ? null : s.selectedZoneId,
        contextMenu:    null,
      }))
    },

    selectZone(id) {
      set({ selectedZoneId: id, selectedPinId: null, contextMenu: null })
    },

    updateZoneLabel(id, label) {
      set((s) => ({ zones: s.zones.map((z) => (z.id === id ? { ...z, label } : z)) }))
    },

    // ── Staging queue ─────────────────────────────────────────────────────────

    stagePin(item) {
      set((s) => ({ stagingQueue: [...s.stagingQueue, { ...item, id: uid() }] }))
    },

    unstagePin(id) {
      set((s) => ({ stagingQueue: s.stagingQueue.filter((i) => i.id !== id) }))
    },

    promoteStagedPin(stagedId, coord) {
      const staged = get().stagingQueue.find((i) => i.id === stagedId)
      if (!staged) return
      const newPin: BlueprintPin = {
        id:        uid(),
        lat:       coord.lat,
        lng:       coord.lng,
        tier:      staged.tier,
        label:     staged.label,
        notes:     '',
        createdAt: new Date().toISOString(),
      }
      set((s) => ({
        pins:          [...s.pins, newPin],
        stagingQueue:  s.stagingQueue.filter((i) => i.id !== stagedId),
        selectedPinId: newPin.id,
      }))
    },

    // ── Context menu ──────────────────────────────────────────────────────────

    openContextMenu(state) { set({ contextMenu: state }) },
    closeContextMenu()     { set({ contextMenu: null  }) },

    // ── Hydration / reset ─────────────────────────────────────────────────────

    hydrate(pins, zones) { set({ pins, zones }) },

    clearAll() {
      set({
        pins:           [],
        zones:          [],
        draftPoints:    [],
        rectDraftStart: null,
        stagingQueue:   [],
        selectedPinId:  null,
        selectedZoneId: null,
        contextMenu:    null,
      })
    },

    async brokerBlueprintSave(planId) {
      const state = get()
      await apiClient.put(`/api/v1/blueprint/hub/${encodeURIComponent(planId)}`, {
        active_tier: state.activeTier,
        plan_image_url: state.planImageUrl,
        plan_bounds: state.planBounds,
        pins: state.pins,
        zones: state.zones,
      })
    },

    async brokerBlueprintLoad(planId) {
      const payload = await apiClient.get<{
        active_tier?: BlueprintTier
        plan_image_url?: string | null
        plan_bounds?: [[number, number], [number, number]]
        pins?: BlueprintPin[]
        zones?: BlueprintZone[]
      }>(`/api/v1/blueprint/hub/${encodeURIComponent(planId)}`)

      set({
        activeTier: payload.active_tier ?? get().activeTier,
        planImageUrl: payload.plan_image_url ?? get().planImageUrl,
        planBounds: payload.plan_bounds ?? get().planBounds,
        pins: payload.pins ?? [],
        zones: payload.zones ?? [],
        draftPoints: [],
        rectDraftStart: null,
        selectedPinId: null,
        selectedZoneId: null,
        contextMenu: null,
      })
    },
  })),
)
