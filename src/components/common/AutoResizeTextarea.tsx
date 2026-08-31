import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

/** Textarea that grows with its value and has no manual resize handle. */
export default function AutoResizeTextarea({
  className = '',
  value,
  onChange,
  rows = 2,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={rows}
      value={value}
      onChange={onChange}
      className={`resize-none overflow-hidden ${className}`}
    />
  );
}
