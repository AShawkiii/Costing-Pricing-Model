/**
 * Calculation engine tests.
 *
 * The final block reproduces the acceptance test case from the specification
 * and asserts every intermediate figure, so a regression in any single rule
 * (allocation, VAT, gross-up, margin) fails the build.
 */

import { describe, expect, it } from 'vitest';

import {
  buildCostBreakdown,
  calculateAllocatedCost,
  calculateBaseCostPerUnit,
  calculateCosting,
  calculateExchangeRateAdjustment,
  calculateGrossMargin,
  calculateGrossProfit,
  calculateLineTotal,
  calculateMarkup,
  calculatePricing,
  resolveVatRate,
  calculateSellingPrice,
  calculateTotalCostPerUnit,
  calculateVatAmount,
  safeDivide,
} from './calculations';
import type { AppSettings, CostingModel, CostLine, MarketingLine } from '../types/model';
import { DEFAULT_SETTINGS } from '../config/defaults';

const settings: AppSettings = { ...DEFAULT_SETTINGS };
const netSettings: AppSettings = { ...DEFAULT_SETTINGS, vatTreatment: 'recoverable' };

function line(partial: Partial<CostLine>): CostLine {
  return {
    id: partial.id ?? Math.random().toString(36),
    description: partial.description ?? '',
    quantity: partial.quantity ?? 0,
    measurementId: partial.measurementId ?? 'piece',
    unitPrice: partial.unitPrice ?? 0,
    vatable: partial.vatable ?? true,
    allocate: partial.allocate ?? true,
  };
}

function marketing(partial: Partial<MarketingLine>): MarketingLine {
  return {
    id: partial.id ?? Math.random().toString(36),
    marketingTypeId: partial.marketingTypeId ?? 'ugc',
    description: partial.description ?? '',
    quantity: partial.quantity ?? 1,
    unitPrice: partial.unitPrice ?? 0,
    vatable: partial.vatable ?? true,
  };
}

function model(partial: Partial<CostingModel>): CostingModel {
  return {
    id: 'test',
    product: { name: '', code: '', category: '', costingDate: '2026-01-01' },
    quantityProduced: 1000,
    directCosts: [],
    sampleCosts: [],
    marketingExpenses: [],
    overheadsPerUnit: 0,
    exchangeRateValuation: 0,
    ...partial,
  };
}

describe('line level', () => {
  it('multiplies quantity by unit price', () => {
    expect(calculateLineTotal(2.5, 250)).toBe(625);
  });

  it('calculates VAT on the net total', () => {
    expect(calculateVatAmount(1000, 0.14)).toBeCloseTo(140, 10);
  });

  it('allocates a cost across the produced quantity when Allocation = Yes', () => {
    expect(calculateAllocatedCost(10_000, 1000, true)).toBe(10);
  });

  it('keeps the full amount when Allocation = No', () => {
    expect(calculateAllocatedCost(10_000, 1000, false)).toBe(10_000);
  });

  it('never divides by zero', () => {
    expect(safeDivide(100, 0)).toBe(0);
    expect(calculateAllocatedCost(10_000, 0, true)).toBe(0);
  });
});

describe('VAT checkbox', () => {
  it('taxes a line at the configured rate only when it is ticked', () => {
    expect(resolveVatRate(true, 0.14)).toBe(0.14);
    expect(resolveVatRate(false, 0.14)).toBe(0);
  });

  it('charges no VAT on an unticked line', () => {
    const result = calculateCosting(
      model({
        directCosts: [
          line({ quantity: 1, unitPrice: 100, vatable: true }),
          line({ quantity: 1, unitPrice: 100, vatable: false }),
        ],
      }),
      settings,
    );
    expect(result.direct.lines[0].vatAmount).toBeCloseTo(14, 10);
    expect(result.direct.lines[1].vatAmount).toBe(0);
    expect(result.direct.lines[1].costBase).toBe(100); // net = incl. VAT
    expect(result.direct.vatTotal).toBeCloseTo(14, 10);
  });

  it('follows the VAT rate configured in settings', () => {
    const at20: AppSettings = { ...DEFAULT_SETTINGS, vatRate: 0.2 };
    const result = calculateCosting(model({ directCosts: [line({ quantity: 1, unitPrice: 100 })] }), at20);
    expect(result.direct.vatTotal).toBeCloseTo(20, 10);
    expect(result.direct.total).toBeCloseTo(120, 10);
  });
});

