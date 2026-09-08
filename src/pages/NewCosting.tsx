import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { calculateCosting, getMarginStatus, summarizeCarcass } from '../lib/calculations';
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

interface CarcassMetaState {
  carcassName: string;
  supplier: string;
  deadweightKg: string;
  pricePerKg: string;
  targetMarginPct: string;
}

const emptyCarcassMeta: CarcassMetaState = {
  carcassName: '',
  supplier: '',
  deadweightKg: '',
  pricePerKg: '',
  targetMarginPct: '30',
};

interface CutFormState {
  key: string;
  dbId?: string;
  cutName: string;
  saleableWeightKg: string;
  trimWeightKg: string;
  trimValuePerKg: string;
  wasteWeightKg: string;
  sellingPricePerKg: string;
}

function newCut(): CutFormState {
  return {
    key: crypto.randomUUID(),
    cutName: '',
    saleableWeightKg: '',
    trimWeightKg: '',
    trimValuePerKg: '',
    wasteWeightKg: '',
    sellingPricePerKg: '',
  };
}

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

  const editGroupIdParam = searchParams.get('carcassGroup');
  const duplicateGroupIdParam = searchParams.get('duplicateCarcassGroup');
  const sourceGroupId = editGroupIdParam ?? duplicateGroupIdParam;

  const isDeepLinked = Boolean(sourceId || sourceGroupId);

  const [mode, setMode] = useState<'single' | 'carcass'>(sourceGroupId ? 'carcass' : 'single');
  const [loadingSource, setLoadingSource] = useState(isDeepLinked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Single product state ---
  const [form, setForm] = useState<FormState>(emptyForm);

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
      carcass_group_id: null,
      carcass_product_name: null,
      carcass_deadweight_kg: null,
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

  // --- Whole carcass state ---
  const [carcassMeta, setCarcassMeta] = useState<CarcassMetaState>(emptyCarcassMeta);
  const [cuts, setCuts] = useState<CutFormState[]>([newCut()]);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [originalDbIds, setOriginalDbIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!sourceGroupId) return;
    setLoadingSource(true);
    supabase
      .from('costings')
      .select('*')
      .eq('carcass_group_id', sourceGroupId)
      .order('created_at', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data || data.length === 0) {
          setError('Could not load that carcass costing.');
        } else {
          const first = data[0];
          setCarcassMeta({
            carcassName: first.carcass_product_name ?? '',
            supplier: first.supplier ?? '',
            deadweightKg: String(first.carcass_deadweight_kg ?? ''),
            pricePerKg: String(first.purchase_price_per_kg ?? ''),
            targetMarginPct: String((first.target_margin_pct ?? 0) * 100),
          });
          const isEditing = Boolean(editGroupIdParam);
          setCuts(
            data.map((row) => ({
              key: crypto.randomUUID(),
              dbId: isEditing ? row.id : undefined,
              cutName: row.product_name ?? '',
              saleableWeightKg: String(row.saleable_weight_kg ?? ''),
              trimWeightKg: String(row.trim_weight_kg ?? ''),
              trimValuePerKg: String(row.trim_value_per_kg ?? ''),
              wasteWeightKg: String(row.waste_weight_kg ?? ''),
              sellingPricePerKg: String(row.selling_price_per_kg ?? ''),
            }))
          );
          if (isEditing) {
            setEditGroupId(sourceGroupId);
            setOriginalDbIds(new Set(data.map((row) => row.id)));
          }
        }
        setLoadingSource(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceGroupId]);

  const deadweightKg = num(carcassMeta.deadweightKg);
  const carcassPricePerKg = num(carcassMeta.pricePerKg);
  const targetMarginFraction = num(carcassMeta.targetMarginPct) / 100;

  const carcassResults = useMemo(
    () =>
      summarizeCarcass(
        cuts.map((c) => ({
          cutName: c.cutName,
          saleableWeightKg: num(c.saleableWeightKg),
          trimWeightKg: num(c.trimWeightKg),
          trimValuePerKg: num(c.trimValuePerKg),
          wasteWeightKg: num(c.wasteWeightKg),
          sellingPricePerKg: num(c.sellingPricePerKg),
        })),
        deadweightKg,
        carcassPricePerKg,
        targetMarginFraction
      ),
    [cuts, deadweightKg, carcassPricePerKg, targetMarginFraction]
  );

  function updateCarcassMeta<K extends keyof CarcassMetaState>(key: K, value: string) {
    setCarcassMeta((m) => ({ ...m, [key]: value }));
  }

  function updateCut<K extends keyof CutFormState>(key: string, field: K, value: string) {
    setCuts((prev) => prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)));
  }

  function addCut() {
    setCuts((prev) => [...prev, newCut()]);
  }

  function removeCut(key: string) {
    setCuts((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.key !== key)));
  }

  async function handleCarcassSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    setError(null);

    const groupId = editGroupId ?? crypto.randomUUID();

    const rows = cuts.map((cut) => {
      const saleable = num(cut.saleableWeightKg);
      const trim = num(cut.trimWeightKg);
      const waste = num(cut.wasteWeightKg);
      return {
        dbId: cut.dbId,
        payload: {
          user_id: session.user.id,
          product_name: cut.cutName,
          supplier: carcassMeta.supplier,
          purchase_weight_kg: saleable + trim + waste,
          purchase_price_per_kg: carcassPricePerKg,
          saleable_weight_kg: saleable,
          trim_weight_kg: trim,
          trim_value_per_kg: num(cut.trimValuePerKg),
          waste_weight_kg: waste,
          selling_price_per_kg: num(cut.sellingPricePerKg),
          target_margin_pct: targetMarginFraction,
          carcass_group_id: groupId,
          carcass_product_name: carcassMeta.carcassName,
          carcass_deadweight_kg: deadweightKg,
        },
      };
    });

    for (const row of rows) {
      if (row.dbId) {
        const { error: updateError } = await supabase.from('costings').update(row.payload).eq('id', row.dbId);
        if (updateError) {
          setError(updateError.message);
          setSaving(false);
          return;
        }
      }
    }

    const toInsert = rows.filter((r) => !r.dbId).map((r) => r.payload);
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('costings').insert(toInsert);
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    if (editGroupId) {
      const currentDbIds = new Set(rows.map((r) => r.dbId).filter((id): id is string => Boolean(id)));
      const toDelete = Array.from(originalDbIds).filter((id) => !currentDbIds.has(id));
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase.from('costings').delete().in('id', toDelete);
        if (deleteError) {
          setError(deleteError.message);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(false);
    navigate('/saved');
  }

  if (loadingSource) {
    return <p className="text-slate-500">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      {!isDeepLinked && (
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={
              mode === 'single'
                ? 'rounded-md bg-brand-800 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
            }
          >
            Single product
          </button>
          <button
            type="button"
            onClick={() => setMode('carcass')}
            className={
              mode === 'carcass'
                ? 'rounded-md bg-brand-800 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
            }
          >
            Whole carcass
          </button>
        </div>
      )}

      {mode === 'carcass' ? (
        <form onSubmit={handleCarcassSubmit} className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">
              {editGroupId ? 'Edit whole carcass costing' : 'New whole carcass costing'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter what you paid for the whole animal, then break it into the cuts you got from it.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Carcass name" className="col-span-2">
                <input
                  required
                  value={carcassMeta.carcassName}
                  onChange={(e) => updateCarcassMeta('carcassName', e.target.value)}
                  placeholder="e.g. Whole lamb"
                  className={inputClasses}
                />
              </Field>
              <Field label="Supplier/Batch Code/Tag ID" className="col-span-2">
                <input
                  required
                  value={carcassMeta.supplier}
                  onChange={(e) => updateCarcassMeta('supplier', e.target.value)}
                  placeholder="e.g. Green Farm Meats"
                  className={inputClasses}
                />
              </Field>
              <Field label="Deadweight (kg)">
                <NumberInput
                  value={carcassMeta.deadweightKg}
                  onChange={(v) => updateCarcassMeta('deadweightKg', v)}
                />
              </Field>
              <Field label="Price (£/kg)">
                <NumberInput value={carcassMeta.pricePerKg} onChange={(v) => updateCarcassMeta('pricePerKg', v)} />
              </Field>
              <Field label="Target gross margin (%)" className="col-span-2">
                <NumberInput
                  value={carcassMeta.targetMarginPct}
                  onChange={(v) => updateCarcassMeta('targetMarginPct', v)}
                />
              </Field>
            </div>

            {deadweightKg > 0 && carcassPricePerKg > 0 && (
              <p className="mt-3 text-sm text-slate-500">
                Total carcass cost:{' '}
                <span className="font-semibold text-slate-900">{formatGBP(deadweightKg * carcassPricePerKg)}</span>
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Cuts</h2>
              <button
                type="button"
                onClick={addCut}
                className="rounded-md border border-brand-800 px-3 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-50"
              >
                + Add cut
              </button>
            </div>

            {cuts.map((cut, index) => {
              const cutResult = carcassResults.perCut[index];
              const cutStatus = getMarginStatus(cutResult.grossMarginPct, targetMarginFraction);
              const cutHasInput = num(cut.saleableWeightKg) > 0;

              return (
                <div key={cut.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Cut {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeCut(cut.key)}
                      disabled={cuts.length <= 1}
                      className="text-sm text-red-600 hover:underline disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Cut name" className="col-span-2">
                      <input
                        required
                        value={cut.cutName}
                        onChange={(e) => updateCut(cut.key, 'cutName', e.target.value)}
                        placeholder="e.g. Leg"
                        className={inputClasses}
                      />
                    </Field>
                    <Field label="Saleable weight (kg)">
                      <NumberInput
                        value={cut.saleableWeightKg}
                        onChange={(v) => updateCut(cut.key, 'saleableWeightKg', v)}
                      />
                    </Field>
                    <Field label="Recoverable trim weight (kg)">
                      <NumberInput value={cut.trimWeightKg} onChange={(v) => updateCut(cut.key, 'trimWeightKg', v)} />
                    </Field>
                    <Field label="Trim value (£/kg)">
                      <NumberInput
                        value={cut.trimValuePerKg}
                        onChange={(v) => updateCut(cut.key, 'trimValuePerKg', v)}
                      />
                    </Field>
                    <Field label="Waste weight (kg)">
                      <NumberInput value={cut.wasteWeightKg} onChange={(v) => updateCut(cut.key, 'wasteWeightKg', v)} />
                    </Field>
                    <Field label="Selling price (£/kg)" className="col-span-2">
                      <NumberInput
                        value={cut.sellingPricePerKg}
                        onChange={(v) => updateCut(cut.key, 'sellingPricePerKg', v)}
                      />
                    </Field>
                  </div>

                  {cutHasInput && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                      <span className="text-slate-500">
                        Cut weight {formatKg(cutResult.cutWeightKg)} · Allocated cost {formatGBP(cutResult.adjustedCost)}{' '}
                        ({formatGBP(cutResult.adjustedUsableCostPerKg)}/kg)
                      </span>
                      <MarginBadge status={cutStatus} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Carcass summary</h2>
              {carcassResults.summary.totalRevenue > 0 && (
                <MarginBadge status={getMarginStatus(carcassResults.summary.overallMarginPct, targetMarginFraction)} />
              )}
            </div>
            <dl className="mt-4 space-y-3">
              <Result label="Total carcass cost" value={formatGBP(carcassResults.summary.totalCarcassCost)} />
              <Result
                label="Weight accounted for"
                value={`${formatKg(carcassResults.summary.accountedWeightKg)} of ${formatKg(deadweightKg)}`}
                sub={
                  carcassResults.summary.unaccountedWeightKg > 0.01
                    ? `${formatKg(carcassResults.summary.unaccountedWeightKg)} not yet assigned to a cut`
                    : undefined
                }
              />
              <Result label="Total projected revenue" value={formatGBP(carcassResults.summary.totalRevenue)} />
              <Result label="Total gross profit" value={formatGBP(carcassResults.summary.totalGrossProfit)} />
              <Result label="Overall gross margin" value={formatPct(carcassResults.summary.overallMarginPct)} highlight />
            </dl>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : editGroupId ? 'Save changes' : 'Save carcass costing'}
          </button>
        </form>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
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
              <Field label="Supplier/Batch Code/Tag ID" className="col-span-2">
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
      )}
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
