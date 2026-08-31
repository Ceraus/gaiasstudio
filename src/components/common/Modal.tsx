import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
  /** Grow the dialog when content is short (e.g. a ~2× recipe wizard). */
  minHeight?: number | string;
  centerTitle?: boolean;
  /** Fill the max modal height so nested flex layouts can scroll internally. */
  fullHeight?: boolean;
  /** Drop body padding/scroll so the child owns layout (tabbed choosers). */
  flush?: boolean;
}

/** Topmost open modal owns Escape so nested previews don't close the parent. */
const modalEscapeStack: Array<() => void> = [];

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
  minHeight,
  centerTitle = false,
  fullHeight = false,
  flush = false,
}: Props) {
  const { t } = useTranslation();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const stackDepth = useRef(0);

  useEffect(() => {
    if (!open) return;
    const close = () => onCloseRef.current();
    modalEscapeStack.push(close);
    stackDepth.current = modalEscapeStack.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalEscapeStack[modalEscapeStack.length - 1] !== close) return;
      e.preventDefault();
      close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const idx = modalEscapeStack.lastIndexOf(close);
      if (idx >= 0) modalEscapeStack.splice(idx, 1);
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const zIndex = 200 + Math.max(0, stackDepth.current - 1) * 10;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-panel ${
          fullHeight
            ? 'h-[min(88vh,calc(100dvh-2rem))]'
            : minHeight != null
              ? 'max-h-[min(90vh,calc(100dvh-2rem))]'
              : 'max-h-[min(88vh,calc(100dvh-2rem))]'
        }`}
        style={{ maxWidth: width, minHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className={`relative flex shrink-0 items-center border-b border-slate-100 px-5 py-3 ${centerTitle ? 'justify-center' : 'justify-between'}`}>
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            <button
              className={`icon-btn ${centerTitle ? 'absolute right-5 top-1/2 -translate-y-1/2' : ''}`}
              onClick={onClose}
              aria-label={t('common.close', 'Close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className={flush ? 'min-h-0 flex-1 overflow-hidden' : 'min-h-0 flex-1 overflow-y-auto px-5 py-5'}>
          {children}
        </div>
        {footer && (
          <div
            className="shrink-0 border-t border-slate-100 px-5 pt-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
