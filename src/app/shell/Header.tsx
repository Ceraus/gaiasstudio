import {
  Bell, FileSearch, FileSignature, FolderKanban,
  Loader2, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/core/auth/AuthContext'
import { Avatar } from '@/shared/components/Avatar'
import { hapticImpact, ImpactStyle } from '@/infrastructure/capacitor/haptics'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { brokerGlobalSearch, clearGlobalSearch } from '@/store/globalSearchSlice'
import { loadServerContractIntoBuilder } from '@/store/contractsSlice'
import { setActiveContractType } from '@/store/studioSlice'
import { TIER_LABELS, TIER_BADGE_COLORS, type Contract } from '@/shared/types/contract'
import type { ProjectHit, VaultHit } from '@/core/api/globalSearchApi'

// ── Tier badge (inline) ───────────────────────────────────────────────────────

function TierPill({ tier }: { tier: string }) {
  const label = TIER_LABELS[tier as keyof typeof TIER_LABELS] ?? tier
  const color = TIER_BADGE_COLORS[tier as keyof typeof TIER_BADGE_COLORS] ?? '#64748b'
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  )
}

// ── Hit rows ─────────────────────────────────────────────────────────────────

function ContractRow({ contract, onClick }: { contract: Contract; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{contract.client_name}</p>
        {contract.contract_title && (
          <p className="truncate text-[10px] text-slate-400">{contract.contract_title}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <TierPill tier={contract.contract_type} />
        <span className="text-[10px] font-bold tabular-nums text-slate-500">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
            contract.total_investment,
          )}
        </span>
      </div>
    </button>
  )
}

function ProjectRow({ project, onClick }: { project: ProjectHit; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
    >
      <FolderKanban size={14} className="shrink-0 text-[#166eb4]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{project.name}</p>
        {project.company && (
          <p className="truncate text-[10px] text-slate-400">{project.company}</p>
        )}
      </div>
      <span className="shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[9px] font-bold capitalize text-slate-500">
        {project.status}
      </span>
    </button>
  )
}

function VaultRow({ doc, onClick }: { doc: VaultHit; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
    >
      <FileSearch size={14} className="shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{doc.document_title}</p>
      </div>
      {doc.tier && <TierPill tier={doc.tier} />}
    </button>
  )
}

// ── Section header inside dropdown ───────────────────────────────────────────

function SectionHeader({ icon: Icon, label, count }: { icon: typeof Search; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-3 py-1.5">
      <Icon size={11} className="text-slate-400" aria-hidden />
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <span className="ml-auto text-[9px] font-bold text-slate-400">{count}</span>
    </div>
  )
}

// ── Main Header ───────────────────────────────────────────────────────────────

