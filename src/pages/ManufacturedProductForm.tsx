import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { calculateManufacturedProduct, getMarginStatus } from '../lib/calculations';
import type { SellingMethod } from '../lib/calculations';
import { formatGBP, formatKg, formatPct } from '../lib/format';
import { Field, NumberInput, Result, inputClasses } from '../components/FormFields';
import MarginBadge from '../components/MarginBadge';

interface IngredientFormState {
  key: string;
  name: string;
  weightKg: string;
  costPerKg: string;
}

function newIngredient(): IngredientFormState {
  return { key: crypto.randomUUID(), name: '', weightKg: '', costPerKg: '' };
}

interface ManufacturedFormState {
  productName: string;
  sellingMethod: SellingMethod;
  sellingPrice: string;
  unitWeightKg: string;
  unitsProducedActual: string;
  /** Whole percent, e.g. "30" */
  targetMarginPct: string;
}

const emptyForm: ManufacturedFormState = {
  productName: '',
  sellingMethod: 'per_kg',
  sellingPrice: '',
  unitWeightKg: '',
  unitsProducedActual: '',
  targetMarginPct: '30',
};

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

type WeightUnit = 'kg' | 'lb';

const LB_PER_KG = 2.2046226218;

/** Converts a typed weight value from one display unit to another, so
 *  toggling kg/lb preserves the physical weight rather than reinterpreting
 *  the same number under the new unit. */
function convertWeight(value: string, from: WeightUnit, to: WeightUnit): string {
  if (from === to || !value.trim()) return value;
  const n = num(value);
  const converted = from === 'kg' ? n * LB_PER_KG : n / LB_PER_KG;
  return String(Math.round(converted * 10000) / 10000);
}

function toKg(value: string, unit: WeightUnit): number {
  const n = num(value);
  return unit === 'lb' ? n / LB_PER_KG : n;
}

