/**
 * Local persistence. Isolated behind this module so that swapping localStorage
 * for an API / database later only touches this file.
 */

import type { AppState, CostLine, MarketingLine } from '../types/model';
import { createInitialState, DEFAULT_SETTINGS } from '../config/defaults';

const STORAGE_KEY = 'costing-pricing-model:v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = createInitialState();
    // Shallow-merge so that new fields added in later versions get defaults.
    const state: AppState = {
      costing: { ...base.costing, ...parsed.costing },
      pricing: { ...base.pricing, ...parsed.pricing },
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
    return migrate(state, parsed);
  } catch {
    return createInitialState();
  }
}

/**
 * Persists the model. Returns false when the browser refused to store it
 * (private mode, or the quota exceeded by a large photo) so the UI can warn
 * the user that this session will not survive a reload.
 */
export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * Upgrades models saved by earlier versions.
 *
 * v1 stored a numeric `vatRate` on every line; VAT is now a per-line checkbox
 * driven by a single rate in Settings, so a stored rate above zero becomes a
 * ticked checkbox.
 */
function migrate(state: AppState, parsed: Partial<AppState>): AppState {
  const legacySettings = parsed.settings as (Partial<AppState['settings']> & { defaultVatRate?: number }) | undefined;
  if (typeof legacySettings?.defaultVatRate === 'number' && parsed.settings && !('vatRate' in parsed.settings)) {
    state.settings.vatRate = legacySettings.defaultVatRate;
  }

  const upgradeLine = <T extends CostLine | MarketingLine>(line: T): T => {
    const legacy = line as T & { vatRate?: number };
    if (typeof legacy.vatable === 'boolean') return line;
    const { vatRate, ...rest } = legacy;
    return { ...rest, vatable: (vatRate ?? 0) > 0 } as T;
  };

  state.costing = {
    ...state.costing,
    directCosts: state.costing.directCosts.map(upgradeLine),
    sampleCosts: state.costing.sampleCosts.map(upgradeLine),
    marketingExpenses: state.costing.marketingExpenses.map(upgradeLine),
  };

  return state;
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
