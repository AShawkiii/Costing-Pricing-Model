/**
 * Reducer for the whole application state.
 * Kept separate from React so the transitions are unit-testable.
 */

import type {
  AppSettings,
  AppState,
  CostLine,
  MarketingLine,
  ProductInfo,
} from '../types/model';
import {
  createCostLine,
  createCostingModel,
  createMarketingLine,
  createPricingModel,
} from '../config/defaults';
import { createId } from '../lib/id';

/** The two cost tables share one implementation. */
export type CostSectionKey = 'directCosts' | 'sampleCosts';

export type Action =
  | { type: 'setQuantityProduced'; value: number }
  | { type: 'setProductField'; field: keyof ProductInfo; value: string }
  | { type: 'addCostLine'; section: CostSectionKey }
  | { type: 'updateCostLine'; section: CostSectionKey; id: string; patch: Partial<CostLine> }
  | { type: 'removeCostLine'; section: CostSectionKey; id: string }
  | { type: 'duplicateCostLine'; section: CostSectionKey; id: string }
  | { type: 'addMarketingLine' }
  | { type: 'updateMarketingLine'; id: string; patch: Partial<MarketingLine> }
  | { type: 'removeMarketingLine'; id: string }
  | { type: 'duplicateMarketingLine'; id: string }
  | { type: 'setOverheadsPerUnit'; value: number }
  | { type: 'setExchangeRateValuation'; value: number }
  | { type: 'setTargetGrossMargin'; value: number }
  | { type: 'setScenarioMargins'; value: number[] }
  | { type: 'updateSettings'; patch: Partial<AppSettings> }
  | { type: 'applyVatRateToAllLines'; value: number }
  | { type: 'loadState'; state: AppState }
  | { type: 'resetModel' };

function replaceLine<T extends { id: string }>(lines: T[], id: string, patch: Partial<T>): T[] {
  return lines.map((line) => (line.id === id ? { ...line, ...patch } : line));
}

function duplicate<T extends { id: string }>(lines: T[], id: string, prefix: string): T[] {
  const index = lines.findIndex((l) => l.id === id);
  if (index === -1) return lines;
  const copy = { ...lines[index], id: createId(prefix) };
  return [...lines.slice(0, index + 1), copy, ...lines.slice(index + 1)];
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setQuantityProduced':
      return { ...state, costing: { ...state.costing, quantityProduced: action.value } };

    case 'setProductField':
      return {
        ...state,
        costing: {
          ...state.costing,
          product: { ...state.costing.product, [action.field]: action.value },
        },
      };

    case 'addCostLine':
      return {
        ...state,
        costing: {
          ...state.costing,
          [action.section]: [
            ...state.costing[action.section],
            createCostLine(state.settings.defaultVatRate),
          ],
        },
      };

    case 'updateCostLine':
      return {
        ...state,
        costing: {
          ...state.costing,
          [action.section]: replaceLine(state.costing[action.section], action.id, action.patch),
        },
      };

    case 'removeCostLine':
      return {
        ...state,
        costing: {
          ...state.costing,
          [action.section]: state.costing[action.section].filter((l) => l.id !== action.id),
        },
      };

    case 'duplicateCostLine':
      return {
        ...state,
        costing: {
          ...state.costing,
          [action.section]: duplicate(state.costing[action.section], action.id, 'line'),
        },
      };

    case 'addMarketingLine':
      return {
        ...state,
        costing: {
          ...state.costing,
          marketingExpenses: [
            ...state.costing.marketingExpenses,
            createMarketingLine(state.settings.defaultVatRate),
          ],
        },
      };

    case 'updateMarketingLine':
      return {
        ...state,
        costing: {
          ...state.costing,
          marketingExpenses: replaceLine(state.costing.marketingExpenses, action.id, action.patch),
        },
      };

    case 'removeMarketingLine':
      return {
        ...state,
        costing: {
          ...state.costing,
          marketingExpenses: state.costing.marketingExpenses.filter((l) => l.id !== action.id),
        },
      };

    case 'duplicateMarketingLine':
      return {
        ...state,
        costing: {
          ...state.costing,
          marketingExpenses: duplicate(state.costing.marketingExpenses, action.id, 'mkt'),
        },
      };

    case 'setOverheadsPerUnit':
      return { ...state, costing: { ...state.costing, overheadsPerUnit: action.value } };

    case 'setExchangeRateValuation':
      return { ...state, costing: { ...state.costing, exchangeRateValuation: action.value } };

    case 'setTargetGrossMargin':
      return { ...state, pricing: { ...state.pricing, targetGrossMargin: action.value } };

    case 'setScenarioMargins':
      return { ...state, pricing: { ...state.pricing, scenarioMargins: action.value } };

    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    /** Applies a new VAT rate to every existing line (used by Settings). */
    case 'applyVatRateToAllLines':
      return {
        ...state,
        costing: {
          ...state.costing,
          directCosts: state.costing.directCosts.map((l) => ({ ...l, vatRate: action.value })),
          sampleCosts: state.costing.sampleCosts.map((l) => ({ ...l, vatRate: action.value })),
          marketingExpenses: state.costing.marketingExpenses.map((l) => ({
            ...l,
            vatRate: action.value,
          })),
        },
      };

    case 'loadState':
      return action.state;

    /** New Costing: fresh model, user settings preserved. */
    case 'resetModel':
      return {
        costing: createCostingModel(state.settings.defaultVatRate),
        pricing: createPricingModel(),
        settings: state.settings, // user preferences survive a new costing
      };

    default:
      return state;
  }
}
