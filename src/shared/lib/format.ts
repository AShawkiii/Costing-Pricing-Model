/**
 * Presentation-layer formatting. Rounding happens here only - never inside the
 * calculation engine - so intermediate results keep full precision.
 */

const DECIMALS = 2;

/** 1250.5 -> "1,250.50 EGP" */
export function formatCurrency(value: number, currency = 'EGP', locale = 'en-EG'): string {
  return `${formatNumber(value, locale)} ${currency}`;
}

/** 1250.5 -> "1,250.50" (thousands separators, 2 decimals). */
export function formatNumber(value: number, locale = 'en-EG', decimals = DECIMALS): string {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 1000 -> "1,000" (used for Quantity Produced and other whole numbers). */
export function formatInteger(value: number, locale = 'en-EG'): string {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString(locale, { maximumFractionDigits: 0 });
}

/** Quantities may be fractional (2.5 m) but should not show trailing zeros. */
export function formatQuantity(value: number, locale = 'en-EG'): string {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString(locale, { maximumFractionDigits: 3 });
}

/** 0.14 -> "14%" ; 0.6667 -> "66.67%" */
export function formatPercent(fraction: number, decimals = DECIMALS): string {
  const n = Number.isFinite(fraction) ? fraction : 0;
  const pct = n * 100;
  const rounded = Number(pct.toFixed(decimals));
  return `${rounded.toLocaleString('en-US', { maximumFractionDigits: decimals })}%`;
}

/** Rounds to 2 decimals for display/export purposes. */
export function round(value: number, decimals = DECIMALS): number {
  const factor = 10 ** decimals;
  return Math.round((Number.isFinite(value) ? value : 0) * factor) / factor;
}
