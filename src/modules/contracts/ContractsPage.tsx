import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileSignature, Map, PlusCircle } from 'lucide-react'
import { useAppDispatch } from '@/store/hooks'
import { updateDraftField } from '@/store/contractsSlice'
import { setActiveContractType } from '@/store/studioSlice'
import { type ContractTier } from '@/shared/types/contract'
import { ContractDashboard } from './ContractDashboard'
import { ContractCreation, type ContractTab } from './ContractCreation'
import { ClientDistributionMap } from './ClientDistributionMap'

const TABS: { id: ContractTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard',    icon: FileSignature },
  { id: 'create',    label: 'New Contract', icon: PlusCircle },
  { id: 'map',       label: 'Client Map',   icon: Map },
]

export function ContractsPage() {
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()

  // Global search hit routing: ?tab=create opens the Live Builder directly.
  const [activeTab, setActiveTab] = useState<ContractTab>(() => {
    const t = searchParams.get('tab')
    return t === 'create' || t === 'map' ? t : 'dashboard'
  })

  function handleCreateWithType(type: ContractTier) {
    dispatch(setActiveContractType(type))
    dispatch(updateDraftField({ contractType: type }))
    setActiveTab('create')
  }

  /** Called by ContractDashboard when a draft card's Resume button is clicked. */
  function handleResumeDraft() {
    setActiveTab('create')
  }

  const isCreate = activeTab === 'create'

  return (
    <div className="flex flex-col">
      {/* ── Tab bar — always visible across all three sections ── */}
      <div className="shrink-0 pb-4">
        <div
          className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Contract Hub sections"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#166eb4] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={13} aria-hidden />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      {isCreate ? (
        <ContractCreation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSuccess={() => setActiveTab('dashboard')}
        />
      ) : activeTab === 'map' ? (
        /*
         * Full-bleed map: negative margins cancel the AppShell's responsive
         * horizontal padding so the map stretches edge-to-edge. The bottom
         * margin cancels the shell's bottom padding too.
         * AppShell padding: px-3 sm:px-5 md:px-6 lg:px-8 / py-4 lg:py-8
         */
        <div className="-mx-3 -mb-8 sm:-mx-5 md:-mx-6 lg:-mx-8 lg:-mb-8">
          <ClientDistributionMap active />
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'dashboard' && (
            <ContractDashboard
              onCreateContract={() => setActiveTab('create')}
              onCreateWithType={handleCreateWithType}
              onResumeDraft={handleResumeDraft}
            />
          )}
        </div>
      )}
    </div>
  )
}
