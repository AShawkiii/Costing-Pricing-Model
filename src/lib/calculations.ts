/**
 * ---------------------------------------------------------------------------
 * CALCULATION ENGINE
 * ---------------------------------------------------------------------------
 * Pure, framework-free functions. No React, no DOM, no formatting concerns.
 * Everything the UI displays is derived from these functions, so the same
 * engine can later be reused by an API, a batch job, or an export service.
 *
 * Money is handled as plain numbers (EGP). Rounding is applied only at the
 * presentation layer (see lib/format.ts) so that intermediate results never
 * accumulate rounding error.
 * ---------------------------------------------------------------------------
 */

import type {
  AppSettings,
  CostLine,
  CostingModel,
  MarketingLine,
  PricingModel,
  UnallocatedTreatment,
  VatTreatment,
} from '../types/model';

/* ========================================================================== *
 * Small helpers
 * ========================================================================== */

/** Coerces anything into a finite number (empty inputs, NaN, Infinity -> 0). */
export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Guards every division in the engine against division by zero. */
export function safeDivide(numerator: number, denominator: number): number {
  const d = toNumber(denominator);
  if (d === 0) return 0;
  const result = toNumber(numerator) / d;
  return Number.isFinite(result) ? result : 0;
}

/* ========================================================================== *
 * Line level
 * ========================================================================== */

/** Net line total: Quantity x Unit Price. */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return toNumber(quantity) * toNumber(unitPrice);
}

/** VAT amount for a net total at the given rate (rate expressed as 0.14 = 14%). */
export function calculateVatAmount(netTotal: number, vatRate: number): number {
  return toNumber(netTotal) * toNumber(vatRate);
}

/** Net total + VAT amount. */
export function calculateTotalIncludingVat(netTotal: number, vatRate: number): number {
  return toNumber(netTotal) + calculateVatAmount(netTotal, vatRate);
}

/**
 * The amount that actually enters the costing for a line.
 *  - VAT `inclusive`   -> Net + VAT (VAT is an unrecoverable cost)
 *  - VAT `recoverable` -> Net only  (VAT is reclaimed from the tax authority)
 */
export function calculateCostBase(
  netTotal: number,
  vatRate: number,
  vatTreatment: VatTreatment,
): number {
  return vatTreatment === 'inclusive'
    ? calculateTotalIncludingVat(netTotal, vatRate)
    : toNumber(netTotal);
}

/**
 * Allocation rule (the core business rule of the Costing page):
 *
 *   Allocation = Yes -> Total Price = Cost Base / Quantity Produced
 *                       (a batch cost spread over the production run)
 *   Allocation = No  -> Total Price = Cost Base
 *                       (the cost is NOT distributed across the quantity)
 */
export function calculateAllocatedCost(
  costBase: number,
  quantityProduced: number,
  allocate: boolean,
): number {
  return allocate ? safeDivide(costBase, quantityProduced) : toNumber(costBase);
}

/** Everything that can be derived from a single Direct / Sample cost line. */
export interface CostLineResult {
  id: string;
  /** Quantity x Unit Price (net, excluding VAT). */
  netTotal: number;
  vatAmount: number;
  totalIncludingVat: number;
  /** Net or VAT-inclusive amount depending on the VAT treatment setting. */
  costBase: number;
  /** The "Total Price" column: per-unit when allocated, full amount when not. */
  totalPrice: number;
  allocate: boolean;
  /** True when the line's Total Price is a per-unit figure. */
  isPerUnit: boolean;
}

export function calculateCostLine(
  line: CostLine,
  quantityProduced: number,
  settings: Pick<AppSettings, 'vatTreatment' | 'unallocatedTreatment'>,
): CostLineResult {
  const netTotal = calculateLineTotal(line.quantity, line.unitPrice);
  const vatAmount = calculateVatAmount(netTotal, line.vatRate);
  const costBase = calculateCostBase(netTotal, line.vatRate, settings.vatTreatment);
  const totalPrice = calculateAllocatedCost(costBase, quantityProduced, line.allocate);

  return {
    id: line.id,
    netTotal,
    vatAmount,
    totalIncludingVat: netTotal + vatAmount,
    costBase,
    totalPrice,
    // An unallocated line only counts as a per-unit cost under the `per-unit`
    // treatment; under `total-only` it stays a lump-sum production cost.
    isPerUnit: line.allocate || settings.unallocatedTreatment === 'per-unit',
    allocate: line.allocate,
  };
}

