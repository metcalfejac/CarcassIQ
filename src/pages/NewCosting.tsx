import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { aggregateTrimGroups, calculateCosting, getMarginStatus, summarizeCarcass } from '../lib/calculations';
import type { TrimGroup } from '../lib/calculations';
import { formatGBP, formatPct, formatKg } from '../lib/format';
import type { TrimGroupRecord } from '../lib/types';
import MarginBadge from '../components/MarginBadge';
import { CompactField, CompactNumberInput, Field, NumberInput, Result, compactInputClasses, inputClasses } from '../components/FormFields';
import ManufacturedProductForm from './ManufacturedProductForm';
import { useSuggestions } from '../lib/useSuggestions';

interface FormState {
  productName: string;
  supplier: string;
  purchaseWeightKg: string;
  purchasePricePerKg: string;
  saleableWeightKg: string;
  wasteLabel: string;
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
  wasteLabel: '',
  wasteWeightKg: '',
  sellingPricePerKg: '',
  targetMarginPct: '30',
};

interface TrimGroupFormState {
  key: string;
  label: string;
  weightKg: string;
  valuePerKg: string;
}

function newTrimGroup(): TrimGroupFormState {
  return { key: crypto.randomUUID(), label: '', weightKg: '', valuePerKg: '' };
}

function trimGroupsToNumeric(groups: TrimGroupFormState[]): TrimGroup[] {
  return groups.map((g) => ({ weightKg: num(g.weightKg), valuePerKg: num(g.valuePerKg) }));
}

/** Rebuilds the editable trim breakdown from a saved row: uses the stored
 *  groups if present, or falls back to a single group derived from the
 *  aggregate fields (for rows saved before this feature existed). */
function trimGroupsFromRecord(row: {
  trim_groups: TrimGroupRecord[] | null;
  trim_weight_kg: number;
  trim_value_per_kg: number;
}): TrimGroupFormState[] {
  if (row.trim_groups && row.trim_groups.length > 0) {
    return row.trim_groups.map((g) => ({
      key: crypto.randomUUID(),
      label: g.label ?? '',
      weightKg: String(g.weight_kg ?? ''),
      valuePerKg: String(g.value_per_kg ?? ''),
    }));
  }
  return [
    {
      key: crypto.randomUUID(),
      label: '',
      weightKg: String(row.trim_weight_kg ?? ''),
      valuePerKg: String(row.trim_value_per_kg ?? ''),
    },
  ];
}

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
  trimGroups: TrimGroupFormState[];
  wasteLabel: string;
  wasteWeightKg: string;
  sellingPricePerKg: string;
}

