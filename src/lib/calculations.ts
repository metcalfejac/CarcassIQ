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