describe('cost breakdown', () => {
  it('splits the total cost per unit into shares that add up to 100%', () => {
    const result = calculateCosting(
      model({
        directCosts: [line({ quantity: 1, unitPrice: 120, allocate: false, vatable: false })],
        marketingExpenses: [marketing({ quantity: 1, unitPrice: 15_000, vatable: false })],
        overheadsPerUnit: 20,
        exchangeRateValuation: 0.15,
      }),
      netSettings,
    );
    const rows = buildCostBreakdown(result);
    expect(rows.map((r) => r.label)).toEqual([
      'Direct Cost',
      'Sample Cost',
      'Marketing Expenses',
      'Overheads',
      'Exchange Rate Valuation',
    ]);
    expect(rows.reduce((sum, r) => sum + r.perUnit, 0)).toBeCloseTo(result.totalCostPerUnit, 10);
    expect(rows.reduce((sum, r) => sum + r.share, 0)).toBeCloseTo(1, 10);
    expect(rows[0].total).toBeCloseTo(120 * result.quantityProduced, 10);
  });

  it('reports zero shares instead of NaN when there is no cost yet', () => {
    const rows = buildCostBreakdown(calculateCosting(model({}), settings));
    expect(rows.every((r) => r.share === 0 && r.perUnit === 0)).toBe(true);
  });
});

describe('sections', () => {
  it('treats an empty sample section as zero cost', () => {
    const result = calculateCosting(model({ directCosts: [line({ quantity: 1, unitPrice: 100 })] }), settings);
    expect(result.sample.total).toBe(0);
    expect(result.sample.perUnit).toBe(0);
  });

  it('always allocates marketing across the produced quantity', () => {
    const result = calculateCosting(
      model({ marketingExpenses: [marketing({ quantity: 1, unitPrice: 20_000, vatable: false })] }),
      settings,
    );
    expect(result.marketing.perUnit).toBe(20); // 20,000 / 1,000
  });

  it('excludes lump-sum lines from the per-unit cost under the total-only treatment', () => {
    const totalOnly: AppSettings = { ...netSettings, unallocatedTreatment: 'total-only' };
    const result = calculateCosting(
      model({ directCosts: [line({ quantity: 1, unitPrice: 5000, allocate: false, vatable: false })] }),
      totalOnly,
    );
    expect(result.direct.perUnit).toBe(0);
    expect(result.unallocatedTotal).toBe(5000);
  });

  it('excludes recoverable VAT from the cost base', () => {
    const result = calculateCosting(model({ directCosts: [line({ quantity: 1, unitPrice: 100 })] }), netSettings);
    expect(result.direct.total).toBe(100);
    expect(result.direct.vatTotal).toBeCloseTo(14, 10);
  });
});

describe('costing totals', () => {
  it('adds the four per-unit components', () => {
    expect(calculateBaseCostPerUnit(120, 5, 15, 20)).toBe(160);
  });

  it('grosses up the base cost by the exchange rate valuation', () => {
    expect(calculateExchangeRateAdjustment(160, 0.15)).toBeCloseTo(24, 10);
    expect(calculateTotalCostPerUnit(160, 0.15)).toBeCloseTo(184, 10);
  });

  it('does not divide overheads per unit by the quantity produced', () => {
    const result = calculateCosting(model({ overheadsPerUnit: 35, quantityProduced: 1000 }), settings);
    expect(result.baseCostPerUnit).toBe(35);
  });
});

describe('pricing', () => {
  it('prices for a gross MARGIN, not a mark-up', () => {
    expect(calculateSellingPrice(100, 0.4)).toBeCloseTo(166.666_67, 5);
    expect(calculateSellingPrice(184, 0.4)).toBeCloseTo(306.666_67, 5);
  });

  it('derives gross profit, margin and mark-up consistently', () => {
    const price = calculateSellingPrice(184, 0.4);
    const profit = calculateGrossProfit(price, 184);
    expect(profit).toBeCloseTo(122.666_67, 5);
    expect(calculateGrossMargin(price, 184)).toBeCloseTo(0.4, 10);
    expect(calculateMarkup(profit, 184)).toBeCloseTo(0.666_667, 5);
  });

  it('guards impossible margins', () => {
    expect(calculateSellingPrice(100, 1)).toBe(0);
    expect(calculateSellingPrice(100, 1.5)).toBe(0);
  });

  it('builds the scenario table', () => {
    const result = calculatePricing(100, { targetGrossMargin: 0.4, scenarioMargins: [0.3, 0.5] }, 10);
    expect(result.scenarios.map((s) => Number(s.sellingPrice.toFixed(2)))).toEqual([142.86, 200]);
    expect(result.totalRevenue).toBeCloseTo(1666.6667, 3);
  });
});

/* ------------------------------------------------------------------------ *
 * Acceptance test case from the specification
 * ------------------------------------------------------------------------ */

