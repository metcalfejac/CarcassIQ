export interface CostingRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  product_name: string;
  supplier: string;
  purchase_weight_kg: number;
  purchase_price_per_kg: number;
  saleable_weight_kg: number;
  trim_weight_kg: number;
  trim_value_per_kg: number;
  waste_weight_kg: number;
  selling_price_per_kg: number;
  /** Fraction, e.g. 0.30 for 30% */
  target_margin_pct: number;
  /** Shared by every cut saved together from one whole-carcass costing. */
  carcass_group_id: string | null;
  /** e.g. "Whole lamb" — the carcass this cut was carved from. */
  carcass_product_name: string | null;
  carcass_deadweight_kg: number | null;
}
