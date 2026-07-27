import { useTranslation } from 'react-i18next';
import {
  Beaker,
  Circle,
  FlaskConical,
  Image,
  Menu,
  Pencil,
} from 'lucide-react';
import type { Screen } from '@/store/useAppStore';

const WORKFLOW_TABS: Array<{
  id: Screen;
  labelKey: string;
  defaultLabel: string;
  icon: typeof Circle;
}> = [
  { id: 'template', labelKey: 'mobileNav.shape', defaultLabel: 'Shape', icon: Circle },
  { id: 'ingredients', labelKey: 'mobileNav.ingredients', defaultLabel: 'Ingredients', icon: Beaker },
  { id: 'recipes', labelKey: 'mobileNav.recipe', defaultLabel: 'Recipe', icon: FlaskConical },
  { id: 'background', labelKey: 'mobileNav.background', defaultLabel: 'Background', icon: Image },
  { id: 'editor', labelKey: 'mobileNav.design', defaultLabel: 'Design', icon: Pencil },
];

interface MobileWorkflowTabsProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onMenuOpen: () => void;
  menuActive?: boolean;
}

export default function MobileWorkflowTabs({
  screen,
  onNavigate,
  onMenuOpen,
  menuActive,
}: MobileWorkflowTabsProps) {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom"
      aria-label={t('mobileNav.workflow', 'Label workflow')}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {WORKFLOW_TABS.map(({ id, labelKey, defaultLabel, icon: Icon }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition ${
                active ? 'text-gaia-700' : 'text-slate-500'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-gaia-600' : ''}`} />
              <span className="truncate">{t(labelKey, defaultLabel)}</span>
              {active && <span className="h-0.5 w-6 rounded-full bg-gaia-600" />}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onMenuOpen}
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition ${
            menuActive ? 'text-gaia-700' : 'text-slate-500'
          }`}
        >
          <Menu className={`h-5 w-5 ${menuActive ? 'text-gaia-600' : ''}`} />
          <span>{t('mobileNav.menu', 'Menu')}</span>
          {menuActive && <span className="h-0.5 w-6 rounded-full bg-gaia-600" />}
        </button>
      </div>
    </nav>
  );
}