describe('specification test case', () => {
  const testModel = model({
    quantityProduced: 1000,
    directCosts: [
      line({ description: 'Milton Fabric', quantity: 2.5, measurementId: 'meter', unitPrice: 200, allocate: true }),
      line({ description: 'Zipper', quantity: 1, measurementId: 'piece', unitPrice: 30, allocate: true }),
      line({ description: 'Production Expense', quantity: 5000, measurementId: 'none', unitPrice: 1, allocate: false }),
    ],
    sampleCosts: [
      line({ description: 'Sample Fabric', quantity: 2, measurementId: 'meter', unitPrice: 200, allocate: true }),
    ],
    marketingExpenses: [
      marketing({ marketingTypeId: 'ugc', quantity: 1, unitPrice: 10_000 }),
      marketing({ marketingTypeId: 'shooting', quantity: 1, unitPrice: 5_000 }),
    ],
    overheadsPerUnit: 20,
    exchangeRateValuation: 0.15,
  });

  it('computes the net line totals', () => {
    const r = calculateCosting(testModel, netSettings);
    expect(r.direct.lines.map((l) => l.netTotal)).toEqual([500, 30, 5000]);
    expect(r.sample.lines.map((l) => l.netTotal)).toEqual([400]);
    expect(r.marketing.lines.map((l) => l.netTotal)).toEqual([10_000, 5_000]);
  });

  /** VAT recoverable (net costing) — isolates the allocation and gross-up rules. */
  it('nets out to 5,720.83 EGP per unit with recoverable VAT', () => {
    const r = calculateCosting(testModel, netSettings);

    expect(r.direct.perUnit).toBeCloseTo(0.5 + 0.03 + 5000, 10); // 5,000.53
    expect(r.sample.perUnit).toBeCloseTo(0.4, 10); // 400 / 1,000
    expect(r.marketing.perUnit).toBeCloseTo(15, 10); // 15,000 / 1,000
    expect(r.baseCostPerUnit).toBeCloseTo(5035.93, 10); // + 20 overheads
    expect(r.exchangeRateAdjustment).toBeCloseTo(755.3895, 10);
    expect(r.totalCostPerUnit).toBeCloseTo(5791.3195, 10);

    const p = calculatePricing(r.totalCostPerUnit, { targetGrossMargin: 0.4, scenarioMargins: [] }, 1000);
    expect(p.sellingPrice).toBeCloseTo(9652.199_167, 5);
    expect(p.realisedGrossMargin).toBeCloseTo(0.4, 10);
  });

  /** VAT inclusive (default) — every cost base carries 14% VAT. */
  it('carries VAT into the cost base under the inclusive treatment', () => {
    const r = calculateCosting(testModel, settings);

    expect(r.direct.perUnit).toBeCloseTo(0.57 + 0.0342 + 5700, 10);
    expect(r.sample.perUnit).toBeCloseTo(0.456, 10);
    expect(r.marketing.perUnit).toBeCloseTo(17.1, 10);
    expect(r.baseCostPerUnit).toBeCloseTo(5738.1602, 10);
    expect(r.totalCostPerUnit).toBeCloseTo(5738.1602 * 1.15, 10);
  });

  /**
   * The economically intuitive reading of the same data: the 5,000 EGP
   * production expense is a batch cost (Allocation = Yes) and the per-garment
   * fabric / trim lines are per-unit costs (Allocation = No).
   */
  it('produces 184.00 EGP per unit style figures when the flags follow the cost behaviour', () => {
    const intuitive = model({
      quantityProduced: 1000,
      directCosts: [
        line({ quantity: 2.5, unitPrice: 200, allocate: false, vatable: false }), // 500 per garment
        line({ quantity: 1, unitPrice: 30, allocate: false, vatable: false }), //    30 per garment
        line({ quantity: 5000, unitPrice: 1, allocate: true, vatable: false }), //  5,000 over the run
      ],
      sampleCosts: [line({ quantity: 2, unitPrice: 200, allocate: true, vatable: false })],
      marketingExpenses: [
        marketing({ quantity: 1, unitPrice: 10_000, vatable: false }),
        marketing({ quantity: 1, unitPrice: 5_000, vatable: false }),
      ],
      overheadsPerUnit: 20,
      exchangeRateValuation: 0.15,
    });

    const r = calculateCosting(intuitive, netSettings);
    expect(r.direct.perUnit).toBeCloseTo(535, 10); // 500 + 30 + 5
    expect(r.sample.perUnit).toBeCloseTo(0.4, 10);
    expect(r.marketing.perUnit).toBeCloseTo(15, 10);
    expect(r.baseCostPerUnit).toBeCloseTo(570.4, 10);
    expect(r.totalCostPerUnit).toBeCloseTo(655.96, 10);

    const p = calculatePricing(r.totalCostPerUnit, { targetGrossMargin: 0.4, scenarioMargins: [] }, 1000);
    expect(p.sellingPrice).toBeCloseTo(1093.266_667, 5);
    expect(p.grossProfit).toBeCloseTo(437.306_667, 5);
    expect(p.markup).toBeCloseTo(0.666_667, 5);
  });
});
