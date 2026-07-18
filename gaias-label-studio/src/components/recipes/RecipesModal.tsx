import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { IngredientManager } from "./IngredientManager";
import { RecipeManager } from "./RecipeManager";

export function RecipesModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"ingredients" | "recipes">("ingredients");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-brand-800">{t("recipes.heading")}</h2>
            <p className="text-sm text-brand-500">{t("recipes.subheading")}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-brand-500 hover:bg-brand-50">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4">
          <button
            onClick={() => setTab("ingredients")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === "ingredients" ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"}`}
          >
            {t("recipes.ingredientsTab")}
          </button>
          <button
            onClick={() => setTab("recipes")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === "recipes" ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"}`}
          >
            {t("recipes.recipesTab")}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "ingredients" ? <IngredientManager /> : <RecipeManager />}
        </div>
      </div>
    </div>
  );
}
