import { ReactNode, useEffect, useRef, useState } from 'react';

export const inputClasses =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600';

export const compactInputClasses =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600';

/** A small ⓘ that shows a short explanation on tap/click (not hover-only —
 *  this needs to work on a phone with no mouse). Dismisses on blur (e.g.
 *  tabbing to the next field) and on any tap/click outside it — tapping
 *  blank space doesn't blur a button in most browsers, so blur alone isn't
 *  enough to close it. */
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <span ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        // Field wraps everything in a <label>; without this, the browser's
        // default label-click delegation shifts focus to the field's input
        // the instant this button is pressed, which fires onBlur below and
        // closes the tooltip before it's even visible.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        aria-label="More info"
        className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-500 hover:bg-slate-100"
      >
        i
      </button>
      {open && (
        <span className="absolute left-1/2 top-full z-10 mt-1 w-48 max-w-[80vw] -translate-x-1/2 rounded-md bg-slate-800 px-2 py-1.5 text-xs font-normal leading-snug text-white shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

export function Field({
  label,
  tooltip,
  children,
  className = '',
}: {
  label: string;
  tooltip?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      <span className="inline-flex items-center">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  step = 'any',
  required = true,
}: {
  value: string;
  onChange: (v: string) => void;
  step?: number | 'any';
  required?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min="0"
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClasses}
    />
  );
}

export function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      {label}
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

export function CompactNumberInput({
  value,
  onChange,
  required = true,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      min="0"
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={compactInputClasses}
    />
  );
}

export function Result({
  label,
  value,
  sub,
  highlight,
  tooltip,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <div>
        <p className="flex items-center text-sm text-slate-600">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
      <p className={`text-base font-semibold ${highlight ? 'text-brand-800' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
