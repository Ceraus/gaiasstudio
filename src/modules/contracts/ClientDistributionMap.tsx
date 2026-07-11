import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadClientDistribution } from '@/store/clientDistributionSlice'
import { TIER_LABELS, MAP_TONE_COLORS, type ClientDistributionEntry, type MapTone } from '@/shared/types/contract'

// ── NYC anchor ────────────────────────────────────────────────────────────────
const NYC: [number, number] = [40.7128, -74.006]

// ── Custom DivIcon factory (bypasses Leaflet's default icon path issue) ───────
function createMarkerIcon(color: string, isHq = false): L.DivIcon {
  const size = isHq ? 22 : 16
  const shadow = `0 0 10px ${color}`
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position:relative;
        width:${size}px;height:${size}px;
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="
          position:absolute;
          width:100%;height:100%;
          border-radius:50%;
          background:${color};
          opacity:0.55;
          animation:cvgMapPing 1.5s cubic-bezier(0,0,.2,1) infinite;
        "></span>
        <span style="
          position:relative;
          width:${isHq ? 14 : 10}px;
          height:${isHq ? 14 : 10}px;
          border-radius:50%;
          background:${color};
          border:2px solid rgba(255,255,255,0.9);
          box-shadow:${shadow};
        "></span>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  })
}

// ── Ping animation (injected once) ───────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('cvg-leaflet-ping')) {
  const style = document.createElement('style')
  style.id = 'cvg-leaflet-ping'
  style.textContent = `
    @keyframes cvgMapPing {
      75%, 100% { transform: scale(2.2); opacity: 0; }
    }
    .cvg-leaflet-popup .leaflet-popup-content-wrapper {
      border-radius: 10px;
      padding: 0;
      box-shadow: 0 8px 24px rgba(15,23,42,.18);
    }
    .cvg-leaflet-popup .leaflet-popup-content { margin: 0; }
    .cvg-leaflet-popup .leaflet-popup-tip { display: none; }
  `
  document.head.appendChild(style)
}

// ── Map legend ────────────────────────────────────────────────────────────────
const LEGEND_ITEMS: { tone: MapTone; label: string }[] = [
  { tone: 'active', label: 'Active' },
  { tone: 'expiring_soon', label: 'Expiring Soon' },
  { tone: 'expired', label: 'Expired' },
  { tone: 'none', label: 'No Contract' },
]

// ── Resize helper — fires when map becomes visible ────────────────────────────
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 50)
    return () => clearTimeout(t)
  }, [map])
  return null
}

// ── Popup content ─────────────────────────────────────────────────────────────
function ClientPopup({ entry }: { entry: ClientDistributionEntry }) {
  const color = MAP_TONE_COLORS[entry.status]
  const tierLabel = entry.contract_tier ? TIER_LABELS[entry.contract_tier] : 'No contract'
  const daysLeft = entry.expires_at
    ? Math.ceil((new Date(entry.expires_at).getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <div className="min-w-[200px] rounded-lg bg-slate-900 p-3 text-white">
      <p className="text-sm font-bold leading-tight">{entry.name}</p>
      {entry.address ? <p className="mt-0.5 text-[11px] text-slate-400">{entry.address}</p> : null}
      <div className="mt-2 flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
        <span className="text-[11px] font-semibold capitalize" style={{ color }}>
          {entry.status.replace('_', ' ')}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-300">{tierLabel}</p>
      {daysLeft !== null ? (
        <p className="mt-1 text-[11px] text-slate-400">
          {daysLeft >= 0 ? `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Expired'}
        </p>
      ) : null}
    </div>
  )
}

// ── Main map component ────────────────────────────────────────────────────────

export function ClientDistributionMap({ active = true }: { active?: boolean }) {
  const dispatch = useAppDispatch()
  const { entries, status } = useAppSelector((s) => s.clientDistribution)

  useEffect(() => {
    if (status === 'idle') dispatch(loadClientDistribution())
  }, [dispatch, status])

  const hqIcon = createMarkerIcon('#166eb4', true)

  return (
    <div className="flex flex-col">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            Client Distribution Map
          </h2>
          <p className="text-xs text-slate-500">
            Spatial broker — client locations with contract-status overlays
          </p>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {entries.length} client{entries.length === 1 ? '' : 's'} mapped
        </span>
      </div>

      {/* Map fills remaining viewport height below the tab bar + header strip */}
      <div
        className="relative overflow-hidden border-t border-slate-200"
        style={{ height: 'calc(100dvh - 11rem)' }}
      >
        {status === 'loading' && entries.length === 0 ? (
          <div className="flex h-full items-center justify-center bg-slate-900/40">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-[#166eb4]" />
          </div>
        ) : (
          <>
            <MapContainer
              center={NYC}
              zoom={11.5}
              style={{ height: '100%', width: '100%', background: '#0f172a' }}
              zoomControl={false}
            >
              <MapResizer />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com">CARTO</a>'
                subdomains={['a', 'b', 'c', 'd']}
                maxZoom={19}
              />

              {/* HQ marker */}
              <Marker position={NYC} icon={hqIcon}>
                <Popup className="cvg-leaflet-popup">
                  <div className="min-w-[160px] rounded-lg bg-slate-900 p-3 text-white">
                    <p className="text-sm font-bold text-[#166eb4]">New York City · HQ</p>
                    <p className="text-[11px] text-slate-400">Clearview home base</p>
                  </div>
                </Popup>
              </Marker>

              {/* Client markers — pulled from Redux store */}
              {entries.map((entry) => {
                const color = MAP_TONE_COLORS[entry.status]
                const icon = createMarkerIcon(color)
                return (
                  <Marker
                    key={entry.id}
                    position={[entry.lat, entry.lng]}
                    icon={icon}
                  >
                    <Popup className="cvg-leaflet-popup">
                      <ClientPopup entry={entry} />
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>

            {/* Legend overlay */}
            <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-lg bg-slate-900/90 p-3 backdrop-blur-sm">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Contract Status
              </p>
              <ul className="space-y-1.5">
                {LEGEND_ITEMS.map(({ tone, label }) => (
                  <li key={tone} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: MAP_TONE_COLORS[tone],
                        boxShadow: `0 0 6px ${MAP_TONE_COLORS[tone]}`,
                      }}
                    />
                    <span className="text-[11px] font-semibold text-slate-200">{label}</span>
                  </li>
                ))}
              </ul>
            </div>

          </>
        )}
      </div>
    </div>
  )
}
