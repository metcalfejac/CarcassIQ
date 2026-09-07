export interface CostingInputs {
  purchaseWeightKg: number;
  purchasePricePerKg: number;
  saleableWeightKg: number;
  trimWeightKg: number;
  trimValuePerKg: number;
  wasteWeightKg: number;
  sellingPricePerKg: number;
  /** Fraction, e.g. 0.30 for 30% */
  targetMarginPct: number;
}

export interface CostingResults {
  totalPurchaseCost: number;
  saleableYieldPct: number;
  trueUsableCostPerKg: number;
  trimRecoveryValue: number;
  adjustedCost: number;
  adjustedUsableCostPerKg: number;
  projectedRevenue: number;
  grossProfit: number;
  grossMarginPct: number;
  requiredSellingPricePerKg: number;
}

export function calculateCosting(inputs: CostingInputs): CostingResults {
  const {
    purchaseWeightKg,
    purchasePricePerKg,
    saleableWeightKg,
    trimWeightKg,
    trimValuePerKg,
    sellingPricePerKg,
    targetMarginPct,
  } = inputs;

  const totalPurchaseCost = purchaseWeightKg * purchasePricePerKg;
  const saleableYieldPct = purchaseWeightKg > 0 ? saleableWeightKg / purchaseWeightKg : 0;
  const trueUsableCostPerKg = saleableWeightKg > 0 ? totalPurchaseCost / saleableWeightKg : 0;
  const trimRecoveryValue = trimWeightKg * trimValuePerKg;
  const adjustedCost = totalPurchaseCost - trimRecoveryValue;
  const adjustedUsableCostPerKg = saleableWeightKg > 0 ? adjustedCost / saleableWeightKg : 0;
  const projectedRevenue = saleableWeightKg * sellingPricePerKg;
  const grossProfit = projectedRevenue - adjustedCost;
  const grossMarginPct = projectedRevenue > 0 ? grossProfit / projectedRevenue : 0;
  const requiredSellingPricePerKg =
    saleableWeightKg > 0 && targetMarginPct < 1
      ? adjustedCost / (saleableWeightKg * (1 - targetMarginPct))
      : 0;

  return {
    totalPurchaseCost,
    saleableYieldPct,
    trueUsableCostPerKg,
    trimRecoveryValue,
    adjustedCost,
    adjustedUsableCostPerKg,
    projectedRevenue,
    grossProfit,
    grossMarginPct,
    requiredSellingPricePerKg,
  };
}

export type MarginStatus = 'above' | 'close' | 'below';

const CLOSE_THRESHOLD = 0.02;

export function getMarginStatus(actualMarginPct: number, targetMarginPct: number): MarginStatus {
  const diff = actualMarginPct - targetMarginPct;
  if (diff >= 0) return 'above';
  if (diff >= -CLOSE_THRESHOLD) return 'close';
  return 'below';
}

/**
 * A single cut carved from a whole carcass (e.g. "Leg" from a whole lamb).
 * The carcass's total cost is allocated across cuts by weight: this cut's
 * share of the deadweight is its own saleable + trim + waste, multiplied by
 * the carcass price/kg. That keeps the per-cut math identical to a normal
 * single-product costing, just fed an allocated "purchase weight" instead of
 * a separately-purchased one.
 */
export interface CarcassCut {
  cutName: string;
  saleableWeightKg: number;
  trimWeightKg: number;
  trimValuePerKg: number;
  wasteWeightKg: number;
  sellingPricePerKg: number;
}

export interface CarcassCutResult extends CostingResults {
  /** This cut's share of the deadweight (saleable + trim + waste). */
  cutWeightKg: number;
}

export interface CarcassSummary {
  totalCarcassCost: number;
  /** Sum of every cut's weight share. */
  accountedWeightKg: number;
  /** Deadweight not yet assigned to any cut. */
  unaccountedWeightKg: number;
  totalRevenue: number;
  /** Uses the full carcass cost, not just the portion allocated to cuts. */
  totalGrossProfit: number;
  overallMarginPct: number;
}

export function calculateCarcassCut(
  cut: CarcassCut,
  carcassPricePerKg: number,
  targetMarginPct: number
): CarcassCutResult {
  const cutWeightKg = cut.saleableWeightKg + cut.trimWeightKg + cut.wasteWeightKg;
  const results = calculateCosting({
    purchaseWeightKg: cutWeightKg,
    purchasePricePerKg: carcassPricePerKg,
    saleableWeightKg: cut.saleableWeightKg,
    trimWeightKg: cut.trimWeightKg,
    trimValuePerKg: cut.trimValuePerKg,
    wasteWeightKg: cut.wasteWeightKg,
    sellingPricePerKg: cut.sellingPricePerKg,
    targetMarginPct,
  });
  return { ...results, cutWeightKg };
}

export function summarizeCarcass(
  cuts: CarcassCut[],
  deadweightKg: number,
  carcassPricePerKg: number,
  targetMarginPct: number
): { perCut: CarcassCutResult[]; summary: CarcassSummary } {
  const perCut = cuts.map((cut) => calculateCarcassCut(cut, carcassPricePerKg, targetMarginPct));
  const totalCarcassCost = deadweightKg * carcassPricePerKg;
  const accountedWeightKg = perCut.reduce((sum, r) => sum + r.cutWeightKg, 0);
  const unaccountedWeightKg = Math.max(0, deadweightKg - accountedWeightKg);
  const totalRevenue = perCut.reduce((sum, r) => sum + r.projectedRevenue, 0);
  const totalGrossProfit = totalRevenue - totalCarcassCost;
  const overallMarginPct = totalRevenue > 0 ? totalGrossProfit / totalRevenue : 0;

  return {
    perCut,
    summary: {
      totalCarcassCost,
      accountedWeightKg,
      unaccountedWeightKg,
      totalRevenue,
      totalGrossProfit,
      overallMarginPct,
    },
  };
}
