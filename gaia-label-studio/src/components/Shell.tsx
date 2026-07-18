import { useTranslation } from 'react-i18next';
import { BookOpen, FlaskConical, Leaf, Plus, Settings as SettingsIcon } from 'lucide-react';
import { useAppStore, type Screen } from '@/store/useAppStore';
import WelcomeScreen from '@/components/screens/WelcomeScreen';
import TemplateScreen from '@/components/screens/TemplateScreen';
import EditorScreen from '@/components/screens/EditorScreen';
import ExportScreen from '@/components/screens/ExportScreen';
import RecipesScreen from '@/components/screens/RecipesScreen';
import IngredientsScreen from '@/components/screens/IngredientsScreen';
import SettingsScreen from '@/components/screens/SettingsScreen';

export default function Shell() {
  const screen = useAppStore((s) => s.screen);
  const goto = useAppStore((s) => s.goto);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const { t } = useTranslation();

  const chrome = screen !== 'editor'; // editor manages its own full-screen chrome

  const navItems: { id: Screen; label: string; icon: typeof BookOpen }[] = [
    { id: 'template', label: t('nav.newLabel'), icon: Plus },
    { id: 'recipes', label: t('nav.recipes'), icon: BookOpen },
    { id: 'ingredients', label: t('nav.ingredients'), icon: FlaskConical },
    { id: 'settings', label: t('nav.settings'), icon: SettingsIcon },
  ];

  return (
    <div className="flex h-full flex-col">
      {chrome && (
        <header className="z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur">
          <button
            className="flex items-center gap-2 text-gaia-700"
            onClick={() => goto('welcome')}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gaia-600 text-white">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">{t('app.name')}</span>
          </button>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => goto(item.id)}
                  className={`btn ${
                    item.id === 'template'
                      ? 'btn-primary'
                      : active
                        ? 'bg-gaia-100 text-gaia-700'
                        : 'btn-ghost'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
            <div className="ml-2 flex overflow-hidden rounded-lg ring-1 ring-slate-200">
              {(['en', 'es'] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => void updateSettings({ language: lng })}
                  className={`px-2.5 py-1.5 text-xs font-semibold ${
                    settings.language === lng
                      ? 'bg-gaia-600 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </nav>
        </header>
      )}

      <main className="relative flex-1 overflow-hidden">
        {screen === 'welcome' && <WelcomeScreen />}
        {screen === 'template' && <TemplateScreen />}
        {screen === 'editor' && <EditorScreen />}
        {screen === 'export' && <ExportScreen />}
        {screen === 'recipes' && <RecipesScreen />}
        {screen === 'ingredients' && <IngredientsScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </main>
    </div>
  );
}
