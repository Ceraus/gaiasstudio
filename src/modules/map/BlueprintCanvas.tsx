/**
 * BlueprintCanvas — Leaflet CRS.Simple spatial canvas for the Blueprint Hub.
 *
 * Drawing modes:
 *   select    — click pins/zones to select; right-click opens context menu
 *   pin       — single click places a taxonomy-typed marker
 *   polygon   — click vertices, double-click closes and commits (area shown)
 *   rectangle — mousedown drag to corner, mouseup commits (area shown)
 *   polyline  — click points, double-click commits open path (length shown)
 *
 * All state is read from / written to `useBlueprintStore` (Zustand).
 * No Redux imports exist in this file.
 */

import { useEffect, useRef, useState } from 'react'
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Rectangle,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  useBlueprintStore,
  BLUEPRINT_TIER_COLORS,
  BLUEPRINT_TIER_LABELS,
  euclideanLength,
  shoelaceArea,
  type BlueprintPin,
  type BlueprintZone,
  type BlueprintCoord,
  type BlueprintTier,
} from './useBlueprintStore'

// ── Taxonomy-specific SVG DivIcon markers ─────────────────────────────────────
//
// Each tier has a distinct shape so operators can identify service coverage
// at a glance without relying solely on colour.

function makeTierIcon(tier: BlueprintTier, selected: boolean): L.DivIcon {
  const color = BLUEPRINT_TIER_COLORS[tier]
  const size  = selected ? 34 : 26
  const glow  = selected ? `drop-shadow(0 0 5px ${color})` : 'none'

  let inner: string
  switch (tier) {
    case 'SIMPLE_1':
      // Classic teardrop with filled circle centre
      inner = `
        <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z"
              fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="2.6" fill="white"/>`
      break

    case 'SIMPLE_2':
      // Diamond with circle centre
      inner = `
        <path d="M12 2L21 12L12 22L3 12Z"
              fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="2.6" fill="white"/>`
      break

    case 'SLA_HELPDESK':
      // Rounded square with bold 'H' glyph
      inner = `
        <rect x="3" y="3" width="18" height="18" rx="4"
              fill="${color}" stroke="white" stroke-width="1.5"/>
        <text x="12" y="16" font-family="monospace" font-size="9"
              font-weight="bold" fill="white" text-anchor="middle">H</text>`
      break

    case 'SLA_MONTHLY_NETWORK':
      // Circle with three-node network graph
      inner = `
        <circle cx="12" cy="12" r="9" fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="7.5" r="1.6" fill="white"/>
        <circle cx="7.5" cy="15"  r="1.6" fill="white"/>
        <circle cx="16.5" cy="15" r="1.6" fill="white"/>
        <line x1="12"  y1="9.1"  x2="8.3"  y2="13.4" stroke="white" stroke-width="1"/>
        <line x1="12"  y1="9.1"  x2="15.7" y2="13.4" stroke="white" stroke-width="1"/>
        <line x1="9.1" y1="15"   x2="14.9" y2="15"   stroke="white" stroke-width="1"/>`
      break

    case 'SLA_ACCESS_CONTROL':
      // Shield with padlock silhouette
      inner = `
        <path d="M12 2L3 6V12c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6L12 2z"
              fill="${color}" stroke="white" stroke-width="1.5"/>
        <rect x="9" y="11" width="6" height="4.5" rx="1" fill="white" opacity=".92"/>
        <path d="M10 11V9.5a2 2 0 0 1 4 0V11" fill="none" stroke="white" stroke-width="1.2"/>`
      break

    default:
      inner = `<circle cx="12" cy="12" r="9" fill="${color}" stroke="white" stroke-width="1.5"/>`
  }

  return L.divIcon({
    className:  '',
    iconAnchor: [size / 2, size],
    iconSize:   [size, size],
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                style="filter:${glow};overflow:visible">${inner}</svg>`,
  })
}

function makeDraftDot(): L.DivIcon {
  return L.divIcon({
    className:  '',
    iconAnchor: [6, 6],
    iconSize:   [12, 12],
    html: `<div style="width:12px;height:12px;border-radius:50%;background:#f59e0b;
                border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,.4)"></div>`,
  })
}

// ── Canvas interaction handler ────────────────────────────────────────────────

