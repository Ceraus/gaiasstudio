import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, isElectron } from "../../lib/api";

export function AiTab({ onUse }: { onUse: (dataUrl: string) => void }) {
  const { t } = useTranslation();
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = api.ai.onDownloadSaved((payload) => {
      setSavedNotice(payload.fileName);
      api.files.readAsDataUrl(payload.filePath).then((dataUrl) => onUse(dataUrl));
      setTimeout(() => setSavedNotice(null), 4000);
    });
    return unsubscribe;
  }, [onUse]);

  if (!isElectron) {
    return (
      <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50 p-6 text-sm text-brand-700">
        The embedded AI Studio browser is only available in the desktop app. Open{" "}
        <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="underline">
          aistudio.google.com
        </a>{" "}
        in a regular browser tab, then use "My Photos" to import anything you save.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 text-xs text-brand-600">{t("assets.aiIntro")}</p>
      {savedNotice && (
        <div className="mb-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white">
          Saved "{savedNotice}" to your Library →
        </div>
      )}
      <webview
        src="https://aistudio.google.com"
        partition="persist:ai-studio"
        allowpopups
        style={{ flex: 1, minHeight: 420, borderRadius: 12, border: "1px solid #c6d9cb" }}
      />
      <p className="mt-2 text-[11px] text-brand-400">{t("assets.aiNoKeyHint")}</p>
    </div>
  );
}
