/**
 * Local persistence. Isolated behind this module so that swapping localStorage
 * for an API / database later only touches this file.
 */

import type { AppState } from '../types/model';
import { createInitialState, DEFAULT_SETTINGS } from '../config/defaults';

const STORAGE_KEY = 'costing-pricing-model:v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = createInitialState();
    // Shallow-merge so that new fields added in later versions get defaults.
    return {
      costing: { ...base.costing, ...parsed.costing },
      pricing: { ...base.pricing, ...parsed.pricing },
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode / quota) - the app still works */
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
