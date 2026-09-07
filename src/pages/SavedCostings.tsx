import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { CostingRecord } from '../lib/types';
import { calculateCosting } from '../lib/calculations';
import { formatGBP, formatPct } from '../lib/format';

interface GroupInfo {
  groupId: string;
  carcassName: string;
  supplier: string;
  deadweightKg: number;
  pricePerKg: number;
  createdAt: string;
  rows: CostingRecord[];
}

interface DisplayItem {
  key: string;
  createdAt: string;
  single?: CostingRecord;
  group?: GroupInfo;
}

export default function SavedCostings() {
  const navigate = useNavigate();
  const [costings, setCostings] = useState<CostingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

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

  const displayItems = useMemo<DisplayItem[]>(() => {
    const groups = new Map<string, CostingRecord[]>();
    const singles: CostingRecord[] = [];

    for (const c of costings) {
      if (c.carcass_group_id) {
        if (!groups.has(c.carcass_group_id)) groups.set(c.carcass_group_id, []);
        groups.get(c.carcass_group_id)!.push(c);
      } else {
        singles.push(c);
      }
    }

    const items: DisplayItem[] = singles.map((c) => ({ key: c.id, createdAt: c.created_at, single: c }));

    for (const [groupId, rows] of groups) {
      const first = rows[0];
      const latestCreatedAt = rows.reduce((max, r) => (r.created_at > max ? r.created_at : max), first.created_at);
      items.push({
        key: groupId,
        createdAt: latestCreatedAt,
        group: {
          groupId,
          carcassName: first.carcass_product_name || 'Whole carcass',
          supplier: first.supplier,
          deadweightKg: first.carcass_deadweight_kg ?? 0,
          pricePerKg: first.purchase_price_per_kg,
          createdAt: latestCreatedAt,
          rows,
        },
      });
    }

    return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [costings]);

  async function handleDeleteSingle(id: string) {
    if (!confirm('Delete this costing? This cannot be undone.')) return;
    setBusyKey(id);
    const { error: deleteError } = await supabase.from('costings').delete().eq('id', id);
    setBusyKey(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setCostings((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm('Delete this whole carcass costing, including all its cuts? This cannot be undone.')) return;
    setBusyKey(groupId);
    const { error: deleteError } = await supabase.from('costings').delete().eq('carcass_group_id', groupId);
    setBusyKey(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setCostings((prev) => prev.filter((c) => c.carcass_group_id !== groupId));
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

      {displayItems.length === 0 ? (
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
              {displayItems.map((item) =>
                item.single ? (
                  <SingleRow
                    key={item.key}
                    costing={item.single}
                    busy={busyKey === item.single.id}
                    onOpen={() => navigate(`/new?id=${item.single!.id}`)}
                    onDuplicate={() => navigate(`/new?duplicate=${item.single!.id}`)}
                    onDelete={() => handleDeleteSingle(item.single!.id)}
                  />
                ) : (
                  <GroupRows
                    key={item.key}
                    group={item.group!}
                    busy={busyKey === item.group!.groupId}
                    onOpen={() => navigate(`/new?carcassGroup=${item.group!.groupId}`)}
                    onDuplicate={() => navigate(`/new?duplicateCarcassGroup=${item.group!.groupId}`)}
                    onDelete={() => handleDeleteGroup(item.group!.groupId)}
                  />
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SingleRow({
  costing,
  busy,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  costing: CostingRecord;
  busy: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const r = calculateCosting({
    purchaseWeightKg: costing.purchase_weight_kg,
    purchasePricePerKg: costing.purchase_price_per_kg,
    saleableWeightKg: costing.saleable_weight_kg,
    trimWeightKg: costing.trim_weight_kg,
    trimValuePerKg: costing.trim_value_per_kg,
    wasteWeightKg: costing.waste_weight_kg,
    sellingPricePerKg: costing.selling_price_per_kg,
    targetMarginPct: costing.target_margin_pct,
  });

  return (
    <tr className="hover:bg-slate-50">
      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
        {new Date(costing.created_at).toLocaleDateString('en-GB')}
      </td>
      <td className="px-4 py-3 font-medium text-slate-900">{costing.product_name}</td>
      <td className="px-4 py-3 text-slate-600">{costing.supplier}</td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatGBP(costing.purchase_price_per_kg)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatPct(r.saleableYieldPct)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatGBP(r.adjustedUsableCostPerKg)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatGBP(costing.selling_price_per_kg)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatPct(r.grossMarginPct)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <button onClick={onOpen} className="mr-3 text-brand-700 hover:underline">
          Open
        </button>
        <button onClick={onDuplicate} className="mr-3 text-slate-500 hover:underline">
          Duplicate
        </button>
        <button onClick={onDelete} disabled={busy} className="text-red-600 hover:underline disabled:opacity-50">
          Delete
        </button>
      </td>
    </tr>
  );
}

function GroupRows({
  group,
  busy,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  group: GroupInfo;
  busy: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const cutResults = group.rows.map((row) =>
    calculateCosting({
      purchaseWeightKg: row.purchase_weight_kg,
      purchasePricePerKg: row.purchase_price_per_kg,
      saleableWeightKg: row.saleable_weight_kg,
      trimWeightKg: row.trim_weight_kg,
      trimValuePerKg: row.trim_value_per_kg,
      wasteWeightKg: row.waste_weight_kg,
      sellingPricePerKg: row.selling_price_per_kg,
      targetMarginPct: row.target_margin_pct,
    })
  );

  const totalCost = group.deadweightKg * group.pricePerKg;
  const accountedWeightKg = group.rows.reduce((sum, row) => sum + row.purchase_weight_kg, 0);
  const totalRevenue = group.rows.reduce((sum, row) => sum + row.saleable_weight_kg * row.selling_price_per_kg, 0);
  const overallMarginPct = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue : 0;
  const yieldPct = group.deadweightKg > 0 ? accountedWeightKg / group.deadweightKg : 0;
  const totalSaleable = group.rows.reduce((sum, row) => sum + row.saleable_weight_kg, 0);
  const totalTrimRecovery = group.rows.reduce((sum, row) => sum + row.trim_weight_kg * row.trim_value_per_kg, 0);
  const blendedUsableCostPerKg = totalSaleable > 0 ? (totalCost - totalTrimRecovery) / totalSaleable : 0;
  const blendedSellingPricePerKg = totalSaleable > 0 ? totalRevenue / totalSaleable : 0;

  return (
    <>
      <tr className="bg-slate-50 font-medium">
        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
          {new Date(group.createdAt).toLocaleDateString('en-GB')}
        </td>
        <td className="px-4 py-3 text-slate-900">
          🥩 {group.carcassName} ({group.rows.length} cut{group.rows.length === 1 ? '' : 's'})
        </td>
        <td className="px-4 py-3 text-slate-600">{group.supplier}</td>
        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatGBP(group.pricePerKg)}</td>
        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatPct(yieldPct)}</td>
        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatGBP(blendedUsableCostPerKg)}</td>
        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatGBP(blendedSellingPricePerKg)}</td>
        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatPct(overallMarginPct)}</td>
        <td className="whitespace-nowrap px-4 py-3 text-right">
          <button onClick={onOpen} className="mr-3 text-brand-700 hover:underline">
            Open
          </button>
          <button onClick={onDuplicate} className="mr-3 text-slate-500 hover:underline">
            Duplicate
          </button>
          <button onClick={onDelete} disabled={busy} className="text-red-600 hover:underline disabled:opacity-50">
            Delete
          </button>
        </td>
      </tr>
      {group.rows.map((row, index) => {
        const r = cutResults[index];
        return (
          <tr key={row.id} className="text-slate-500">
            <td className="px-4 py-2"></td>
            <td className="px-4 py-2 pl-8">‣ {row.product_name}</td>
            <td className="px-4 py-2"></td>
            <td className="px-4 py-2"></td>
            <td className="whitespace-nowrap px-4 py-2">{formatPct(r.saleableYieldPct)}</td>
            <td className="whitespace-nowrap px-4 py-2">{formatGBP(r.adjustedUsableCostPerKg)}</td>
            <td className="whitespace-nowrap px-4 py-2">{formatGBP(row.selling_price_per_kg)}</td>
            <td className="whitespace-nowrap px-4 py-2">{formatPct(r.grossMarginPct)}</td>
            <td className="px-4 py-2"></td>
          </tr>
        );
      })}
    </>
  );
}
