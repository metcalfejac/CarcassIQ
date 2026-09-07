export function formatGBP(value: number): string {
  if (!Number.isFinite(value)) return '£0.00';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatKg(value: number): string {
  if (!Number.isFinite(value)) return '0 kg';
  return `${value.toFixed(2)} kg`;
}
