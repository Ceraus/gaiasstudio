import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AiSuggestFlairButton } from '@/components/common/AiSuggestFlair';
import AutoResizeTextarea from '@/components/common/AutoResizeTextarea';
import { BILINGUAL_FIELD } from '@/lib/bilingualUi';

export interface RecipeBenefitCopySectionProps {
  benefit: string;
  benefitEn: string;
  benefitEs: string;
  onBenefitEnChange: (value: string) => void;
  onBenefitEsChange: (value: string) => void;
  suggesting: boolean;
  disabled?: boolean;
  hasIngredients: boolean;
  onSuggest: () => void;
  suggestTitle?: string;
  className?: string;
  /** Saved recipe selected — green→purple frame. Empty / new / unselected — grey. */
  hasRecipe?: boolean;
  /** Extra content after the bilingual fields (errors, suggestion preview). */
  children?: ReactNode;
}

/** Shared AI benefit block: Suggest-another pill and EN/ES textareas. */
export default function RecipeBenefitCopySection({
  benefit,
  benefitEn,
  benefitEs,
  onBenefitEnChange,
  onBenefitEsChange,
  suggesting,
  disabled = false,
  hasIngredients,
  onSuggest,
  suggestTitle,
  className,
  hasRecipe = false,
  children,
}: RecipeBenefitCopySectionProps) {
  const { t } = useTranslation();
  const hasCopy = Boolean(benefitEn.trim() || benefitEs.trim() || benefit.trim());
  const needsIngredients = t(
    'recipes.benefitSuggestNeedsIngredients',
    'Add ingredients first so there is something to suggest from.',
  );
  const drafting = t('recipes.benefitSuggesting', 'Drafting…');

  return (
    <div className={className} data-recipe-benefit-copy="">
      {/* Negative mx grows the stroke into the parent card padding so the white
          inset does not shrink the Suggest pill or EN/ES boxes. * 0.85 * 0.80 * 0.90
          pulls that outward bleed in 15%, then 20%, then another 10%.
          my-[2.2%] is the prior 2% vertical inset plus 10% more inward.
          White-card p-[4%] is the inset from the gradient stroke to the content. */}
      <div
        className={`mx-[calc(-0.75rem*0.85*0.80*0.90)] my-[2.2%] rounded-xl p-[calc(8px*2/3*0.85)] ${
          hasRecipe
            ? 'bg-gradient-to-r from-gaia-600 to-violet-600'
            : 'bg-gaia-100'
        }`}
      >
        <div className="flex flex-col gap-1 rounded-[calc(12px-8px*2/3*0.85)] bg-white p-[4%]">
          <p className="label mb-0 text-center">
            {t('recipes.benefitStatement', 'Benefit Statement')}
          </p>
          <div>
            <div className="pb-[3%]">
              <AiSuggestFlairButton
                suggesting={suggesting}
                disabled={disabled || !hasIngredients}
                idleLabel={
                  hasCopy
                    ? t('recipes.benefitSuggestAnother', 'Suggest Another Benefit')
                    : t('recipes.benefitSuggest', 'AI Suggest Benefit')
                }
                busyLabel={drafting}
                title={suggestTitle ?? (hasIngredients
                  ? (hasCopy
                    ? t('recipes.benefitSuggestAnotherTooltip', 'Draft another wording — earlier suggestions stay so you can compare.')
                    : t('recipes.benefitSuggestTooltip', 'Draft a benefit statement with local AI — you can edit or reject it.'))
                  : needsIngredients)}
                onClick={onSuggest}
              />
            </div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              <div className={BILINGUAL_FIELD.en.wrap}>
                <label className={`label text-[10px] ${BILINGUAL_FIELD.en.label}`}>{t('recipes.benefitEn', 'Benefit (English)')}</label>
                <AutoResizeTextarea
                  className={`input text-sm ${BILINGUAL_FIELD.en.input}`}
                  data-recipe-benefit-en=""
                  value={benefitEn}
                  onChange={(event) => onBenefitEnChange(event.target.value)}
                  placeholder={t('recipes.benefitEnPlaceholder', 'Moisturizing shea and calming lavender…')}
                />
              </div>
              <div className={BILINGUAL_FIELD.es.wrap}>
                <label className={`label text-[10px] ${BILINGUAL_FIELD.es.label}`}>{t('recipes.benefitEs', 'Benefit (Español)')}</label>
                <AutoResizeTextarea
                  className={`input text-sm ${BILINGUAL_FIELD.es.input}`}
                  data-recipe-benefit-es=""
                  value={benefitEs}
                  onChange={(event) => onBenefitEsChange(event.target.value)}
                  placeholder={t('recipes.benefitEsPlaceholder', 'Karité hidratante y lavanda calmante…')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
