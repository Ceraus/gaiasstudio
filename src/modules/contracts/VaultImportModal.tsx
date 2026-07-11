import { useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  CloudUpload,
  FileSearch,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  FileSpreadsheet,
  FileScan,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  brokerLegacyVaultData,
  resetVaultImport,
  type VaultImportStatus,
} from '@/store/vaultImportSlice'
import { setActiveContractType } from '@/store/studioSlice'
import { updateDraftField } from '@/store/contractsSlice'
import type { ContractTier } from '@/shared/types/contract'

// ── Accepted document MIME types ──────────────────────────────────────────────
// The backend's Regex + Qwen pipeline handles all of these; the frontend simply
// streams the raw file to /api/v1/vault/legacy-extract as multipart FormData.

const ACCEPTED: Record<string, string[]> = {
  // PDF — primary legacy format
  'application/pdf': ['.pdf'],
  // Plain text / paste exports
  'text/plain': ['.txt'],
  // Rich text
  'text/rtf': ['.rtf'],
  'application/rtf': ['.rtf'],
  // Microsoft Word
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  // Spreadsheets (still accepted for structured imports)
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
}

const ACCEPTED_EXTENSIONS =
  '.pdf · .txt · .rtf · .doc · .docx · .xls · .xlsx · .csv'

// ── Pipeline stage config ─────────────────────────────────────────────────────

type PipelineStep = 'uploading' | 'extracting' | 'succeeded'

const STEPS: { id: PipelineStep; label: string; shortLabel: string }[] = [
  { id: 'uploading',  label: 'Uploading Document',   shortLabel: 'Upload' },
  { id: 'extracting', label: 'Running AI Extraction', shortLabel: 'Extract' },
  { id: 'succeeded',  label: 'Slotting Fields',       shortLabel: 'Done' },
]

const STEP_ORDER: Record<PipelineStep, number> = {
  uploading: 0,
  extracting: 1,
  succeeded: 2,
}

const STATUS_LABEL: Partial<Record<VaultImportStatus, string>> = {
  idle:       'Drop your legacy document to begin',
  uploading:  'Uploading Document…',
  extracting: 'Running AI Extraction…',
  succeeded:  'Fields auto-slotted — ready to finalize',
  failed:     'Extraction failed',
}

// ── File-type icon ────────────────────────────────────────────────────────────

function DocTypeIcon({ mime, className }: { mime: string; className?: string }) {
  if (mime === 'application/pdf' || mime.includes('pdf'))
    return <FileScan className={className} aria-hidden />
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv')
    return <FileSpreadsheet className={className} aria-hidden />
  return <FileText className={className} aria-hidden />
}

// ── Component ─────────────────────────────────────────────────────────────────

interface VaultImportModalProps {
  onClose: () => void
  /** Called after successful extraction so the parent lands on the Live Builder */
  onImported: () => void
}