function CanvasInteraction() {
  const {
    activeTool, activeTier, draftPoints,
    rectDraftStart,
    addPin, pushDraftPoint, commitPolygon, commitPolyline, commitRectangle,
    setRectDraftStart, clearDraft,
    openContextMenu,
  } = useBlueprintStore()

  const [rectPreviewBounds, setRectPreviewBounds] =
    useState<[[number, number], [number, number]] | null>(null)

  useMapEvents({
    // ── Single click ────────────────────────────────────────────────────────
    click(e) {
      const coord: BlueprintCoord = { lat: e.latlng.lat, lng: e.latlng.lng }

      if (activeTool === 'pin') {
        addPin({
          lat:   coord.lat,
          lng:   coord.lng,
          tier:  activeTier,
          label: BLUEPRINT_TIER_LABELS[activeTier],
          notes: '',
        })
        return
      }

      if (activeTool === 'polygon' || activeTool === 'polyline') {
        pushDraftPoint(coord)
      }
    },

    // ── Double-click: commit polygon or polyline ─────────────────────────────
    dblclick(e) {
      if (activeTool === 'polygon') {
        commitPolygon()
        L.DomEvent.stop(e as unknown as Event)
        return
      }
      if (activeTool === 'polyline') {
        commitPolyline()
        L.DomEvent.stop(e as unknown as Event)
      }
    },

    // ── Rectangle: mousedown starts the drag ────────────────────────────────
    mousedown(e) {
      if (activeTool === 'rectangle') {
        setRectDraftStart({ lat: e.latlng.lat, lng: e.latlng.lng })
        setRectPreviewBounds(null)
      }
    },

    // ── Rectangle: mousemove draws live preview ──────────────────────────────
    mousemove(e) {
      if (activeTool === 'rectangle' && rectDraftStart) {
        setRectPreviewBounds([
          [rectDraftStart.lat, rectDraftStart.lng],
          [e.latlng.lat,       e.latlng.lng],
        ])
      }
    },

    // ── Rectangle: mouseup commits ────────────────────────────────────────────
    mouseup(e) {
      if (activeTool === 'rectangle' && rectDraftStart) {
        const a = rectDraftStart
        const b: BlueprintCoord = { lat: e.latlng.lat, lng: e.latlng.lng }
        if (Math.abs(b.lat - a.lat) > 4 || Math.abs(b.lng - a.lng) > 4) {
          commitRectangle([
            { lat: a.lat, lng: a.lng },
            { lat: b.lat, lng: a.lng },
            { lat: b.lat, lng: b.lng },
            { lat: a.lat, lng: b.lng },
          ])
        } else {
          setRectDraftStart(null)
        }
        setRectPreviewBounds(null)
      }
    },

    // ── Right-click: context menu ────────────────────────────────────────────
    contextmenu(e) {
      // Let pin/zone layers capture this first via stopPropagation;
      // if it bubbles here, close any open menu.
      L.DomEvent.stop(e as unknown as Event)
    },
  })

  // Rectangle live preview layer
  if (rectPreviewBounds) {
    return (
      <Rectangle
        bounds={rectPreviewBounds}
        pathOptions={{
          color:       BLUEPRINT_TIER_COLORS[activeTier],
          weight:      2,
          dashArray:   '5 4',
          fillOpacity: 0.08,
        }}
      />
    )
  }

  return null
}

// ── Draft path layer ─────────────────────────────────────────────────────────

function DraftLayer() {
  const { draftPoints, activeTool, activeTier } = useBlueprintStore()
  const color = BLUEPRINT_TIER_COLORS[activeTier]
  const coords = draftPoints.map((p) => [p.lat, p.lng] as [number, number])

  if (coords.length === 0) return null

  return (
    <>
      {coords.length >= 2 && (
        <Polyline
          positions={coords}
          pathOptions={{ color, weight: 2, dashArray: '5 4', opacity: 0.85 }}
        />
      )}
      {/* Close-loop preview for polygon */}
      {activeTool === 'polygon' && coords.length >= 3 && (
        <Polyline
          positions={[coords[coords.length - 1]!, coords[0]!]}
          pathOptions={{ color, weight: 1.5, dashArray: '3 4', opacity: 0.4 }}
        />
      )}
      {/* Draft vertex dots */}
      {coords.map((c, i) => (
        <Marker key={i} position={c} icon={makeDraftDot()} interactive={false} />
      ))}
    </>
  )
}

// ── Committed zone layer ──────────────────────────────────────────────────────

function ZoneLayer() {
  const { zones, selectedZoneId, selectZone, openContextMenu } = useBlueprintStore()

  return (
    <>
      {zones.map((z: BlueprintZone) => {
        const coords   = z.points.map((p) => [p.lat, p.lng] as [number, number])
        const selected = selectedZoneId === z.id
        const weight   = selected ? 3 : 2

        if (!z.closed) {
          return (
            <Polyline
              key={z.id}
              positions={coords}
              pathOptions={{ color: z.color, weight, dashArray: '6 4' }}
              eventHandlers={{
                click:        () => selectZone(z.id),
                contextmenu:  (e) => {
                  L.DomEvent.stop(e as unknown as Event)
                  const evt = e.originalEvent as MouseEvent
                  openContextMenu({ screenX: evt.clientX, screenY: evt.clientY, targetId: z.id, targetType: 'zone' })
                },
              }}
            />
          )
        }

        return (
          <Polygon
            key={z.id}
            positions={coords}
            pathOptions={{ color: z.color, weight, fillOpacity: selected ? 0.22 : 0.12 }}
            eventHandlers={{
              click:        () => selectZone(z.id),
              contextmenu:  (e) => {
                L.DomEvent.stop(e as unknown as Event)
                const evt = e.originalEvent as MouseEvent
                openContextMenu({ screenX: evt.clientX, screenY: evt.clientY, targetId: z.id, targetType: 'zone' })
              },
            }}
          />
        )
      })}
    </>
  )
}

