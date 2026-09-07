import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { CostingRecord } from '../lib/types';
import { calculateCosting } from '../lib/calculations';
import { formatGBP, formatPct } from '../lib/format';

export default function SavedCostings() {
  const navigate = useNavigate();
  const [costings, setCostings] = useState<CostingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('costings')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCostings(data ?? []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this costing? This cannot be undone.')) return;
    setDeletingId(id);
    const { error: deleteError } = await supabase.from('costings').delete().eq('id', id);
    setDeletingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setCostings((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Saved costings</h1>
        <Link
          to="/new"
          className="rounded-md bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New costing
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {costings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No costings saved yet. Create your first one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'Product', 'Supplier', 'Price/kg', 'Yield', 'Usable cost/kg', 'Selling price/kg', 'Margin', ''].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costings.map((c) => {
                const r = calculateCosting({
                  purchaseWeightKg: c.purchase_weight_kg,
                  purchasePricePerKg: c.purchase_price_per_kg,
                  saleableWeightKg: c.saleable_weight_kg,
                  trimWeightKg: c.trim_weight_kg,
                  trimValuePerKg: c.trim_value_per_kg,
                  wasteWeightKg: c.waste_weight_kg,
                  sellingPricePerKg: c.selling_price_per_kg,
                  targetMarginPct: c.target_margin_pct,
                });
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{c.product_name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.supplier}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatGBP(c.purchase_price_per_kg)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatPct(r.saleableYieldPct)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatGBP(r.adjustedUsableCostPerKg)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatGBP(c.selling_price_per_kg)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatPct(r.grossMarginPct)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button onClick={() => navigate(`/new?id=${c.id}`)} className="mr-3 text-brand-700 hover:underline">
                        Open
                      </button>
                      <button
                        onClick={() => navigate(`/new?duplicate=${c.id}`)}
                        className="mr-3 text-slate-500 hover:underline"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="text-red-600 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
