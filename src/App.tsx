import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Leaf } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Shell from '@/components/Shell';

export default function App() {
  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const loadSettings = useAppStore((s) => s.loadSettings);
  const uiScale = useAppStore((s) => s.settings.uiScale);
  const { t } = useTranslation();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // Accessibility: scale the whole UI by adjusting the root font size (rem base).
  // Everything Tailwind-sized scales with it; the Fabric canvas is pixel-sized
  // from its container in JS, so it stays crisp and simply re-fits.
  useEffect(() => {
    const scale = Math.min(1.5, Math.max(1, uiScale ?? 1));
    document.documentElement.style.fontSize = `${16 * scale}px`;
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [uiScale]);

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