// ── Pin layer ─────────────────────────────────────────────────────────────────

function PinLayer() {
  const { pins, selectedPinId, selectPin, openContextMenu } = useBlueprintStore()

  return (
    <>
      {pins.map((pin: BlueprintPin) => {
        const selected = selectedPinId === pin.id
        return (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={makeTierIcon(pin.tier, selected)}
            zIndexOffset={selected ? 1000 : 0}
            eventHandlers={{
              click: () => selectPin(selected ? null : pin.id),
              contextmenu: (e) => {
                L.DomEvent.stop(e as unknown as Event)
                const evt = e.originalEvent as MouseEvent
                openContextMenu({ screenX: evt.clientX, screenY: evt.clientY, targetId: pin.id, targetType: 'pin' })
              },
            }}
          />
        )
      })}
    </>
  )
}

// ── Context menu overlay ──────────────────────────────────────────────────────

function ContextMenuOverlay({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { contextMenu, closeContextMenu, removePin, removeZone, pins, zones, selectPin, selectZone } =
    useBlueprintStore()

  useEffect(() => {
    if (!contextMenu) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [contextMenu, closeContextMenu, containerRef])

  if (!contextMenu) return null

  const containerRect = containerRef.current?.getBoundingClientRect()
  const left = containerRect ? contextMenu.screenX - containerRect.left : contextMenu.screenX
  const top  = containerRect ? contextMenu.screenY - containerRect.top  : contextMenu.screenY

  const isPin  = contextMenu.targetType === 'pin'
  const label  = isPin
    ? pins.find((p) => p.id === contextMenu.targetId)?.label ?? 'Pin'
    : zones.find((z) => z.id === contextMenu.targetId)?.label ?? 'Zone'

  return (
    <div
      className="absolute z-[1000] min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
      style={{ left, top }}
    >
      <p className="truncate border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
        onClick={() => {
          if (isPin) selectPin(contextMenu.targetId)
          else       selectZone(contextMenu.targetId)
          closeContextMenu()
        }}
      >
        Properties
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-50"
        onClick={() => {
          if (isPin) removePin(contextMenu.targetId)
          else       removeZone(contextMenu.targetId)
        }}
      >
        Remove
      </button>
    </div>
  )
}

// ── Measurement tooltip in the canvas ────────────────────────────────────────

function DraftMeasureHint() {
  const { activeTool, draftPoints, activeTier } = useBlueprintStore()
  if (draftPoints.length < 2) return null

  const color = BLUEPRINT_TIER_COLORS[activeTier]
  let hint = ''
  if (activeTool === 'polyline') {
    hint = `${euclideanLength(draftPoints)} px`
  } else if (activeTool === 'polygon' && draftPoints.length >= 3) {
    hint = `${shoelaceArea(draftPoints)} px²`
  }
  if (!hint) return null

  const last = draftPoints[draftPoints.length - 1]!
  return (
    <Marker
      position={[last.lat + 8, last.lng]}
      interactive={false}
      icon={L.divIcon({
        className: '',
        iconAnchor: [0, 0],
        iconSize: [120, 20],
        html: `<div style="background:${color};color:white;padding:2px 6px;border-radius:6px;
                    font-size:10px;font-weight:bold;white-space:nowrap;pointer-events:none">
                  ${hint}
               </div>`,
      })}
    />
  )
}

// ── Fit-bounds effect component ───────────────────────────────────────────────

function FitBoundsEffect() {
  const { planImageUrl, planBounds } = useBlueprintStore()
  const map = useMapEvents({})

  useEffect(() => {
    if (planImageUrl) {
      map.fitBounds(planBounds as L.LatLngBoundsLiteral, { animate: true })
    }
  }, [planImageUrl, planBounds, map])

  return null
}

// ── Main canvas export ────────────────────────────────────────────────────────

interface BlueprintCanvasProps {
  className?: string
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function BlueprintCanvas({ className = '', containerRef }: BlueprintCanvasProps) {
  const { planImageUrl, planBounds } = useBlueprintStore()
  const bounds = planBounds as L.LatLngBoundsLiteral

  return (
    <div ref={containerRef} className={`relative h-full w-full ${className}`}>
      {planImageUrl ? (
        <MapContainer
          crs={L.CRS.Simple}
          bounds={bounds}
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
          zoomControl
          attributionControl={false}
          doubleClickZoom={false}
          minZoom={-4}
          maxZoom={4}
        >
          <FitBoundsEffect />
          <ImageOverlay url={planImageUrl} bounds={bounds} />
          <CanvasInteraction />
          <DraftLayer />
          <DraftMeasureHint />
          <ZoneLayer />
          <PinLayer />
        </MapContainer>
      ) : (
        <div className="flex h-full items-center justify-center bg-slate-900/60">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-400">No plan loaded</p>
            <p className="mt-1 text-xs text-slate-500">Upload a floor plan image to begin</p>
          </div>
        </div>
      )}

      {/* Context menu positioned relative to the canvas container */}
      <ContextMenuOverlay containerRef={containerRef} />
    </div>
  )
}
