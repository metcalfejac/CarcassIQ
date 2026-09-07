import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { CostingRecord } from '../lib/types';
import { calculateCosting } from '../lib/calculations';
import { formatGBP, formatPct } from '../lib/format';

interface SupplierSummary {
  supplier: string;
  products: string[];
  costingCount: number;
  avgPricePerKg: number;
  avgYieldPct: number;
  avgUsableCostPerKg: number;
}

function average(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export default function Suppliers() {
  const [costings, setCostings] = useState<CostingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('costings')
      .select('*')
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else setCostings(data ?? []);
        setLoading(false);
      });
  }, []);

  const summaries = useMemo<SupplierSummary[]>(() => {
    const bySupplier = new Map<string, CostingRecord[]>();
    for (const c of costings) {
      const key = c.supplier || 'Unknown supplier';
      if (!bySupplier.has(key)) bySupplier.set(key, []);
      bySupplier.get(key)!.push(c);
    }

    return Array.from(bySupplier.entries())
      .map(([supplier, rows]) => {
        const results = rows.map((c) =>
          calculateCosting({
            purchaseWeightKg: c.purchase_weight_kg,
            purchasePricePerKg: c.purchase_price_per_kg,
            saleableWeightKg: c.saleable_weight_kg,
            trimWeightKg: c.trim_weight_kg,
            trimValuePerKg: c.trim_value_per_kg,
            wasteWeightKg: c.waste_weight_kg,
            sellingPricePerKg: c.selling_price_per_kg,
            targetMarginPct: c.target_margin_pct,
          })
        );

        return {
          supplier,
          products: Array.from(new Set(rows.map((r) => r.product_name).filter(Boolean))),
          costingCount: rows.length,
          avgPricePerKg: average(rows.map((r) => r.purchase_price_per_kg)),
          avgYieldPct: average(results.map((r) => r.saleableYieldPct)),
          avgUsableCostPerKg: average(results.map((r) => r.adjustedUsableCostPerKg)),
        };
      })
      .sort((a, b) => a.supplier.localeCompare(b.supplier));
  }, [costings]);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Suppliers</h1>
      <p className="text-sm text-slate-500">
        Automatically built from your saved costings — no separate supplier setup needed.
      </p>

      {summaries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No supplier data yet. Save a costing to see supplier stats here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => (
            <div key={s.supplier} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">{s.supplier}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {s.costingCount} costing{s.costingCount === 1 ? '' : 's'} · {s.products.join(', ') || 'No products yet'}
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Avg. purchase price</dt>
                  <dd className="font-medium text-slate-900">{formatGBP(s.avgPricePerKg)}/kg</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Avg. yield</dt>
                  <dd className="font-medium text-slate-900">{formatPct(s.avgYieldPct)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Avg. usable cost</dt>
                  <dd className="font-medium text-brand-800">{formatGBP(s.avgUsableCostPerKg)}/kg</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
