import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Leaf } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Shell from '@/components/Shell';

export default function App() {
  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const loadSettings = useAppStore((s) => s.loadSettings);
  const { t } = useTranslation();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  if (!settingsLoaded) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-gaia-50 text-gaia-700">
        <Leaf className="h-10 w-10 animate-pulse" />
        <p className="text-sm">{t('common.loading')}</p>
      </div>
    );
  }

  return <Shell />;
}
