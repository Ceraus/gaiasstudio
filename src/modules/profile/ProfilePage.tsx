import { LogOut, Mail, ShieldCheck, UserCircle } from "lucide-react";
import { Avatar } from "@/shared/components/Avatar";
import { StatCard } from "@/shared/components/StatCard";
import { useAuth } from "@/core/auth/AuthContext";

export function ProfilePage() {
  const { logout, permissions, user } = useAuth();
  const displayName = user?.name ?? "ClearPlan User";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-field">Profile</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">{displayName}</h1>
          <p className="mt-2 text-slate-500">Demo account settings for the frontend-only ClearPlan workspace.</p>
        </div>
        <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lift">
          <LogOut size={18} aria-hidden="true" />
          Sign out
        </button>
      </div>

      <section className="card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={displayName} />
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-ink">{displayName}</h2>
            <p className="mt-1 break-all text-sm font-semibold text-slate-500">{user?.email ?? "demo@clearplan.local"}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Account type" value="Demo" detail="Mock auth session" icon={UserCircle} />
        <StatCard label="Email" value={user?.email ? "Set" : "Demo"} detail={user?.email ?? "No backend identity yet"} icon={Mail} />
        <StatCard label="Permissions" value={String(permissions.length)} detail="Frontend capability flags" icon={ShieldCheck} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-ink">Preferences</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {["Company", "Role", "Default view", "Data mode"].map((label, index) => (
            <label key={label} className="text-sm font-semibold text-slate-500">
              {label}
              <input readOnly value={["ClearPlan", "Administrator", "Projects", "Mock frontend"][index]} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink outline-none" />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
