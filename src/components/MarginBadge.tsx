import type { MarginStatus } from '../lib/calculations';

const styles: Record<MarginStatus, { label: string; classes: string }> = {
  above: { label: 'On target', classes: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  close: { label: 'Close to target', classes: 'bg-amber-100 text-amber-800 border-amber-300' },
  below: { label: 'Below target', classes: 'bg-red-100 text-red-800 border-red-300' },
};

export default function MarginBadge({ status }: { status: MarginStatus }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${s.classes}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
