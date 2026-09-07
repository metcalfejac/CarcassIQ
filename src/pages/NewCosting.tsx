import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { calculateCosting, getMarginStatus } from '../lib/calculations';
import { formatGBP, formatPct, formatKg } from '../lib/format';
import MarginBadge from '../components/MarginBadge';

interface FormState {
  productName: string;
  supplier: string;
  purchaseWeightKg: string;
  purchasePricePerKg: string;
  saleableWeightKg: string;
  trimWeightKg: string;
  trimValuePerKg: string;
  wasteWeightKg: string;
  sellingPricePerKg: string;
  /** Whole percent, e.g. "30" */
  targetMarginPct: string;
}

const emptyForm: FormState = {
  productName: '',
  supplier: '',
  purchaseWeightKg: '',
  purchasePricePerKg: '',
  saleableWeightKg: '',
  trimWeightKg: '',
  trimValuePerKg: '',
  wasteWeightKg: '',
  sellingPricePerKg: '',
  targetMarginPct: '30',
};

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

const inputClasses =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600';

export default function NewCosting() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const duplicateId = searchParams.get('duplicate');
  const sourceId = editId ?? duplicateId;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loadingSource, setLoadingSource] = useState(!!sourceId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceId) return;
    setLoadingSource(true);
    supabase
      .from('costings')
      .select('*')
      .eq('id', sourceId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data) {
          setError('Could not load that costing.');
        } else {
          setForm({
            productName: data.product_name ?? '',
            supplier: data.supplier ?? '',
            purchaseWeightKg: String(data.purchase_weight_kg ?? ''),
            purchasePricePerKg: String(data.purchase_price_per_kg ?? ''),
            saleableWeightKg: String(data.saleable_weight_kg ?? ''),
            trimWeightKg: String(data.trim_weight_kg ?? ''),
            trimValuePerKg: String(data.trim_value_per_kg ?? ''),
            wasteWeightKg: String(data.waste_weight_kg ?? ''),
            sellingPricePerKg: String(data.selling_price_per_kg ?? ''),
            targetMarginPct: String((data.target_margin_pct ?? 0) * 100),
          });
        }
        setLoadingSource(false);
      });
  }, [sourceId]);

  const results = useMemo(
    () =>
      calculateCosting({
        purchaseWeightKg: num(form.purchaseWeightKg),
        purchasePricePerKg: num(form.purchasePricePerKg),
        saleableWeightKg: num(form.saleableWeightKg),
        trimWeightKg: num(form.trimWeightKg),
        trimValuePerKg: num(form.trimValuePerKg),
        wasteWeightKg: num(form.wasteWeightKg),
        sellingPricePerKg: num(form.sellingPricePerKg),
        targetMarginPct: num(form.targetMarginPct) / 100,
      }),
    [form]
  );

  const marginStatus = getMarginStatus(results.grossMarginPct, num(form.targetMarginPct) / 100);
  const hasEnoughInput = num(form.purchaseWeightKg) > 0 && num(form.saleableWeightKg) > 0;

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    setError(null);

    const payload = {
      user_id: session.user.id,
      product_name: form.productName,
      supplier: form.supplier,
      purchase_weight_kg: num(form.purchaseWeightKg),
      purchase_price_per_kg: num(form.purchasePricePerKg),
      saleable_weight_kg: num(form.saleableWeightKg),
      trim_weight_kg: num(form.trimWeightKg),
      trim_value_per_kg: num(form.trimValuePerKg),
      waste_weight_kg: num(form.wasteWeightKg),
      selling_price_per_kg: num(form.sellingPricePerKg),
      target_margin_pct: num(form.targetMarginPct) / 100,
    };

    const query = editId
      ? supabase.from('costings').update(payload).eq('id', editId)
      : supabase.from('costings').insert(payload);

    const { error: saveError } = await query;
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    navigate('/saved');
  }

  if (loadingSource) {
    return <p className="text-slate-500">Loading...</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{editId ? 'Edit costing' : 'New costing'}</h1>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Product name" className="col-span-2">
            <input
              required
              value={form.productName}
              onChange={(e) => update('productName', e.target.value)}
              placeholder="e.g. Sirloin"
              className={inputClasses}
            />
          </Field>
          <Field label="Supplier" className="col-span-2">
            <input
              required
              value={form.supplier}
              onChange={(e) => update('supplier', e.target.value)}
              placeholder="e.g. Green Farm Meats"
              className={inputClasses}
            />
          </Field>

          <Field label="Purchase weight (kg)">
            <NumberInput value={form.purchaseWeightKg} onChange={(v) => update('purchaseWeightKg', v)} />
          </Field>
          <Field label="Purchase price (£/kg)">
            <NumberInput value={form.purchasePricePerKg} onChange={(v) => update('purchasePricePerKg', v)} />
          </Field>

          <Field label="Saleable meat weight (kg)">
            <NumberInput value={form.saleableWeightKg} onChange={(v) => update('saleableWeightKg', v)} />
          </Field>
          <Field label="Recoverable trim weight (kg)">
            <NumberInput value={form.trimWeightKg} onChange={(v) => update('trimWeightKg', v)} />
          </Field>

          <Field label="Trim value (£/kg)">
            <NumberInput value={form.trimValuePerKg} onChange={(v) => update('trimValuePerKg', v)} />
          </Field>
          <Field label="Waste weight (kg)">
            <NumberInput value={form.wasteWeightKg} onChange={(v) => update('wasteWeightKg', v)} />
          </Field>

          <Field label="Current selling price (£/kg)">
            <NumberInput value={form.sellingPricePerKg} onChange={(v) => update('sellingPricePerKg', v)} />
          </Field>
          <Field label="Target gross margin (%)">
            <NumberInput value={form.targetMarginPct} onChange={(v) => update('targetMarginPct', v)} />
          </Field>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : editId ? 'Save changes' : 'Save costing'}
        </button>
      </form>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Results</h2>
            {hasEnoughInput && <MarginBadge status={marginStatus} />}
          </div>

          {!hasEnoughInput ? (
            <p className="mt-4 text-sm text-slate-500">
              Enter purchase weight and saleable weight to see live results.
            </p>
          ) : (
            <dl className="mt-4 space-y-3">
              <Result label="Total purchase cost" value={formatGBP(results.totalPurchaseCost)} />
              <Result label="Saleable yield" value={formatPct(results.saleableYieldPct)} />
              <Result
                label="True usable cost/kg"
                value={formatGBP(results.trueUsableCostPerKg)}
                sub="Before trim credit"
              />
              <Result
                label="Adjusted usable cost/kg"
                value={formatGBP(results.adjustedUsableCostPerKg)}
                sub="After trim recovery — your real cost"
                highlight
              />
              <Result label="Trim recovery value" value={formatGBP(results.trimRecoveryValue)} />
              <Result label="Projected revenue" value={formatGBP(results.projectedRevenue)} />
              <Result label="Gross profit" value={formatGBP(results.grossProfit)} />
              <Result label="Gross margin" value={formatPct(results.grossMarginPct)} highlight />
              <Result
                label="Required selling price for target margin"
                value={`${formatGBP(results.requiredSellingPricePerKg)}/kg`}
                highlight
              />
            </dl>
          )}
        </div>

        {hasEnoughInput && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm">
            Purchase {formatKg(num(form.purchaseWeightKg))} → saleable {formatKg(num(form.saleableWeightKg))}, trim{' '}
            {formatKg(num(form.trimWeightKg))}, waste {formatKg(num(form.wasteWeightKg))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NumberInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClasses}
    />
  );
}

function Result({
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