/** Everything that can be derived from a single marketing line. */
export interface MarketingLineResult {
  id: string;
  netTotal: number;
  vatAmount: number;
  totalIncludingVat: number;
  costBase: number;
  /** Marketing is ALWAYS allocated: Cost Base / Quantity Produced. */
  totalPrice: number;
}

export function calculateMarketingLine(
  line: MarketingLine,
  quantityProduced: number,
  settings: Pick<AppSettings, 'vatTreatment'>,
): MarketingLineResult {
  const netTotal = calculateLineTotal(line.quantity, line.unitPrice);
  const vatAmount = calculateVatAmount(netTotal, line.vatRate);
  const costBase = calculateCostBase(netTotal, line.vatRate, settings.vatTreatment);

  return {
    id: line.id,
    netTotal,
    vatAmount,
    totalIncludingVat: netTotal + vatAmount,
    costBase,
    // Always allocated across the produced quantity - no Yes/No option here.
    totalPrice: safeDivide(costBase, quantityProduced),
  };
}

/* ========================================================================== *
 * Section level
 * ========================================================================== */

/** Aggregated result of a Direct Cost or Sample Cost section. */
export interface CostSectionResult {
  lines: CostLineResult[];
  /** Sum of the net (pre-VAT) line totals. */
  netTotal: number;
  vatTotal: number;
  /** Sum of the cost bases - the total cost of the section for the whole run. */
  total: number;
  /** Contribution of this section to the cost of ONE unit. */
  perUnit: number;
  /** Lump-sum costs excluded from the per-unit figure (`total-only` mode). */
  unallocatedTotal: number;
}

/**
 * Sums a section of cost lines.
 *
 * Per-unit contribution:
 *   allocated lines      -> cost base / quantity produced
 *   unallocated lines    -> cost base            (`per-unit` treatment)
 *                        -> excluded, reported separately (`total-only`)
 */
export function calculateCostSection(
  lines: CostLine[],
  quantityProduced: number,
  settings: Pick<AppSettings, 'vatTreatment' | 'unallocatedTreatment'>,
): CostSectionResult {
  const results = lines.map((line) => calculateCostLine(line, quantityProduced, settings));

  return results.reduce<CostSectionResult>(
    (acc, r) => {
      acc.lines.push(r);
      acc.netTotal += r.netTotal;
      acc.vatTotal += r.vatAmount;
      acc.total += r.costBase;
      if (r.isPerUnit) acc.perUnit += r.totalPrice;
      else acc.unallocatedTotal += r.costBase;
      return acc;
    },
    { lines: [], netTotal: 0, vatTotal: 0, total: 0, perUnit: 0, unallocatedTotal: 0 },
  );
}

/** Direct Cost section (mandatory). */
export function calculateDirectCost(
  model: Pick<CostingModel, 'directCosts' | 'quantityProduced'>,
  settings: Pick<AppSettings, 'vatTreatment' | 'unallocatedTreatment'>,
): CostSectionResult {
  return calculateCostSection(model.directCosts, model.quantityProduced, settings);
}

/** Sample Cost section (optional - an empty section simply costs 0). */
export function calculateSampleCost(
  model: Pick<CostingModel, 'sampleCosts' | 'quantityProduced'>,
  settings: Pick<AppSettings, 'vatTreatment' | 'unallocatedTreatment'>,
): CostSectionResult {
  return calculateCostSection(model.sampleCosts, model.quantityProduced, settings);
}

export interface MarketingSectionResult {
  lines: MarketingLineResult[];
  netTotal: number;
  vatTotal: number;
  total: number;
  perUnit: number;
}

