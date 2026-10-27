/**
 * Request validation for the products API.
 *
 * The browser validates for a good experience; the server validates because
 * it is the system of record. Returns the cleaned request or a list of
 * problems — never throws for bad input.
 */

import { LIMITS, PRODUCT_SORTS, type ListProductsQuery, type SaveProductRequest } from '../src/shared/contracts/products.ts';

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateSaveProduct(body: unknown): ValidationResult<SaveProductRequest> {
  const errors: string[] = [];
  if (!isPlainObject(body)) return { ok: false, errors: ['The request body must be a product object.'] };

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) errors.push('Product name is required.');
  if (name.length > LIMITS.name) errors.push(`Product name must be ${LIMITS.name} characters or fewer.`);

  const text = (key: 'code' | 'category' | 'costingDate' | 'version', max: number = LIMITS.code) => {
    const raw = body[key];
    if (raw === undefined || raw === null) return '';
    if (typeof raw !== 'string') {
      errors.push(`${key} must be text.`);
      return '';
    }
    if (raw.length > max) errors.push(`${key} must be ${max} characters or fewer.`);
    return raw.trim();
  };

  const code = text('code');
  const category = text('category', LIMITS.category);
  const costingDate = text('costingDate');
  const version = text('version');

  const num = (key: 'quantityProduced' | 'totalCostPerUnit' | 'sellingPrice' | 'targetGrossMargin') => {
    const raw = body[key];
    if (!isFiniteNumber(raw)) {
      errors.push(`${key} must be a number.`);
      return 0;
    }
    if (raw < 0) errors.push(`${key} cannot be negative.`);
    return raw;
  };

  const quantityProduced = num('quantityProduced');
  const totalCostPerUnit = num('totalCostPerUnit');
  const sellingPrice = num('sellingPrice');
  const targetGrossMargin = num('targetGrossMargin');
  if (targetGrossMargin >= 1) errors.push('targetGrossMargin must be below 100%.');

  for (const key of ['costing', 'pricing', 'settings'] as const) {
    if (!isPlainObject(body[key])) errors.push(`${key} must be an object.`);
  }

  let thumbnail: string | null = null;
  if (typeof body.thumbnail === 'string' && body.thumbnail !== '') {
    if (!body.thumbnail.startsWith('data:image/')) errors.push('thumbnail must be an image data URL.');
    else thumbnail = body.thumbnail;
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      code,
      category,
      costingDate,
      version: version || '1',
      quantityProduced,
      totalCostPerUnit,
      sellingPrice,
      targetGrossMargin,
      currency: typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim() : 'EGP',
      thumbnail,
      costing: body.costing,
      pricing: body.pricing,
      settings: body.settings,
    },
  };
}

/** Query strings are untrusted: the sort option is matched against a list. */
export function parseListQuery(query: Record<string, unknown>): ListProductsQuery {
  const str = (value: unknown) => (typeof value === 'string' ? value : undefined);
  const sort = str(query.sort);

  return {
    q: str(query.q),
    category: str(query.category),
    sort: PRODUCT_SORTS.includes(sort as never) ? (sort as ListProductsQuery['sort']) : 'updated',
  };
}