export function Header({
  onSidebarToggle,
  onMobileMenu,
  collapsed,
  title,
}: {
  onSidebarToggle: () => void
  onMobileMenu: () => void
  collapsed: boolean
  title: string
}) {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const { query, results, status } = useAppSelector((s) => s.globalSearch)
  const totalHits = results.contracts.length + results.projects.length + results.vault.length

  const [inputValue, setInputValue] = useState('')
  const [open, setOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showProjectMenu = /^\/projects\/[^/]+/.test(location.pathname)

  // ── Debounced dispatch ────────────────────────────────────────────────────

  function handleChange(value: string) {
    setInputValue(value)
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      dispatch(clearGlobalSearch())
      return
    }
    debounceRef.current = setTimeout(() => {
      dispatch(brokerGlobalSearch(value))
    }, 300)
  }

  function handleClear() {
    setInputValue('')
    setOpen(false)
    dispatch(clearGlobalSearch())
  }

  // ── Click-outside / Escape to close ─────────────────────────────────────

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false) }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // Close dropdown on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  // ── Hit click routing ────────────────────────────────────────────────────

  function handleContractHit(contract: Contract) {
    dispatch(loadServerContractIntoBuilder(contract))
    dispatch(setActiveContractType(contract.contract_type))
    setOpen(false)
    setInputValue('')
    dispatch(clearGlobalSearch())
    navigate('/contracts?tab=create')
  }

  function handleProjectHit(project: ProjectHit) {
    setOpen(false)
    setInputValue('')
    dispatch(clearGlobalSearch())
    navigate(`/projects/${project.id}`)
  }

  function handleVaultHit(_doc: VaultHit) {
    setOpen(false)
    setInputValue('')
    dispatch(clearGlobalSearch())
    navigate('/contracts')
  }

  // ── Dropdown visibility guard ────────────────────────────────────────────

  const showDropdown =
    open &&
    inputValue.trim().length >= 2 &&
    (status === 'searching' || status === 'succeeded' || status === 'failed')

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <header className="safe-top sticky top-0 z-30 min-h-12 border-b border-slate-200/70 bg-white/90 px-2.5 shadow-[0_1px_8px_rgba(15,23,42,0.035)] backdrop-blur-xl sm:px-4 md:px-6">
      <div className="flex min-h-12 items-center justify-between gap-2">
        {/* ── Left: menu + search ── */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => { hapticImpact(ImpactStyle.Light); onMobileMenu() }}
            aria-label="Open navigation"
            className="compact-control grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm active:scale-95 lg:hidden"
          >
            <Menu size={19} />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            type="button"
            onClick={() => { hapticImpact(ImpactStyle.Light); onSidebarToggle() }}
            aria-label="Toggle sidebar"
            className="compact-control hidden h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:grid"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Mobile page title */}
          <p className="min-w-0 flex-1 truncate text-base font-bold text-ink lg:hidden">{title}</p>

          {/* Mobile project section toggle */}
          {showProjectMenu && (
            <button
              type="button"
              onClick={() => { hapticImpact(ImpactStyle.Light); window.dispatchEvent(new CustomEvent('clearplan:open-project-sections')) }}
              aria-label="Open project sections"
              className="compact-control grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 active:scale-95 lg:hidden"
            >
              <Menu size={18} />
            </button>
          )}

          {/* ── Global search ── */}
          <div ref={containerRef} className="relative hidden min-w-0 flex-1 xs:block sm:block">
            <div className="flex min-h-9 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-1 shadow-sm focus-within:border-[#166eb4]/40 focus-within:ring-1 focus-within:ring-[#166eb4]/20 transition-all">
              {status === 'searching'
                ? <Loader2 size={15} className="shrink-0 animate-spin text-[#166eb4]" aria-hidden />
                : <Search size={15} className="shrink-0 text-slate-400" aria-hidden />
              }
              <input
                type="search"
                value={inputValue}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={() => { if (inputValue.trim().length >= 2) setOpen(true) }}
                aria-label="Search projects, contracts, vault"
                placeholder="Search projects, contracts, vault…"
                className="w-full min-w-0 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
                autoComplete="off"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear search"
                  className="shrink-0 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} aria-hidden />
                </button>
              )}
            </div>

            {/* ── Results dropdown ── */}
            {showDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">

                {/* Searching spinner */}
                {status === 'searching' && (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-400">
                    <Loader2 size={14} className="animate-spin text-[#166eb4]" aria-hidden />
                    Searching…
                  </div>
                )}

                {/* Failed */}
                {status === 'failed' && (
                  <p className="px-3 py-4 text-sm text-red-500">
                    Search unavailable — Meilisearch may be unreachable.
                  </p>
                )}

                {/* Contracts section */}
                {results.contracts.length > 0 && (
                  <div>
                    <SectionHeader icon={FileSignature} label="Contracts" count={results.contracts.length} />
                    {results.contracts.map((c) => (
                      <ContractRow key={c.id} contract={c} onClick={() => handleContractHit(c)} />
                    ))}
                  </div>
                )}

                {/* Projects section */}
                {results.projects.length > 0 && (
                  <div>
                    <SectionHeader icon={FolderKanban} label="Projects" count={results.projects.length} />
                    {results.projects.map((p) => (
                      <ProjectRow key={p.id} project={p} onClick={() => handleProjectHit(p)} />
                    ))}
                  </div>
                )}

                {/* Vault section */}
                {results.vault.length > 0 && (
                  <div>
                    <SectionHeader icon={FileSearch} label="Vault Documents" count={results.vault.length} />
                    {results.vault.map((d) => (
                      <VaultRow key={d.id} doc={d} onClick={() => handleVaultHit(d)} />
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {status === 'succeeded' && totalHits === 0 && (
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <Search size={24} className="text-slate-200" aria-hidden />
                    <p className="text-sm font-semibold text-slate-400">
                      No results for &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-xs text-slate-400">
                      Try a different term, or check that the Meilisearch index is reachable.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: bell + avatar + logout ── */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="compact-control grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <Bell size={16} aria-hidden />
          </button>
          <Avatar name={user?.name ?? 'User'} className="h-9 w-9 text-xs" />
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Log out"
            className="compact-control grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <LogOut size={16} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  )
}
