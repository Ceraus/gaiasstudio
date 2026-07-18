import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import type { Ingredient, Recipe } from "../../../shared/contract";
import { RecipeChecklist, computeValidation } from "./RecipeChecklist";

const emptyForm = {
  name: "",
  benefit: "",
  directions: "",
  warnings: "",
  netWeight: "",
  ingredientIds: [] as number[],
};

export function RecipeManager() {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const refresh = () => {
    api.recipes.list().then(setRecipes);
    api.ingredients.list().then(setIngredients);
  };
  useEffect(() => {
    refresh();
  }, []);

  const startEdit = (r: Recipe) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      benefit: r.benefit,
      directions: r.directions ?? "",
      warnings: r.warnings ?? "",
      netWeight: r.netWeight ?? "",
      ingredientIds: r.ingredients.map((i) => i.ingredientId),
    });
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const toggleIngredient = (id: number) => {
    setForm((f) => ({
      ...f,
      ingredientIds: f.ingredientIds.includes(id) ? f.ingredientIds.filter((i) => i !== id) : [...f.ingredientIds, id],
    }));
  };

  const validation = computeValidation({
    name: form.name,
    benefit: form.benefit,
    ingredientIds: form.ingredientIds,
    hasSoapBaseIngredient: form.ingredientIds.some((id) => ingredients.find((i) => i.id === id)?.isSoapBase),
  });

  const save = async () => {
    if (!form.name.trim()) return;
    await api.recipes.upsert({
      id: editingId ?? undefined,
      name: form.name,
      benefit: form.benefit,
      directions: form.directions,
      warnings: form.warnings,
      netWeight: form.netWeight,
      ingredients: form.ingredientIds.map((id) => ({ ingredientId: id })),
    });
    cancel();
    refresh();
  };

  const remove = async (id: number) => {
    if (!confirm(t("recipes.confirmDelete"))) return;
    await api.recipes.delete(id);
    refresh();
  };

  return (
    <div>
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-brand-600">{t("recipes.recipeName")}</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-600">{t("recipes.recipeBenefit")}</label>
            <input
              value={form.benefit}
              onChange={(e) => setForm((f) => ({ ...f, benefit: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-600">{t("recipes.recipeNetWeight")}</label>
            <input
              value={form.netWeight}
              onChange={(e) => setForm((f) => ({ ...f, netWeight: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs font-semibold text-brand-600">{t("recipes.recipeIngredients")}</label>
          <div className="mt-1 flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border border-brand-200 bg-white p-2">
            {ingredients.length === 0 && <span className="text-xs text-brand-400">{t("recipes.ingredientsEmpty")}</span>}
            {ingredients.map((ing) => (
              <button
                key={ing.id}
                onClick={() => toggleIngredient(ing.id)}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  form.ingredientIds.includes(ing.id) ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100",
                ].join(" ")}
              >
                {ing.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-brand-600">{t("recipes.recipeDirections")}</label>
            <textarea
              value={form.directions}
              onChange={(e) => setForm((f) => ({ ...f, directions: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-600">{t("recipes.recipeWarnings")}</label>
            <textarea
              value={form.warnings}
              onChange={(e) => setForm((f) => ({ ...f, warnings: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
        </div>

        <div className="mt-3">
          <RecipeChecklist validation={validation} />
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={save} className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus size={14} /> {editingId ? t("recipes.save") : t("recipes.newRecipe")}
          </button>
          {editingId && (
            <button onClick={cancel} className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700">
              {t("recipes.cancel")}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {recipes.length === 0 && <p className="text-sm text-brand-500">{t("recipes.recipesEmpty")}</p>}
        {recipes.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-brand-100 bg-white px-4 py-3">
            <div>
              <div className="font-semibold text-brand-800">{r.name}</div>
              <div className="text-xs text-brand-500">{r.benefit}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(r)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50">
                <Pencil size={14} />
              </button>
              <button onClick={() => remove(r.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