export function VaultImportModal({ onClose, onImported }: VaultImportModalProps) {
  const dispatch = useAppDispatch()
  const { status, fileName, mappedPayload, error } = useAppSelector((s) => s.vaultImport)

  // ── Auto-slot extracted fields into the Live Builder ─────────────────────
  useEffect(() => {
    if (status !== 'succeeded' || !mappedPayload) return

    dispatch(setActiveContractType(mappedPayload.tier as ContractTier))
    dispatch(updateDraftField({ contractType: mappedPayload.tier, ...mappedPayload.draft }))

    // Brief pause so the user sees the success state before the modal closes
    const t = setTimeout(() => {
      dispatch(resetVaultImport())
      onImported()
    }, 1600)
    return () => clearTimeout(t)
  }, [status, mappedPayload, dispatch, onImported])

  // ── Drop handler — sends raw file directly to the backend ─────────────────
  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0]
      if (!file) return
      dispatch(brokerLegacyVaultData(file))
    },
    [dispatch],
  )

  const busy = status === 'uploading' || status === 'extracting'
  const done = status === 'succeeded'
  const failed = status === 'failed'
  const currentStepOrder = STEP_ORDER[status as PipelineStep] ?? -1

  const { getRootProps, getInputProps, isDragActive, isDragReject, acceptedFiles } =
    useDropzone({
      onDrop,
      accept: ACCEPTED,
      maxFiles: 1,
      disabled: busy || done,
    })

  const droppedMime = acceptedFiles[0]?.type ?? ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Vault Import"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6c9f42]/12">
              <CloudUpload className="h-5 w-5 text-[#6c9f42]" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Vault Import</h2>
              <p className="text-[11px] text-slate-500">
                Legacy document → AI extraction → Contract Hub
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { dispatch(resetVaultImport()); onClose() }}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="space-y-5 p-6">

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6c9f42]/50 ${
              busy || done
                ? 'pointer-events-none border-slate-200 bg-slate-50'
                : isDragReject
                  ? 'border-red-400 bg-red-50'
                  : isDragActive
                    ? 'border-[#6c9f42] bg-[#6c9f42]/6'
                    : 'border-slate-300 bg-slate-50 hover:border-[#6c9f42] hover:bg-[#6c9f42]/4'
            }`}
          >
            <input {...getInputProps()} />

            {/* Status icon */}
            {done ? (
              <CheckCircle2 className="h-10 w-10 text-[#6c9f42]" aria-hidden />
            ) : failed ? (
              <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden />
            ) : busy ? (
              <div className="relative flex h-10 w-10 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#166eb4]" aria-hidden />
                {droppedMime && (
                  <DocTypeIcon
                    mime={droppedMime}
                    className="absolute h-4 w-4 text-[#166eb4]"
                  />
                )}
              </div>
            ) : (
              <FileSearch
                className={`h-10 w-10 transition-colors ${isDragActive ? 'text-[#6c9f42]' : 'text-slate-400'}`}
                aria-hidden
              />
            )}

            {/* Primary label */}
            <p
              className={`text-sm font-semibold ${
                done ? 'text-[#6c9f42]'
                : failed ? 'text-amber-600'
                : busy ? 'text-[#166eb4]'
                : isDragReject ? 'text-red-600'
                : 'text-slate-600'
              }`}
            >
              {isDragReject
                ? 'Unsupported file type'
                : (STATUS_LABEL[status] ?? 'Drop your legacy document to begin')}
            </p>

            {/* File name during processing */}
            {busy && fileName && (
              <p className="max-w-xs truncate text-xs text-slate-400">{fileName}</p>
            )}

            {/* Idle hint */}
            {!busy && !done && !failed && (
              <p className="text-xs text-slate-400">
                {isDragActive
                  ? 'Release to upload'
                  : 'Drag & drop a document — or click to browse'}
              </p>
            )}
          </div>

          {/* ── Pipeline progress stepper ── */}
          <div className="flex items-start gap-0">
            {STEPS.map(({ id, shortLabel }, i) => {
              const stepIdx = STEP_ORDER[id]
              const isComplete = currentStepOrder > stepIdx
              const isActive = currentStepOrder === stepIdx
              return (
                <div key={id} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-center">
                    {i > 0 && (
                      <div
                        className={`h-0.5 flex-1 transition-colors ${
                          isComplete || isActive ? 'bg-[#166eb4]' : 'bg-slate-200'
                        }`}
                      />
                    )}
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                        isComplete
                          ? 'bg-[#6c9f42] text-white'
                          : isActive
                            ? 'bg-[#166eb4] text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isComplete ? '✓' : i + 1}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 transition-colors ${
                          isComplete ? 'bg-[#166eb4]' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wide ${
                      isActive ? 'text-[#166eb4]' : isComplete ? 'text-[#6c9f42]' : 'text-slate-400'
                    }`}
                  >
                    {shortLabel}
                  </span>
                </div>
              )
            })}
          </div>

          {/* AI backend note — shown while extracting */}
          {status === 'extracting' && (
            <p className="rounded-lg border border-[#166eb4]/20 bg-[#166eb4]/5 px-3 py-2 text-[11px] text-[#166eb4]">
              The backend AI pipeline is running Regex sanitization followed by
              Qwen/Ollama NLP extraction. This may take 10–30 seconds for large documents.
            </p>
          )}

          {/* Error detail */}
          {failed && error && (
            <p className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          {/* Retry */}
          {failed && (
            <button
              type="button"
              onClick={() => dispatch(resetVaultImport())}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:border-[#166eb4] hover:text-[#166eb4]"
            >
              Try again
            </button>
          )}
        </div>

        {/* ── Supported formats footer ── */}
        <div className="rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-3">
          <p className="text-[10px] text-slate-400">
            Supported:&ensp;
            <span className="font-semibold text-slate-500">{ACCEPTED_EXTENSIONS}</span>
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            One file per import · Raw file is sent to the local AI backend — no browser parsing
          </p>
        </div>
      </div>
    </div>
  )
}