export default function ManufacturedProductForm() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const editId = searchParams.get('manufactured');
  const duplicateId = searchParams.get('duplicateManufactured');
  const sourceId = editId ?? duplicateId;

  const [form, setForm] = useState<ManufacturedFormState>(emptyForm);
  const [ingredients, setIngredients] = useState<IngredientFormState[]>([newIngredient()]);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [loadingSource, setLoadingSource] = useState(!!sourceId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceId) return;
    setLoadingSource(true);
    supabase
      .from('manufactured_products')
      .select('*')
      .eq('id', sourceId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data) {
          setError('Could not load that product.');
        } else {
          setForm({
            productName: data.product_name ?? '',
            sellingMethod: data.selling_method === 'per_unit' ? 'per_unit' : 'per_kg',
            sellingPrice: String(data.selling_price ?? ''),
            unitWeightKg: data.unit_weight_kg != null ? String(data.unit_weight_kg) : '',
            unitsProducedActual: data.units_produced != null ? String(data.units_produced) : '',
            targetMarginPct: String((data.target_margin_pct ?? 0) * 100),
          });
          const loaded = Array.isArray(data.ingredients) ? data.ingredients : [];
          setIngredients(
            loaded.length > 0
              ? loaded.map((ing: { name?: string; weight_kg?: number; cost_per_kg?: number }) => ({
                  key: crypto.randomUUID(),
                  name: ing.name ?? '',
                  weightKg: String(ing.weight_kg ?? ''),
                  costPerKg: String(ing.cost_per_kg ?? ''),
                }))
              : [newIngredient()]
          );
        }
        setLoadingSource(false);
      });
  }, [sourceId]);

  const results = useMemo(
    () =>
      calculateManufacturedProduct({
        ingredients: ingredients.map((i) => ({ weightKg: toKg(i.weightKg, weightUnit), costPerKg: num(i.costPerKg) })),
        sellingMethod: form.sellingMethod,
        sellingPrice: num(form.sellingPrice),
        unitWeightKg: toKg(form.unitWeightKg, weightUnit),
        unitsProducedActual: num(form.unitsProducedActual),
        targetMarginPct: num(form.targetMarginPct) / 100,
      }),
    [ingredients, form, weightUnit]
  );

  const marginStatus = getMarginStatus(results.grossMarginPct, num(form.targetMarginPct) / 100);

  const hasIngredientInput = ingredients.some((i) => num(i.weightKg) > 0);

  function updateForm<K extends keyof ManufacturedFormState>(key: K, value: ManufacturedFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateIngredient(key: string, field: 'name' | 'weightKg' | 'costPerKg', value: string) {
    setIngredients((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, newIngredient()]);
  }

  function removeIngredient(key: string) {
    setIngredients((prev) => (prev.length <= 1 ? prev : prev.filter((i) => i.key !== key)));
  }

  function changeWeightUnit(newUnit: WeightUnit) {
    if (newUnit === weightUnit) return;
    setIngredients((prev) => prev.map((i) => ({ ...i, weightKg: convertWeight(i.weightKg, weightUnit, newUnit) })));
    setForm((f) => ({ ...f, unitWeightKg: convertWeight(f.unitWeightKg, weightUnit, newUnit) }));
    setWeightUnit(newUnit);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    setError(null);

    const payload = {
      user_id: session.user.id,
      product_name: form.productName,
      selling_method: form.sellingMethod,
      selling_price: num(form.sellingPrice),
      ingredients: ingredients.map((i) => ({
        name: i.name,
        weight_kg: toKg(i.weightKg, weightUnit),
        cost_per_kg: num(i.costPerKg),
      })),
      unit_weight_kg: form.unitWeightKg.trim() ? toKg(form.unitWeightKg, weightUnit) : null,
      units_produced: form.unitsProducedActual.trim() ? num(form.unitsProducedActual) : null,
      target_margin_pct: num(form.targetMarginPct) / 100,
    };

    const query = editId
      ? supabase.from('manufactured_products').update(payload).eq('id', editId)
      : supabase.from('manufactured_products').insert(payload);

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          {editId ? 'Edit manufactured product' : 'New manufactured product'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          For products made from multiple ingredients — burgers, sausages, pies, ready meals.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="Product name" className="col-span-2">
            <input
              required
              value={form.productName}
              onChange={(e) => updateForm('productName', e.target.value)}
              placeholder="e.g. Beef burgers"
              className={inputClasses}
            />
          </Field>
          <Field label="Selling method">
            <select
              value={form.sellingMethod}
              onChange={(e) => updateForm('sellingMethod', e.target.value as SellingMethod)}
              className={inputClasses}
            >
              <option value="per_kg">Per kg</option>
              <option value="per_unit">Per unit</option>
            </select>
          </Field>
          <Field label={form.sellingMethod === 'per_kg' ? 'Selling price (£/kg)' : 'Selling price (£/unit)'}>
            <NumberInput value={form.sellingPrice} onChange={(v) => updateForm('sellingPrice', v)} />
          </Field>
          <Field label="Target gross margin (%)" className="col-span-2">
            <NumberInput value={form.targetMarginPct} onChange={(v) => updateForm('targetMarginPct', v)} step={1} />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Ingredients</h2>
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => changeWeightUnit('kg')}
                className={
                  weightUnit === 'kg'
                    ? 'rounded bg-brand-800 px-2 py-1 font-semibold text-white'
                    : 'rounded px-2 py-1 font-medium text-slate-600 hover:bg-slate-100'
                }
              >
                kg
              </button>
              <button
                type="button"
                onClick={() => changeWeightUnit('lb')}
                className={
                  weightUnit === 'lb'
                    ? 'rounded bg-brand-800 px-2 py-1 font-semibold text-white'
                    : 'rounded px-2 py-1 font-medium text-slate-600 hover:bg-slate-100'
                }
              >
                lb
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={addIngredient}
            className="rounded-md border border-brand-800 px-3 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-50"
          >
            + Add Ingredient
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr_auto] gap-2 px-1 text-xs font-medium text-slate-500 sm:grid">
            <span>Ingredient</span>
            <span>Weight ({weightUnit})</span>
            <span>Cost (£/kg)</span>
            <span>Ingredient cost</span>
            <span />
          </div>
          {ingredients.map((ing) => {
            const cost = toKg(ing.weightKg, weightUnit) * num(ing.costPerKg);
            return (
              <div
                key={ing.key}
                className="grid grid-cols-2 gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-[1.6fr_1fr_1fr_1fr_auto] sm:items-center sm:border-0 sm:p-0"
              >
                <input
                  required
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.key, 'name', e.target.value)}
                  placeholder="e.g. Beef trim"
                  className={`col-span-2 sm:col-span-1 ${inputClasses}`}
                />
                <NumberInput value={ing.weightKg} onChange={(v) => updateIngredient(ing.key, 'weightKg', v)} />
                <NumberInput value={ing.costPerKg} onChange={(v) => updateIngredient(ing.key, 'costPerKg', v)} />
                <div className="flex items-center rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  {formatGBP(cost)}
                </div>
                <button
                  type="button"
                  onClick={() => removeIngredient(ing.key)}
                  disabled={ingredients.length <= 1}
                  className="justify-self-end text-sm text-red-600 hover:underline disabled:opacity-40 sm:justify-self-auto"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Finished units</h2>
        <p className="mt-1 text-sm text-slate-500">
          Optional — for products sold individually (burgers, pies). Enter either one; if you know the actual
          yield, enter that and it'll be used instead of an estimate.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label={`Weight per unit (${weightUnit})`}>
            <NumberInput
              value={form.unitWeightKg}
              onChange={(v) => updateForm('unitWeightKg', v)}
              required={false}
            />
          </Field>
          <Field label="Units produced (actual, optional)">
            <NumberInput
              value={form.unitsProducedActual}
              onChange={(v) => updateForm('unitsProducedActual', v)}
              step={1}
              required={false}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Results</h2>
          {hasIngredientInput && <MarginBadge status={marginStatus} />}
        </div>

        {!hasIngredientInput ? (
          <p className="mt-4 text-sm text-slate-500">Add at least one ingredient with a weight to see live results.</p>
        ) : (
          <dl className="mt-4 space-y-3">
            <Result label="Total batch weight" value={formatKg(results.totalWeightKg)} />
            <Result label="Total batch cost" value={formatGBP(results.totalBatchCost)} />
            <Result label="Cost per kg" value={formatGBP(results.costPerKg)} highlight />
            {results.unitsProduced !== null && (
              <>
                <Result label="Units produced" value={String(results.unitsProduced)} />
                <Result label="Cost per unit" value={formatGBP(results.costPerUnit ?? 0)} highlight />
              </>
            )}
            <Result label="Revenue" value={formatGBP(results.revenue)} />
            <Result label="Gross profit" value={formatGBP(results.grossProfit)} />
            <Result label="Gross margin" value={formatPct(results.grossMarginPct)} highlight />
            {results.requiredSellingPrice !== null && (
              <Result
                label="Required selling price for target margin"
                value={`${formatGBP(results.requiredSellingPrice)}${form.sellingMethod === 'per_kg' ? '/kg' : '/unit'}`}
                highlight
              />
            )}
          </dl>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : editId ? 'Save changes' : 'Save manufactured product'}
      </button>
    </form>
  );
}
