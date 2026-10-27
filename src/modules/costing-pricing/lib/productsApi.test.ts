/**
 * Round-trip tests for saved products.
 *
 * The promise the Product Library makes is that reopening a product shows the
 * same figures it was saved with. That holds only if the model AND the
 * settings travel together, so these tests save a workspace, restore it the
 * way the app does, and recompute from the engine.
 */

import { describe, expect, it } from 'vitest';

import type { SavedProductDetail } from '@shared/contracts/products';

import { createInitialState, DEFAULT_SETTINGS } from '../config/defaults';
import { calculateCosting, calculatePricing } from './calculations';
import { modelHash, toAppState, toSaveRequest } from './productsApi';
import type { AppState } from '../types/model';

function workspace(): AppState {
  const state = createInitialState();
  return {
    ...state,
    costing: {
      ...state.costing,
      product: { ...state.costing.product, name: 'Milton Shirt', code: 'SH-1042', category: 'Shirts' },
      quantityProduced: 1000,
      directCosts: [
        { id: 'a', description: 'Milton Fabric', quantity: 2.5, measurementId: 'meter', unitPrice: 200, vatable: true, allocate: false },
        { id: 'b', description: 'Zipper', quantity: 1, measurementId: 'piece', unitPrice: 30, vatable: false, allocate: false },
      ],
      marketingExpenses: [
        { id: 'm', marketingTypeId: 'ugc', description: 'UGC', quantity: 1, unitPrice: 10_000, vatable: true },
      ],
      overheadsPerUnit: 20,
      exchangeRateValuation: 0.15,
    },
    pricing: { targetGrossMargin: 0.4, scenarioMargins: [0.3, 0.4, 0.5] },
  };
}

/** What the server gives back for what the client sent. */
function savedFrom(state: AppState, id = 'p1'): SavedProductDetail {
  const body = toSaveRequest(state, null);
  return {
    id,
    name: body.name,
    code: body.code ?? '',
    category: body.category ?? '',
    costingDate: body.costingDate ?? '',
    version: body.version ?? '1',
    quantityProduced: body.quantityProduced,
    totalCostPerUnit: body.totalCostPerUnit,
    sellingPrice: body.sellingPrice,
    targetGrossMargin: body.targetGrossMargin,
    currency: body.currency ?? 'EGP',
    thumbnail: body.thumbnail ?? null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    // The API round trip is JSON, so mirror that exactly.
    costing: JSON.parse(JSON.stringify(body.costing)),
    pricing: JSON.parse(JSON.stringify(body.pricing)),
    settings: JSON.parse(JSON.stringify(body.settings)),
  };
}

describe('save payload', () => {
  it('stores totals recomputed from the model, not from the screen', () => {
    const state = workspace();
    const body = toSaveRequest(state, null);
    const costing = calculateCosting(state.costing, state.settings);
    const pricing = calculatePricing(costing.totalCostPerUnit, state.pricing, state.costing.quantityProduced);

    expect(body.totalCostPerUnit).toBeCloseTo(costing.totalCostPerUnit, 10);
    expect(body.sellingPrice).toBeCloseTo(pricing.sellingPrice, 10);
    expect(body.name).toBe('Milton Shirt');
  });

  it('names an unnamed product rather than saving an empty string', () => {
    const state = workspace();
    state.costing.product.name = '   ';
    expect(toSaveRequest(state, null).name).toBe('Untitled product');
  });
});

describe('reopening a saved product', () => {
  it('reproduces the same cost per unit and selling price', () => {
    const original = workspace();
    const saved = savedFrom(original);
    const restored = toAppState(saved, createInitialState());

    const before = calculateCosting(original.costing, original.settings);
    const after = calculateCosting(restored.costing, restored.settings);

    expect(after.totalCostPerUnit).toBeCloseTo(before.totalCostPerUnit, 10);
    expect(after.direct.perUnit).toBeCloseTo(before.direct.perUnit, 10);
    expect(after.marketing.perUnit).toBeCloseTo(before.marketing.perUnit, 10);
    expect(after.totalCostPerUnit).toBeCloseTo(saved.totalCostPerUnit, 10);

    const price = calculatePricing(after.totalCostPerUnit, restored.pricing, restored.costing.quantityProduced);
    expect(price.sellingPrice).toBeCloseTo(saved.sellingPrice, 10);
    expect(price.realisedGrossMargin).toBeCloseTo(0.4, 10);
  });

  it('keeps the settings that were in force when it was saved', () => {
    const original = workspace();
    // This product was costed with VAT recoverable at 10%.
    original.settings = { ...DEFAULT_SETTINGS, vatTreatment: 'recoverable', vatRate: 0.1 };
    const savedTotal = toSaveRequest(original, null).totalCostPerUnit;

    const saved = savedFrom(original);
    // The workspace has since moved to VAT-inclusive costing at 14%.
    const current = { ...createInitialState(), settings: DEFAULT_SETTINGS };
    const restored = toAppState(saved, current);

    expect(restored.settings.vatTreatment).toBe('recoverable');
    expect(restored.settings.vatRate).toBe(0.1);
    expect(calculateCosting(restored.costing, restored.settings).totalCostPerUnit).toBeCloseTo(savedTotal, 10);
  });

  it('links the workspace to the product and starts with no unsaved changes', () => {
    const restored = toAppState(savedFrom(workspace()), createInitialState());
    expect(restored.savedProductId).toBe('p1');
    expect(restored.savedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(restored.savedHash).toBe(modelHash(restored));
  });

  it('fills in anything an older record is missing', () => {
    const saved = { ...savedFrom(workspace()), pricing: null, settings: null };
    const restored = toAppState(saved as unknown as SavedProductDetail, createInitialState());

    expect(restored.pricing.targetGrossMargin).toBe(0.4);
    expect(restored.settings.currency).toBe('EGP');
  });
});

describe('change detection', () => {
  it('only changes the hash when stored data changes', () => {
    const state = workspace();
    const hash = modelHash(state);

    expect(modelHash({ ...state, savedAt: 'later' } as AppState)).toBe(hash);
    expect(modelHash({ ...state, costing: { ...state.costing, overheadsPerUnit: 21 } })).not.toBe(hash);
    expect(modelHash({ ...state, pricing: { ...state.pricing, targetGrossMargin: 0.45 } })).not.toBe(hash);
    expect(modelHash({ ...state, settings: { ...state.settings, vatRate: 0.2 } })).not.toBe(hash);
  });
});
