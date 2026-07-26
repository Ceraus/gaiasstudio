import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Ingredient, Recipe } from '@/types';
import { getRecipeColor } from '@/lib/recipeColors';

interface RecipePickerProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  value: string | null;
  onChange: (recipeId: string | null) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

export default function RecipePicker({
  recipes,
  ingredients,
  value,
  onChange,
  placeholder = '— Choose a recipe —',
  className = '',
  'aria-label': ariaLabel = 'Recipe',
}: RecipePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [recipes],
  );

  const selected = sorted.find((r) => r.id === value) ?? null;
  const selectedTheme = selected ? getRecipeColor(selected, ingredients) : null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-gaia-500 ${
          selectedTheme
            ? `${selectedTheme.bg} ${selectedTheme.border} ${selectedTheme.text}`
            : 'border-gray-200 bg-white text-gray-800'
        }`}
      >
        {selectedTheme && (
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/80 ${selectedTheme.dot}`} />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">
          {selected?.name ?? placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 opacity-60 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          <li role="option" aria-selected={!value}>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-200" />
              {placeholder}
            </button>
          </li>
          {sorted.map((recipe) => {
            const theme = getRecipeColor(recipe, ingredients);
            const isSelected = recipe.id === value;
            return (
              <li key={recipe.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${theme.bg} ${theme.text} ${
                    isSelected ? `${theme.activeBg} font-semibold ring-1 ring-inset ${theme.activeBorder}` : 'hover:brightness-95'
                  }`}
                  onClick={() => {
                    onChange(recipe.id);
                    setOpen(false);
                  }}
                >
                  <span className={`h-3 w-3 shrink-0 rounded-full ring-1 ring-white/70 ${theme.dot}`} />
                  <span className="truncate">{recipe.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