/** Marketing section (optional). Every line is allocated over the quantity. */
export function calculateMarketingCost(
  model: Pick<CostingModel, 'marketingExpenses' | 'quantityProduced'>,
  settings: Pick<AppSettings, 'vatTreatment'>,
): MarketingSectionResult {
  const results = model.marketingExpenses.map((line) =>
    calculateMarketingLine(line, model.quantityProduced, settings),
  );

  return results.reduce<MarketingSectionResult>(
    (acc, r) => {
      acc.lines.push(r);
      acc.netTotal += r.netTotal;
      acc.vatTotal += r.vatAmount;
      acc.total += r.costBase;
      acc.perUnit += r.totalPrice;
      return acc;
    },
    { lines: [], netTotal: 0, vatTotal: 0, total: 0, perUnit: 0 },
  );
}

/* ========================================================================== *
 * Costing totals
 * ========================================================================== */

/**
 * Base Cost Per Unit =
 *   Direct Cost Per Unit
 * + Sample Cost Per Unit
 * + Marketing Cost Per Unit
 * + Overheads Per Unit        (already a per-unit amount - never divided)
 */
export function calculateBaseCostPerUnit(
  directPerUnit: number,
  samplePerUnit: number,
  marketingPerUnit: number,
  overheadsPerUnit: number,
): number {
  return (
    toNumber(directPerUnit) +
    toNumber(samplePerUnit) +
    toNumber(marketingPerUnit) +
    toNumber(overheadsPerUnit)
  );
}

/** Exchange Rate Adjustment = Base Cost Per Unit x Exchange Rate %. */
export function calculateExchangeRateAdjustment(
  baseCostPerUnit: number,
  exchangeRateValuation: number,
): number {
  return toNumber(baseCostPerUnit) * toNumber(exchangeRateValuation);
}

/**
 * Total Cost Per Unit = Base Cost Per Unit x (1 + Exchange Rate %)
 * (identical to Base Cost Per Unit + Exchange Rate Adjustment).
 */
export function calculateTotalCostPerUnit(
  baseCostPerUnit: number,
  exchangeRateValuation: number,
): number {
  return toNumber(baseCostPerUnit) + calculateExchangeRateAdjustment(baseCostPerUnit, exchangeRateValuation);
}

/** The complete, memo-friendly result of a costing model. */
export interface CostingResult {
  quantityProduced: number;
  direct: CostSectionResult;
  sample: CostSectionResult;
  marketing: MarketingSectionResult;
  overheadsPerUnit: number;
  baseCostPerUnit: number;
  exchangeRateValuation: number;
  exchangeRateAdjustment: number;
  totalCostPerUnit: number;
  /** Total Cost Per Unit x Quantity Produced. */
  totalProductionCost: number;
  /** Lump-sum costs kept outside the per-unit figure (`total-only` mode). */
  unallocatedTotal: number;
  /** VAT across every section (information / cash-flow view). */
  vatTotal: number;
  netTotal: number;
}

/** Runs the whole costing engine for a model. */
export function calculateCosting(model: CostingModel, settings: AppSettings): CostingResult {
  const direct = calculateDirectCost(model, settings);
  const sample = calculateSampleCost(model, settings);
  const marketing = calculateMarketingCost(model, settings);

  const overheadsPerUnit = toNumber(model.overheadsPerUnit);
  const baseCostPerUnit = calculateBaseCostPerUnit(
    direct.perUnit,
    sample.perUnit,
    marketing.perUnit,
    overheadsPerUnit,
  );
  const exchangeRateValuation = toNumber(model.exchangeRateValuation);
  const exchangeRateAdjustment = calculateExchangeRateAdjustment(baseCostPerUnit, exchangeRateValuation);
  const totalCostPerUnit = baseCostPerUnit + exchangeRateAdjustment;

  return {
    quantityProduced: toNumber(model.quantityProduced),
    direct,
    sample,
    marketing,
    overheadsPerUnit,
    baseCostPerUnit,
    exchangeRateValuation,
    exchangeRateAdjustment,
    totalCostPerUnit,
    totalProductionCost: totalCostPerUnit * toNumber(model.quantityProduced),
    unallocatedTotal: direct.unallocatedTotal + sample.unallocatedTotal,
    vatTotal: direct.vatTotal + sample.vatTotal + marketing.vatTotal,
    netTotal: direct.netTotal + sample.netTotal + marketing.netTotal,
  };
}

