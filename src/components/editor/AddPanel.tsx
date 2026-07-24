import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Circle, Heading, Minus, QrCode, Square, Triangle, Type, Wand2 } from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import AutoLayoutPicker from './AutoLayoutPicker';
import QrCodeModal from './QrCodeModal';

export default function AddPanel() {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const tile =
    'flex flex-col items-center justify-center gap-1 rounded-xl bg-white px-2 py-3 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-gaia-50 hover:ring-gaia-300';

  return (
    <div className="space-y-3 p-3">
      <div>
        <p className="label">{t('add.text')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button className={tile} onClick={() => editor.addText('heading')}>
            <Heading className="h-5 w-5 text-gaia-600" />
            {t('add.heading')}
          </button>
          <button className={tile} onClick={() => editor.addText('body')}>
            <Type className="h-5 w-5 text-gaia-600" />
            {t('add.body')}
          </button>
        </div>
      </div>

      <div>
        <p className="label">{t('add.shapes')}</p>
        <div className="grid grid-cols-4 gap-2">
          <button className={tile} title={t('add.rect')} onClick={() => editor.addShape('rect')}>
            <Square className="h-5 w-5 text-gaia-600" />
          </button>
          <button className={tile} title={t('add.circle')} onClick={() => editor.addShape('circle')}>
            <Circle className="h-5 w-5 text-gaia-600" />
          </button>
          <button className={tile} title={t('add.triangle')} onClick={() => editor.addShape('triangle')}>
            <Triangle className="h-5 w-5 text-gaia-600" />
          </button>
          <button className={tile} title={t('add.line')} onClick={() => editor.addShape('line')}>
            <Minus className="h-5 w-5 text-gaia-600" />
          </button>
        </div>
      </div>

      {/* QR code — useful for linking ingredient lists, websites, etc. */}
      <div>
        <p className="label">{t('add.extras', 'Extras')}</p>
        <button className={`${tile} w-full flex-row justify-start gap-2 px-3 py-2.5`} onClick={() => setQrOpen(true)}>
          <QrCode className="h-4 w-4 text-gaia-600 shrink-0" />
          <span className="text-left">
            {t('add.qrCode', 'QR Code')}
            <span className="ml-1.5 text-[10px] font-normal text-slate-400">{t('add.qrHint', '— link to a website or ingredients page')}</span>
          </span>
        </button>
      </div>

      <button className="btn-primary w-full" onClick={() => setPickerOpen(true)}>
        <Wand2 className="h-4 w-4" /> {t('add.autoLayout')}
      </button>
      <p className="text-[11px] text-slate-400">{t('add.autoLayoutHint')}</p>

      <AutoLayoutPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      <QrCodeModal open={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}
