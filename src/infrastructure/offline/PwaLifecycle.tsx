import { RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaLifecycle() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [reconnected, setReconnected] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(() => isStandaloneMode());

  useEffect(() => {
    registerServiceWorker();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setStandalone(true);
      setInstallPrompt(null);
    };

    const handleOnline = () => {
      setOnline(true);
      setReconnected(true);
      window.setTimeout(() => setReconnected(false), 3200);
      registerBackgroundSync();
    };

    const handleOffline = () => setOnline(false);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (!online) {
    return (
      <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] mx-auto flex min-h-11 max-w-md items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-2xl">
        <WifiOff size={18} aria-hidden="true" />
        <span className="min-w-0 flex-1">Offline mode. Cached screens stay available.</span>
      </div>
    );
  }

  if (reconnected) {
    return (
      <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] mx-auto flex min-h-11 max-w-md items-center gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-2xl">
        <RefreshCw size={18} aria-hidden="true" />
        <span className="min-w-0 flex-1">Connection restored.</span>
      </div>
    );
  }

  if (installPrompt && !standalone) {
    return (
      <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-md flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-2xl">
        <span className="font-semibold text-slate-700">Install Clearplan Command for offline access.</span>
        <button type="button" onClick={() => void install()} className="min-h-11 rounded-full bg-slate-950 px-4 font-bold text-white">
          Install
        </button>
      </div>
    );
  }

  return null;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    if (navigator.onLine) await registerBackgroundSync(registration);
  } catch (error) {
    console.warn("ClearPlan service worker registration failed", error);
  }
}

async function registerBackgroundSync(registration?: ServiceWorkerRegistration) {
  const serviceWorkerRegistration = registration ?? (await navigator.serviceWorker?.ready);
  const syncManager = serviceWorkerRegistration && "sync" in serviceWorkerRegistration ? serviceWorkerRegistration.sync : null;

  try {
    await syncManager?.register("clearplan-sync-queue");
  } catch {
    // Background Sync is optional and unavailable in several iOS/WebKit contexts.
  }
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}
