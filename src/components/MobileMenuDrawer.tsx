import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  ClipboardList,
  FileStack,
  Package,
  Printer,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import type { Screen } from '@/store/useAppStore';

const MENU_ITEMS: Array<{
  id: Screen;
  labelKey: string;
  defaultLabel: string;
  icon: typeof Printer;
  highlight?: boolean;
}> = [
  { id: 'export', labelKey: 'mobileMenu.print', defaultLabel: 'Print & Export', icon: Printer, highlight: true },
  { id: 'inventory', labelKey: 'nav.inventory', defaultLabel: 'Inventory', icon: Package },
  { id: 'ingredients', labelKey: 'nav.ingredients', defaultLabel: 'Ingredients', icon: Package },
  { id: 'products', labelKey: 'nav.products', defaultLabel: 'Products', icon: ShoppingBag },
  { id: 'shop', labelKey: 'nav.shop', defaultLabel: 'Etsy Shop', icon: Store },
  { id: 'drafts', labelKey: 'nav.workspace', defaultLabel: 'Workspace', icon: FileStack },
  { id: 'promptBuilder', labelKey: 'nav.promptBuilder', defaultLabel: 'AI Prompt', icon: Sparkles },
  { id: 'orders', labelKey: 'nav.orders', defaultLabel: 'Orders', icon: ClipboardList },
  { id: 'finances', labelKey: 'nav.finances', defaultLabel: 'Finances', icon: Receipt },
  { id: 'reports', labelKey: 'nav.reports', defaultLabel: 'Reports', icon: BarChart3 },
  { id: 'settings', labelKey: 'nav.settings', defaultLabel: 'Settings', icon: Settings },
];

interface MobileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  currentScreen: Screen;
  trainingMode?: boolean;
}

const TRAINING_MENU_IDS: Screen[] = ['export', 'drafts', 'settings'];

export default function MobileMenuDrawer({
  open,
  onClose,
  onNavigate,
  currentScreen,
  trainingMode = false,
}: MobileMenuDrawerProps) {
  const { t } = useTranslation();

  const items = trainingMode
    ? MENU_ITEMS.filter((item) => TRAINING_MENU_IDS.includes(item.id))
    : MENU_ITEMS;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label={t('common.close', 'Close')}
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-2xl bg-white shadow-panel safe-bottom">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-800">{t('mobileMenu.title', 'More')}</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="overflow-y-auto pb-4">
          {items.map(({ id, labelKey, defaultLabel, icon: Icon, highlight }) => {
            const active = currentScreen === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                    active
                      ? 'bg-gaia-50 font-medium text-gaia-800'
                      : highlight
                        ? 'font-medium text-gaia-700 hover:bg-gaia-50'
                        : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    onNavigate(id);
                    onClose();
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(labelKey, defaultLabel)}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