/* ========================================================================== *
 * Pricing
 * ========================================================================== */

/**
 * Selling Price = Cost Per Unit / (1 - Gross Profit Margin)
 *
 * This is a MARGIN calculation, not a mark-up:
 *   cost 100 @ 40% margin -> 100 / 0.6 = 166.67   (correct)
 *   cost 100 x 1.40       -> 140                  (mark-up - NOT used)
 *
 * A margin of 100% or more is mathematically impossible (it would divide by
 * zero or produce a negative price), so it is guarded here and blocked by the
 * validation layer.
 */
export function calculateSellingPrice(costPerUnit: number, grossMargin: number): number {
  const margin = toNumber(grossMargin);
  if (margin >= 1) return 0; // guarded: division by zero / negative price
  return safeDivide(toNumber(costPerUnit), 1 - margin);
}

/** Gross Profit = Selling Price - Cost Per Unit. */
export function calculateGrossProfit(sellingPrice: number, costPerUnit: number): number {
  return toNumber(sellingPrice) - toNumber(costPerUnit);
}

/** Realised margin = Gross Profit / Selling Price (sanity check of the price). */
export function calculateGrossMargin(sellingPrice: number, costPerUnit: number): number {
  return safeDivide(calculateGrossProfit(sellingPrice, costPerUnit), sellingPrice);
}

/** Mark-up % = Gross Profit / Cost (shown next to the margin for clarity). */
export function calculateMarkup(grossProfit: number, costPerUnit: number): number {
  return safeDivide(grossProfit, costPerUnit);
}

export interface PricingScenario {
  grossMargin: number;
  sellingPrice: number;
  grossProfit: number;
  markup: number;
}

/** One row of the scenario table. */
export function calculateScenario(costPerUnit: number, grossMargin: number): PricingScenario {
  const sellingPrice = calculateSellingPrice(costPerUnit, grossMargin);
  const grossProfit = calculateGrossProfit(sellingPrice, costPerUnit);
  return {
    grossMargin,
    sellingPrice,
    grossProfit,
    markup: calculateMarkup(grossProfit, costPerUnit),
  };
}

export interface PricingResult {
  costPerUnit: number;
  targetGrossMargin: number;
  sellingPrice: number;
  grossProfit: number;
  /** Recomputed from the price - proves the target margin is achieved. */
  realisedGrossMargin: number;
  markup: number;
  /** Selling price x Quantity Produced. */
  totalRevenue: number;
  totalGrossProfit: number;
  scenarios: PricingScenario[];
}

/** Runs the whole pricing engine on top of a costing result. */
export function calculatePricing(
  costPerUnit: number,
  pricing: PricingModel,
  quantityProduced = 0,
): PricingResult {
  const sellingPrice = calculateSellingPrice(costPerUnit, pricing.targetGrossMargin);
  const grossProfit = calculateGrossProfit(sellingPrice, costPerUnit);

  return {
    costPerUnit: toNumber(costPerUnit),
    targetGrossMargin: toNumber(pricing.targetGrossMargin),
    sellingPrice,
    grossProfit,
    realisedGrossMargin: calculateGrossMargin(sellingPrice, costPerUnit),
    markup: calculateMarkup(grossProfit, costPerUnit),
    totalRevenue: sellingPrice * toNumber(quantityProduced),
    totalGrossProfit: grossProfit * toNumber(quantityProduced),
    scenarios: pricing.scenarioMargins.map((m) => calculateScenario(costPerUnit, m)),
  };
}

/** Re-exported for consumers that only need the treatment union types. */
export type { UnallocatedTreatment, VatTreatment };
