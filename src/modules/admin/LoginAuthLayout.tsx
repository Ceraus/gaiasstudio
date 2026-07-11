import { Suspense, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import clearviewLoginLogo from '@/assets/clearview-login-logo.png'
import { lazyWithRetry } from '@/shared/utils/lazyWithRetry'

const LoginEarthCanvas = lazyWithRetry(() =>
  import('./LoginEarthCanvas').then((m) => ({ default: m.LoginEarthCanvas })),
)

function EarthFallback() {
  return (
    <div
      className="h-full w-full"
      style={{
        background:
          'radial-gradient(circle at 38% 38%, #1b4f86 0%, #0a2950 38%, #051022 68%, #020509 100%)',
      }}
    />
  )
}

/** Shown while the LoginPage chunk is lazy-loading — matches the Pre-Redux bootstrap screen. */
export function LoginFallback() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-3 overflow-hidden bg-[#020509]">
      <EarthFallback />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <img
          src={clearviewLoginLogo}
          alt="Clearview Global"
          className="mb-2 h-[clamp(56px,10vh,88px)] w-auto object-contain"
          style={{
            filter:
              'drop-shadow(0 0 32px rgba(41,182,255,0.55)) drop-shadow(0 4px 18px rgba(0,0,0,0.8))',
          }}
        />
        <Loader2 className="size-7 animate-spin" style={{ color: '#166eb4' }} aria-hidden />
        <p className="text-sm font-medium text-slate-100">Verifying session…</p>
        <p className="text-xs text-slate-500">Clearview Global — Clearplan Command</p>
      </div>
    </div>
  )
}

export function LoginAuthLayout({ children }: { children: ReactNode }) {
  return (
    // translate="no" prevents browser translation extensions (Google Translate, DeepL)
    // from injecting DOM nodes that React can't track — avoiding "Node.removeChild"
    // reconciliation errors on unmount.
    <div
      className="relative min-h-screen overflow-hidden bg-[#020509]"
      translate="no"
      data-gramm="false"
      data-gramm_editor="false"
    >
      <div className="absolute inset-0">
        <EarthFallback />
        <div className="absolute inset-0">
          <Suspense fallback={<EarthFallback />}>
            <LoginEarthCanvas />
          </Suspense>
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 48%, rgba(2,5,12,0.42) 0%, rgba(2,5,9,0.18) 42%, transparent 72%)',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="flex w-full max-w-sm flex-col items-center">
          <img
            src={clearviewLoginLogo}
            alt="Clearview Global"
            className="mb-6 h-[clamp(72px,12vh,112px)] w-auto -translate-y-[15%] object-contain"
            style={{
              filter:
                'drop-shadow(0 0 32px rgba(41,182,255,0.55)) drop-shadow(0 4px 18px rgba(0,0,0,0.8))',
            }}
          />
          <div className="w-full">{children}</div>
        </div>
      </div>
    </div>
  )
}
