import { useTranslation } from 'react-i18next';
import AddPanel from './AddPanel';
import AssetsDrawer from './AssetsDrawer';

export default function LeftRail() {
  const { t } = useTranslation();
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50/60">
      <div className="border-b border-slate-200">
        <AddPanel />
      </div>
      <div className="border-b border-slate-200 px-3 pt-3">
        <p className="label">{t('assets.title')}</p>
      </div>
      <div className="min-h-0 flex-1">
        <AssetsDrawer />
      </div>
    </aside>
  );
}
