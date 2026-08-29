/** Formatting helpers bound to the user's currency / locale settings. */

import { useMemo } from 'react';
import { useSettings } from '../state/AppStateContext';
import { formatCurrency, formatInteger, formatNumber, formatPercent, formatQuantity } from '@shared/lib/format';

export function useFormatters() {
  const { currency, locale } = useSettings();
  return useMemo(
    () => ({
      currency,
      locale,
      /** "1,250.00 EGP" */
      money: (v: number) => formatCurrency(v, currency, locale),
      /** "1,250.00" (no currency suffix — used inside dense tables) */
      num: (v: number) => formatNumber(v, locale),
      int: (v: number) => formatInteger(v, locale),
      qty: (v: number) => formatQuantity(v, locale),
      pct: (v: number) => formatPercent(v),
    }),
    [currency, locale],
  );
}
