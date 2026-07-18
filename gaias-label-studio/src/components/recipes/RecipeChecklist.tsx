import { useTranslation } from "react-i18next";
import { Check, AlertTriangle } from "lucide-react";
import type { RecipeValidation } from "../../../shared/contract";

function Row({ ok, label, warnOnly }: { ok: boolean; label: string; warnOnly?: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${ok ? "text-brand-700" : warnOnly ? "text-amber-600" : "text-gray-400"}`}>
      {ok ? <Check size={15} /> : warnOnly ? <AlertTriangle size={15} /> : <Check size={15} className="opacity-30" />}
      {label}
    </div>
  );
}

export function RecipeChecklist({ validation }: { validation: RecipeValidation }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-brand-100 bg-brand-50 p-3">
      <Row ok={validation.hasName} label={t("recipes.checklistName")} />
      <Row ok={validation.hasIngredients} label={t("recipes.checklistIngredients")} />
      <Row ok={validation.hasSoapBase} warnOnly label={t("recipes.checklistSoapBase")} />
      <Row ok={validation.hasBenefit} label={t("recipes.checklistBenefit")} />
    </div>
  );
}

export function computeValidation(input: {
  name: string;
  benefit: string;
  ingredientIds: number[];
  hasSoapBaseIngredient: boolean;
}): RecipeValidation {
  const hasName = input.name.trim().length > 0;
  const hasIngredients = input.ingredientIds.length > 0;
  const hasSoapBase = input.hasSoapBaseIngredient;
  const hasBenefit = input.benefit.trim().length > 0;
  return { hasName, hasIngredients, hasSoapBase, hasBenefit, isComplete: hasName && hasIngredients && hasBenefit };
}
