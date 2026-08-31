import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore, type Screen } from '@/store/useAppStore';

export default function WorkflowGapBanner() {
  const { t } = useTranslation();
  const gaps = useAppStore((s) => s.workflowGaps);
  const goto = useAppStore((s) => s.goto);
  const screen = useAppStore((s) => s.screen);

  const items: { key: string; text: string; screen: Screen; action: string }[] = [];
  if (gaps.recipe && screen !== 'recipes') {
    items.push({
      key: 'recipe',
      text: t('workflow.gapRecipe', 'No recipe selected — ingredients and benefits won’t appear on the label.'),
      screen: 'recipes',
      action: t('workflow.goToRecipe', 'Choose Recipe'),
    });
  }
  if (gaps.recipeIncomplete && screen !== 'recipes') {
    items.push({
      key: 'recipeIncomplete',
      text: t('workflow.gapRecipeIncomplete', 'The selected recipe is missing a name or ingredients.'),
      screen: 'recipes',
      action: t('workflow.goToRecipe', 'Choose Recipe'),
    });
  }
  if (gaps.background && screen !== 'background') {
    items.push({
      key: 'background',
      text: t('workflow.gapBackground', 'No background chosen — the label will print on a blank canvas.'),
      screen: 'background',
      action: t('workflow.goToBackground', 'Choose Background'),
    });
  }

  if (items.length === 0) return null;

  return (
    <div
      role="status"
      className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {t('workflow.gapBannerTitle', 'Something was skipped')}
          </p>
          <ul className="mt-1 space-y-1.5">
            {items.map((item) => (
              <li key={item.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-amber-800">
                <span>{item.text}</span>
                <button
                  type="button"
                  className="font-semibold text-amber-900 underline decoration-amber-400 underline-offset-2 hover:text-amber-950"
                  onClick={() => goto(item.screen)}
                >
                  {item.action}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
