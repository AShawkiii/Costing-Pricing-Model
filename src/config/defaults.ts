/**
 * Application defaults and configurable option lists.
 * Everything here is data, so it can later be moved to a database or an API
 * without touching the components or the calculation engine.
 */

import type { AppSettings, AppState, CostingModel, PricingModel } from '../types/model';
import { createId } from '../lib/id';

/** Measurement units available in the Direct / Sample cost tables. */
export const DEFAULT_MEASUREMENTS = [
  { id: 'cm', label: 'CM' },
  { id: 'meter', label: 'Meter' },
  { id: 'kg', label: 'KG' },
  { id: 'gram', label: 'Gram' },
  { id: 'piece', label: 'Piece' },
  { id: 'unit', label: 'Unit' },
  { id: 'hour', label: 'Hour' },
  { id: 'day', label: 'Day' },
  { id: 'none', label: 'None' },
];

/** Marketing expense categories. */
export const DEFAULT_MARKETING_TYPES = [
  { id: 'pr', label: 'PR' },
  { id: 'ugc', label: 'UGC Fees' },
  { id: 'shooting', label: 'Shooting Expense' },
  { id: 'photography', label: 'Photography' },
  { id: 'videography', label: 'Videography' },
  { id: 'influencer', label: 'Influencer Fees' },
  { id: 'content', label: 'Content Creation' },
  { id: 'social', label: 'Social Media' },
  { id: 'ads', label: 'Paid Ads' },
  { id: 'campaign', label: 'Campaign Expense' },
  { id: 'design', label: 'Graphic Design' },
  { id: 'models', label: 'Models' },
  { id: 'styling', label: 'Styling' },
  { id: 'events', label: 'Events' },
  { id: 'influencer-samples', label: 'Samples for Influencers' },
  { id: 'other', label: 'Other' },
];

/** Default VAT rate in Egypt (14%), configurable in Settings. */
export const DEFAULT_VAT_RATE = 0.14;
export const DEFAULT_EXCHANGE_RATE_VALUATION = 0.15;
export const DEFAULT_TARGET_MARGIN = 0.4;
export const DEFAULT_SCENARIO_MARGINS = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6];

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'EGP',
  locale: 'en-EG',
  vatRate: DEFAULT_VAT_RATE,
  vatableByDefault: true,
  vatTreatment: 'inclusive',
  unallocatedTreatment: 'per-unit',
  measurements: DEFAULT_MEASUREMENTS,
  marketingTypes: DEFAULT_MARKETING_TYPES,
};

export function createCostLine(vatable = true) {
  return {
    id: createId('line'),
    description: '',
    quantity: 0,
    measurementId: 'piece',
    unitPrice: 0,
    vatable, // VAT is a checkbox: ticked = taxed at the Settings rate
    allocate: true, // Allocation defaults to Yes
  };
}

export function createMarketingLine(vatable = true) {
  return {
    id: createId('mkt'),
    marketingTypeId: 'ugc',
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatable,
  };
}

export function createCostingModel(vatable = true): CostingModel {
  return {
    id: createId('costing'),
    product: {
      name: '',
      code: '',
      category: '',
      costingDate: new Date().toISOString().slice(0, 10),
      version: '1',
      approvalStatus: 'draft',
    },
    quantityProduced: 1000,
    directCosts: [createCostLine(vatable)],
    sampleCosts: [],
    marketingExpenses: [],
    overheadsPerUnit: 0,
    exchangeRateValuation: DEFAULT_EXCHANGE_RATE_VALUATION,
  };
}

export function createPricingModel(): PricingModel {
  return {
    targetGrossMargin: DEFAULT_TARGET_MARGIN,
    scenarioMargins: [...DEFAULT_SCENARIO_MARGINS],
  };
}

export function createInitialState(): AppState {
  return {
    costing: createCostingModel(),
    pricing: createPricingModel(),
    settings: DEFAULT_SETTINGS,
  };
}
