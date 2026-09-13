import { ReactNode } from 'react';

export const inputClasses =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600';

export const compactInputClasses =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600';

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      {label}
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
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <div>
        <p className="text-sm text-slate-600">{label}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
      <p className={`text-base font-semibold ${highlight ? 'text-brand-800' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
