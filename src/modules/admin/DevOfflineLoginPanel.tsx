import { useState, type FormEvent } from 'react'
import { activateDevSession } from '@/core/auth/devSession'
import { authenticateDevOffline, isDevOfflineLoginEnabled } from '@/core/auth/devOfflineAuth'

export function DevOfflineLoginPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isDevOfflineLoginEnabled()) return null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const user = authenticateDevOffline(email, password)
    if (!user) {
      setError('Invalid dev credentials. Use your @clearviewglobal.com email and the team dev password.')
      setSubmitting(false)
      return
    }

    activateDevSession(user)
    window.location.assign('/dashboard')
  }

  return (
    <>
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-amber-300/40" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">
          Dev Only
        </span>
        <div className="h-px flex-1 bg-amber-300/40" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-amber-500/80">
            Work email
          </span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@clearviewglobal.com"
            required
            className="w-full rounded-md border border-amber-400/40 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-amber-500/80">
            Dev password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-md border border-amber-400/40 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
          />
        </label>

        {error ? (
          <p className="rounded-md bg-red-950/60 px-3 py-2 text-xs text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md border border-amber-400/60 bg-amber-50/10 px-4 py-2 text-sm font-semibold text-amber-400 transition hover:bg-amber-400/10 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Dev Offline Sign In'}
        </button>
      </form>

      <p className="mt-2 text-center text-[11px] text-amber-600/70">
        Local dev only — bypasses Microsoft SSO. Not available in production builds.
      </p>
    </>
  )
}
