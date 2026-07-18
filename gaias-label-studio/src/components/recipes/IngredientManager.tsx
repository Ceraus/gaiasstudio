import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Leaf } from "lucide-react";
import { api } from "../../lib/api";
import type { Ingredient } from "../../../shared/contract";

const emptyForm = { name: "", benefit: "", isSoapBase: false };

export function IngredientManager() {
  const { t } = useTranslation();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const refresh = () => api.ingredients.list().then(setIngredients);
  useEffect(() => {
    refresh();
  }, []);

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setForm({ name: ing.name, benefit: ing.benefit, isSoapBase: ing.isSoapBase });
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    await api.ingredients.upsert({ id: editingId ?? undefined, ...form });
    cancel();
    refresh();
  };

  const remove = async (id: number) => {
    if (!confirm(t("recipes.confirmDelete"))) return;
    await api.ingredients.delete(id);
    refresh();
  };

  return (
    <div>
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-brand-600">{t("recipes.ingredientName")}</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="e.g. Shea Butter"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-600">{t("recipes.ingredientBenefit")}</label>
            <input
              value={form.benefit}
              onChange={(e) => setForm((f) => ({ ...f, benefit: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="e.g. Deeply moisturizing"
            />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-brand-700">
          <input
            type="checkbox"
            checked={form.isSoapBase}
            onChange={(e) => setForm((f) => ({ ...f, isSoapBase: e.target.checked }))}
          />
          {t("recipes.ingredientSoapBase")}
        </label>
        <div className="mt-3 flex gap-2">
          <button onClick={save} className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus size={14} /> {editingId ? t("recipes.save") : t("recipes.newIngredient")}
          </button>
          {editingId && (
            <button onClick={cancel} className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700">
              {t("recipes.cancel")}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {ingredients.length === 0 && <p className="text-sm text-brand-500">{t("recipes.ingredientsEmpty")}</p>}
        {ingredients.map((ing) => (
          <div key={ing.id} className="flex items-center justify-between rounded-xl border border-brand-100 bg-white px-4 py-3">
            <div>
              <div className="flex items-center gap-2 font-semibold text-brand-800">
                {ing.isSoapBase && <Leaf size={14} className="text-brand-500" />}
                {ing.name}
              </div>
              <div className="text-xs text-brand-500">{ing.benefit}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(ing)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50">
                <Pencil size={14} />
              </button>
              <button onClick={() => remove(ing.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
