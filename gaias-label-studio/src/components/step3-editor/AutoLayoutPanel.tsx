import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Wand2 } from "lucide-react";
import { api } from "../../lib/api";
import type { Ingredient, LibraryAsset, Recipe } from "../../../shared/contract";
import { useAppStore } from "../../state/useAppStore";
import { useCanvasContext } from "./CanvasContext";
import { applyContextualLayout } from "../../lib/contextualLayouts";

/**
 * One-click, opt-in layout generator. The canvas always starts empty — this
 * panel is how a non-technical user can still get a tailored starting point
 * (matching the Front / Back / Side context chosen in Step 1) built from her
 * own saved recipe and logo, without ever touching a coordinate or a ruler.
 * She can freely move, resize, restyle, or delete anything it creates
 * afterwards — it's just a head start, never a locked template.
 */
export function AutoLayoutPanel() {
  const { t } = useTranslation();
  const { canvas, bump } = useCanvasContext();
  const context = useAppStore((s) => s.context);
  const recipeId = useAppStore((s) => s.recipeId);
  const setRecipeId = useAppStore((s) => s.setRecipeId);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [library, setLibrary] = useState<(LibraryAsset & { dataUrl: string })[]>([]);
  const [logoAssetId, setLogoAssetId] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [footer, setFooter] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.recipes.list().then(setRecipes);
    api.ingredients.list().then(setIngredients);
    api.library.list().then(async (list) => {
      const withData = await Promise.all(list.map(async (a) => ({ ...a, dataUrl: await api.files.readAsDataUrl(a.filePath) })));
      setLibrary(withData);
    });
  }, []);

  const selectedRecipe = recipes.find((r) => r.id === recipeId);
  const selectedLogo = library.find((l) => l.id === logoAssetId);

  const generate = async () => {
    if (!canvas) return;
    setBusy(true);
    try {
      const ingredientNames = (selectedRecipe?.ingredients ?? [])
        .map((ref) => ingredients.find((i) => i.id === ref.ingredientId)?.name)
        .filter(Boolean)
        .join(", ");

      await applyContextualLayout(canvas, context, {
        productName: productName || selectedRecipe?.name || "",
        benefit: selectedRecipe?.benefit || "",
        ingredientsText: ingredientNames,
        directions: selectedRecipe?.directions,
        warnings: selectedRecipe?.warnings,
        netWeight: netWeight || selectedRecipe?.netWeight,
        businessFooter: footer,
        logoDataUrl: selectedLogo?.dataUrl,
      });
      bump();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-3">
      <div className="flex items-center gap-2 text-sm font-bold text-brand-800">
        <Wand2 size={15} /> {t("editor.autoLayout")}
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2">
        <select
          value={recipeId ?? ""}
          onChange={(e) => setRecipeId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-brand-200 px-2 py-1.5 text-xs"
        >
          <option value="">{t("recipes.recipesTab")}…</option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={logoAssetId ?? ""}
          onChange={(e) => setLogoAssetId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-brand-200 px-2 py-1.5 text-xs"
        >
          <option value="">Logo image…</option>
          {library.map((l) => (
            <option key={l.id} value={l.id}>
              {l.fileName}
            </option>
          ))}
        </select>

        <input
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Product name"
          className="rounded-lg border border-brand-200 px-2 py-1.5 text-xs"
        />
        <input
          value={netWeight}
          onChange={(e) => setNetWeight(e.target.value)}
          placeholder="Net weight (e.g. 4 oz / 113 g)"
          className="rounded-lg border border-brand-200 px-2 py-1.5 text-xs"
        />
        <input
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          placeholder="Business footer (e.g. Made by Gaia's Garden, LLC)"
          className="rounded-lg border border-brand-200 px-2 py-1.5 text-xs"
        />

        <button
          onClick={generate}
          disabled={busy || !canvas}
          className="mt-1 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {t("editor.autoLayout")}
        </button>
      </div>
    </div>
  );
}
