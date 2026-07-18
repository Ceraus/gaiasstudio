import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { api } from "../../lib/api";
import type { AppSettings } from "../../../shared/contract";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings.get().then(setSettings);
  }, []);

  if (!settings) return null;

  const update = (partial: Partial<AppSettings>) => setSettings((s) => (s ? { ...s, ...partial } : s));

  const save = async () => {
    const result = await api.settings.set(settings);
    setSettings(result);
    i18n.changeLanguage(result.language);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-100 px-6 py-4">
          <h2 className="text-lg font-bold text-brand-800">{t("settings.heading")}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-brand-500 hover:bg-brand-50">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className="text-xs font-semibold text-brand-600">{t("settings.language")}</label>
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => update({ language: "en" })}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${settings.language === "en" ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"}`}
              >
                English
              </button>
              <button
                onClick={() => update({ language: "es" })}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${settings.language === "es" ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"}`}
              >
                Español
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-600">{t("settings.filePrefix")}</label>
            <input
              value={settings.filePrefix}
              onChange={(e) => update({ filePrefix: e.target.value })}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-brand-400">{t("settings.filePrefixHint", { example: `${settings.filePrefix || "LABEL"}___01.pdf` })}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-600">{t("settings.googleKey")}</label>
            <input
              type="password"
              value={settings.googleAiStudioApiKey}
              onChange={(e) => update({ googleAiStudioApiKey: e.target.value })}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-600">{t("settings.unsplashKey")}</label>
            <input
              type="password"
              value={settings.unsplashApiKey}
              onChange={(e) => update({ unsplashApiKey: e.target.value })}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-600">{t("settings.pixabayKey")}</label>
            <input
              type="password"
              value={settings.pixabayApiKey}
              onChange={(e) => update({ pixabayApiKey: e.target.value })}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            />
          </div>
          <p className="text-xs text-brand-400">{t("settings.keyHint")}</p>

          <div className="flex items-center gap-3">
            <button onClick={save} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              {t("settings.save")}
            </button>
            {saved && <span className="text-sm font-semibold text-brand-600">{t("settings.saved")}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