function newCut(): CutFormState {
  return {
    key: crypto.randomUUID(),
    cutName: '',
    saleableWeightKg: '',
    trimGroups: [newTrimGroup()],
    wasteLabel: '',
    wasteWeightKg: '',
    sellingPricePerKg: '',
  };
}

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export default function NewCosting() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const suggestions = useSuggestions();

  const editId = searchParams.get('id');
  const duplicateId = searchParams.get('duplicate');
  const sourceId = editId ?? duplicateId;

  const editGroupIdParam = searchParams.get('carcassGroup');
  const duplicateGroupIdParam = searchParams.get('duplicateCarcassGroup');
  const sourceGroupId = editGroupIdParam ?? duplicateGroupIdParam;

  const sourceManufacturedId = searchParams.get('manufactured') ?? searchParams.get('duplicateManufactured');

  const isDeepLinked = Boolean(sourceId || sourceGroupId || sourceManufacturedId);

  const [mode, setMode] = useState<'single' | 'carcass' | 'manufactured'>(
    sourceGroupId ? 'carcass' : sourceManufacturedId ? 'manufactured' : 'single'
  );
  // Only single/carcass loading is tracked here — the manufactured form
  // manages its own loading state independently.
  const [loadingSource, setLoadingSource] = useState(Boolean(sourceId || sourceGroupId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Single product state ---
  const [form, setForm] = useState<FormState>(emptyForm);
  const [trimGroups, setTrimGroups] = useState<TrimGroupFormState[]>([newTrimGroup()]);

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
            wasteLabel: data.waste_label ?? '',
            wasteWeightKg: String(data.waste_weight_kg ?? ''),
            sellingPricePerKg: String(data.selling_price_per_kg ?? ''),
            targetMarginPct: String((data.target_margin_pct ?? 0) * 100),
          });
          setTrimGroups(trimGroupsFromRecord(data));
        }
        setLoadingSource(false);
      });
  }, [sourceId]);

  const trimSummary = useMemo(() => aggregateTrimGroups(trimGroupsToNumeric(trimGroups)), [trimGroups]);

  const results = useMemo(
    () =>
      calculateCosting({
        purchaseWeightKg: num(form.purchaseWeightKg),
        purchasePricePerKg: num(form.purchasePricePerKg),
        saleableWeightKg: num(form.saleableWeightKg),
        trimWeightKg: trimSummary.totalWeightKg,
        trimValuePerKg: trimSummary.blendedValuePerKg,
        wasteWeightKg: num(form.wasteWeightKg),
        sellingPricePerKg: num(form.sellingPricePerKg),
        targetMarginPct: num(form.targetMarginPct) / 100,
      }),
    [form, trimSummary]
  );

  const marginStatus = getMarginStatus(results.grossMarginPct, num(form.targetMarginPct) / 100);
  const hasEnoughInput = num(form.purchaseWeightKg) > 0 && num(form.saleableWeightKg) > 0;

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateTrimGroup(key: string, field: 'label' | 'weightKg' | 'valuePerKg', value: string) {
    setTrimGroups((prev) => prev.map((g) => (g.key === key ? { ...g, [field]: value } : g)));
  }

  function addTrimGroup() {
    setTrimGroups((prev) => [...prev, newTrimGroup()]);
  }

  function removeTrimGroup(key: string) {
    setTrimGroups((prev) => (prev.length <= 1 ? prev : prev.filter((g) => g.key !== key)));
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
      trim_weight_kg: trimSummary.totalWeightKg,
      trim_value_per_kg: trimSummary.blendedValuePerKg,
      trim_groups: trimGroups.map((g) => ({
        label: g.label,
        weight_kg: num(g.weightKg),
        value_per_kg: num(g.valuePerKg),
      })),
      waste_label: form.wasteLabel.trim() || null,
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
              trimGroups: trimGroupsFromRecord(row),
              wasteLabel: row.waste_label ?? '',
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

  const cutTrimSummaries = useMemo(
    () => cuts.map((c) => aggregateTrimGroups(trimGroupsToNumeric(c.trimGroups))),
    [cuts]
  );

  const carcassResults = useMemo(
    () =>
      summarizeCarcass(
        cuts.map((c, i) => ({
          cutName: c.cutName,
          saleableWeightKg: num(c.saleableWeightKg),
          trimWeightKg: cutTrimSummaries[i].totalWeightKg,
          trimValuePerKg: cutTrimSummaries[i].blendedValuePerKg,
          wasteWeightKg: num(c.wasteWeightKg),
          sellingPricePerKg: num(c.sellingPricePerKg),
        })),
        deadweightKg,
        carcassPricePerKg,
        targetMarginFraction
      ),
    [cuts, cutTrimSummaries, deadweightKg, carcassPricePerKg, targetMarginFraction]
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

  function updateCutTrimGroup(cutKey: string, trimKey: string, field: 'label' | 'weightKg' | 'valuePerKg', value: string) {
    setCuts((prev) =>
      prev.map((c) =>
        c.key === cutKey
          ? { ...c, trimGroups: c.trimGroups.map((g) => (g.key === trimKey ? { ...g, [field]: value } : g)) }
          : c
      )
    );
  }

  function addCutTrimGroup(cutKey: string) {
    setCuts((prev) =>
      prev.map((c) => (c.key === cutKey ? { ...c, trimGroups: [...c.trimGroups, newTrimGroup()] } : c))
    );
  }

  function removeCutTrimGroup(cutKey: string, trimKey: string) {
    setCuts((prev) =>
      prev.map((c) =>
        c.key === cutKey
          ? {
              ...c,
              trimGroups: c.trimGroups.length <= 1 ? c.trimGroups : c.trimGroups.filter((g) => g.key !== trimKey),
            }
          : c
      )
    );
  }

  async function handleCarcassSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    setError(null);

    const groupId = editGroupId ?? crypto.randomUUID();

    const rows = cuts.map((cut) => {
      const saleable = num(cut.saleableWeightKg);
      const trimAgg = aggregateTrimGroups(trimGroupsToNumeric(cut.trimGroups));
      const waste = num(cut.wasteWeightKg);
      return {
        dbId: cut.dbId,
        payload: {
          user_id: session.user.id,
          product_name: cut.cutName,
          supplier: carcassMeta.supplier,
          purchase_weight_kg: saleable + trimAgg.totalWeightKg + waste,
          purchase_price_per_kg: carcassPricePerKg,
          saleable_weight_kg: saleable,
          trim_weight_kg: trimAgg.totalWeightKg,
          trim_value_per_kg: trimAgg.blendedValuePerKg,
          trim_groups: cut.trimGroups.map((g) => ({
            label: g.label,
            weight_kg: num(g.weightKg),
            value_per_kg: num(g.valuePerKg),
          })),
          waste_label: cut.wasteLabel.trim() || null,
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
      <datalist id="product-name-suggestions">
        {suggestions.productNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="supplier-suggestions">
        {suggestions.supplierNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="cut-name-suggestions">
        {suggestions.cutNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

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
          <button
            type="button"
            onClick={() => setMode('manufactured')}
            className={
              mode === 'manufactured'
                ? 'rounded-md bg-brand-800 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
            }
          >
            Manufactured product
          </button>
        </div>
      )}

      {mode === 'manufactured' ? (
        <ManufacturedProductForm />
      ) : mode === 'carcass' ? (
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
                  list="product-name-suggestions"
                />
              </Field>
              <Field label="Supplier/Batch Code/Tag ID" className="col-span-2">
                <input
                  required
                  value={carcassMeta.supplier}
                  onChange={(e) => updateCarcassMeta('supplier', e.target.value)}
                  placeholder="e.g. Green Farm Meats"
                  className={inputClasses}
                  list="supplier-suggestions"
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
                  step={1}
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

          <div className="space-y-2">
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
                <div key={cut.key} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-xs font-semibold text-slate-400">#{index + 1}</span>
                    <input
                      required
                      value={cut.cutName}
                      onChange={(e) => updateCut(cut.key, 'cutName', e.target.value)}
                      placeholder="Cut name, e.g. Leg"
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm font-medium focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                      list="cut-name-suggestions"
                    />
                    <button
                      type="button"
                      onClick={() => removeCut(cut.key)}
                      disabled={cuts.length <= 1}
                      className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <CompactField label="Saleable wt (kg)">
                      <CompactNumberInput
                        value={cut.saleableWeightKg}
                        onChange={(v) => updateCut(cut.key, 'saleableWeightKg', v)}
                      />
                    </CompactField>
                    <CompactField label="Selling £/kg">
                      <CompactNumberInput
                        value={cut.sellingPricePerKg}
                        onChange={(v) => updateCut(cut.key, 'sellingPricePerKg', v)}
                      />
                    </CompactField>
                  </div>

                  <div className="mt-2 grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)] gap-1.5">
                    <CompactField label="Waste/Drip">
                      <input
                        value={cut.wasteLabel}
                        onChange={(e) => updateCut(cut.key, 'wasteLabel', e.target.value)}
                        placeholder="e.g. Bones"
                        className={compactInputClasses}
                      />
                    </CompactField>
                    <CompactField label="Weight (kg)">
                      <CompactNumberInput
                        value={cut.wasteWeightKg}
                        onChange={(v) => updateCut(cut.key, 'wasteWeightKg', v)}
                      />
                    </CompactField>
                  </div>

                  <div className="mt-2">
                    <TrimGroupsEditor
                      groups={cut.trimGroups}
                      onUpdate={(trimKey, field, value) => updateCutTrimGroup(cut.key, trimKey, field, value)}
                      onAdd={() => addCutTrimGroup(cut.key)}
                      onRemove={(trimKey) => removeCutTrimGroup(cut.key, trimKey)}
                      compact
                    />
                  </div>

                  {cutHasInput && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
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
                  list="product-name-suggestions"
                />
              </Field>
              <Field label="Supplier/Batch Code/Tag ID" className="col-span-2">
                <input
                  required
                  value={form.supplier}
                  onChange={(e) => update('supplier', e.target.value)}
                  placeholder="e.g. Green Farm Meats"
                  className={inputClasses}
                  list="supplier-suggestions"
                />
              </Field>

              <Field label="Purchase weight/Joint weight (kg)">
                <NumberInput value={form.purchaseWeightKg} onChange={(v) => update('purchaseWeightKg', v)} />
              </Field>
              <Field label="Purchase/Cost price (£/kg)">
                <NumberInput value={form.purchasePricePerKg} onChange={(v) => update('purchasePricePerKg', v)} />
              </Field>

              <Field label="Saleable meat weight (kg)">
                <NumberInput value={form.saleableWeightKg} onChange={(v) => update('saleableWeightKg', v)} />
              </Field>
              <Field label="Waste/Drip loss (kg)">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    value={form.wasteLabel}
                    onChange={(e) => update('wasteLabel', e.target.value)}
                    placeholder="e.g. Bones"
                    className={inputClasses}
                  />
                  <div className="w-24">
                    <NumberInput value={form.wasteWeightKg} onChange={(v) => update('wasteWeightKg', v)} />
                  </div>
                </div>
              </Field>

              <div className="col-span-2">
                <TrimGroupsEditor
                  groups={trimGroups}
                  onUpdate={updateTrimGroup}
                  onAdd={addTrimGroup}
                  onRemove={removeTrimGroup}
                />
              </div>

              <Field label="Current selling price (£/kg)">
                <NumberInput value={form.sellingPricePerKg} onChange={(v) => update('sellingPricePerKg', v)} />
              </Field>
              <Field label="Target gross margin (%)">
                <NumberInput value={form.targetMarginPct} onChange={(v) => update('targetMarginPct', v)} step={1} />
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
                {formatKg(trimSummary.totalWeightKg)}, waste {formatKg(num(form.wasteWeightKg))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TrimGroupsEditor({
  groups,
  onUpdate,
  onAdd,
  onRemove,
  compact = false,
}: {
  groups: TrimGroupFormState[];
  onUpdate: (key: string, field: 'label' | 'weightKg' | 'valuePerKg', value: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  compact?: boolean;
}) {
  const cellClasses = compact ? compactInputClasses : inputClasses;

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className={compact ? 'text-xs font-medium text-slate-500' : 'text-sm font-medium text-slate-700'}>
          Trim recovered
        </span>
        <button
          type="button"
          onClick={onAdd}
          className={`font-medium text-brand-800 hover:underline ${compact ? 'text-xs' : 'text-sm'}`}
        >
          + Add trim group
        </button>
      </div>
      <div className="mt-1 space-y-1.5">
        {groups.map((g) => (
          <div key={g.key} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] gap-1.5">
            <input
              value={g.label}
              onChange={(e) => onUpdate(g.key, 'label', e.target.value)}
              placeholder={compact ? 'Trim type' : 'e.g. Burger trim'}
              className={cellClasses}
            />
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              required
              value={g.weightKg}
              onChange={(e) => onUpdate(g.key, 'weightKg', e.target.value)}
              placeholder="Weight kg"
              className={cellClasses}
            />
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              required
              value={g.valuePerKg}
              onChange={(e) => onUpdate(g.key, 'valuePerKg', e.target.value)}
              placeholder="£/kg"
              className={cellClasses}
            />
            <button
              type="button"
              onClick={() => onRemove(g.key)}
              disabled={groups.length <= 1}
              className="px-1 text-red-600 disabled:opacity-30"
              aria-label="Remove trim group"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
