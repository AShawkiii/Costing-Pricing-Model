/**
 * React binding for the application state.
 *
 * The provider owns the reducer, persists to localStorage, and exposes the
 * derived costing / pricing results. Because every result comes from the pure
 * calculation engine, all totals recompute on every keystroke - no refresh,
 * no manual "calculate" button.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import type { AppState } from '../types/model';
import { calculateCosting, calculatePricing, type CostingResult, type PricingResult } from '../lib/calculations';
import { validateCosting, validatePricing, type ValidationIssue } from '../lib/validation';
import { loadState, saveState } from '../lib/storage';
import { reducer, type Action } from './store';

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  costing: CostingResult;
  pricing: PricingResult;
  costingIssues: ValidationIssue[];
  pricingIssues: ValidationIssue[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // Persist on every change (debounced by the browser's own event loop).
  useEffect(() => {
    saveState(state);
  }, [state]);

  const costing = useMemo(
    () => calculateCosting(state.costing, state.settings),
    [state.costing, state.settings],
  );

  const pricing = useMemo(
    () => calculatePricing(costing.totalCostPerUnit, state.pricing, state.costing.quantityProduced),
    [costing.totalCostPerUnit, state.pricing, state.costing.quantityProduced],
  );

  const costingIssues = useMemo(() => validateCosting(state), [state]);
  const pricingIssues = useMemo(() => validatePricing(state), [state]);

  const value = useMemo(
    () => ({ state, dispatch, costing, pricing, costingIssues, pricingIssues }),
    [state, costing, pricing, costingIssues, pricingIssues],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppStateProvider>');
  return ctx;
}

/** Convenience hook for currency / percentage formatting with user settings. */
export function useSettings() {
  return useApp().state.settings;
}
