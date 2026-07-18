import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Leaf, Settings as SettingsIcon } from "lucide-react";
import { StepIndicator } from "./components/layout/StepIndicator";
import { TemplatePicker } from "./components/step1-template/TemplatePicker";
import { Step2Page } from "./components/step2-assets/Step2Page";
import { AdvancedEditor } from "./components/step3-editor/AdvancedEditor";
import { PrintExport } from "./components/step4-print/PrintExport";
import { RecipesModal } from "./components/recipes/RecipesModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { useAppStore } from "./state/useAppStore";
import { api } from "./lib/api";

export default function App() {
  const { t, i18n } = useTranslation();
  const step = useAppStore((s) => s.step);
  const [showRecipes, setShowRecipes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    api.settings.get().then((s) => i18n.changeLanguage(s.language));
  }, [i18n]);

  return (
    <div className="flex h-screen flex-col bg-canvasgray">
      <header className="flex items-center justify-between border-b border-brand-100 bg-white px-6 py-3">
        <div className="flex items-center gap-2 text-brand-800">
          <Leaf size={20} className="text-brand-600" />
          <span className="text-lg font-bold">{t("app.title")}</span>
        </div>

        <StepIndicator />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRecipes(true)}
            className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            {t("nav.recipes")}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            <SettingsIcon size={14} /> {t("nav.settings")}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {step === "template" && (
          <div className="h-full overflow-y-auto">
            <TemplatePicker />
          </div>
        )}
        {step === "assets" && (
          <div className="h-full overflow-y-auto">
            <Step2Page />
          </div>
        )}
        {step === "editor" && <AdvancedEditor />}
        {step === "print" && (
          <div className="h-full overflow-y-auto">
            <PrintExport />
          </div>
        )}
      </main>

      {showRecipes && <RecipesModal onClose={() => setShowRecipes(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
