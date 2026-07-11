import { Keyboard, LogOut, Mail, ShieldCheck, UserCircle } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/shared/components/Avatar";
import { StatCard } from "@/shared/components/StatCard";
import { useAuth } from "@/core/auth/AuthContext";
import { MouseKeyboardPanel } from "./MouseKeyboardPanel";

type ProfileTab = "account" | "mouse-keyboard";

const TABS: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
  { id: "account", label: "Account", icon: UserCircle },
  { id: "mouse-keyboard", label: "Mouse & Keyboard", icon: Keyboard },
];

export function ProfilePage() {
  const { logout, permissions, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("account");
  const displayName = user?.name ?? "User";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-field">Profile</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">{displayName}</h1>
          <p className="mt-2 text-slate-500">Account settings and input preferences for the Clearplan Command workspace.</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lift"
        >
          <LogOut size={18} aria-hidden="true" />
          Sign out
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div
        className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        role="tablist"
        aria-label="Profile sections"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[#166eb4] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={13} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Account tab ── */}
      {activeTab === "account" && (
        <>
          <section className="card rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={displayName} />
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-ink">{displayName}</h2>
                <p className="mt-1 break-all text-sm font-semibold text-slate-500">
                  {user?.email ?? "demo@clearplan.local"}
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Account type" value="Demo" detail="Mock auth session" icon={UserCircle} />
            <StatCard
              label="Email"
              value={user?.email ? "Set" : "Demo"}
              detail={user?.email ?? "No backend identity yet"}
              icon={Mail}
            />
            <StatCard
              label="Permissions"
              value={String(permissions.length)}
              detail="Frontend capability flags"
              icon={ShieldCheck}
            />
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-semibold text-ink">Preferences</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {["Company", "Role", "Default view", "Data mode"].map((label, index) => (
                <label key={label} className="text-sm font-semibold text-slate-500">
                  {label}
                  <input
                    readOnly
                    value={["Clearview Global", "Administrator", "Projects", "Live"][index]}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink outline-none"
                  />
                </label>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── Mouse & Keyboard tab ── */}
      {activeTab === "mouse-keyboard" && <MouseKeyboardPanel />}
    </div>
  );
}
