/**
 * Saved-products API calls for this module, plus the mapping between the
 * workspace state and what the server stores.
 *
 * The mapping is the contract that keeps a reopened product consistent: the
 * model, the pricing inputs AND the settings in force at save time all travel
 * together, so the engine recomputes exactly the figures that were approved.
 */

import { apiRequest } from '@shared/api/client';
import { hashValue } from '@shared/lib/hash';
import type {
  ListProductsQuery,
  ListProductsResponse,
  SaveProductRequest,
  SavedProductDetail,
} from '@shared/contracts/products';

import type { AppSettings, AppState, CostingModel, PricingModel } from '../types/model';
import { calculateCosting, calculatePricing } from './calculations';
import { DEFAULT_SETTINGS, createPricingModel } from '../config/defaults';

export async function fetchProducts(query: ListProductsQuery = {}): Promise<ListProductsResponse> {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.category) params.set('category', query.category);
  if (query.sort) params.set('sort', query.sort);

  const suffix = params.toString();
  return apiRequest<ListProductsResponse>(`/products${suffix ? `?${suffix}` : ''}`);
}

export function fetchProduct(id: string): Promise<SavedProductDetail> {
  return apiRequest<SavedProductDetail>(`/products/${id}`);
}

export function createProduct(body: SaveProductRequest): Promise<SavedProductDetail> {
  return apiRequest<SavedProductDetail>('/products', { method: 'POST', body: JSON.stringify(body) });
}

export function updateProduct(id: string, body: SaveProductRequest): Promise<SavedProductDetail> {
  return apiRequest<SavedProductDetail>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export function duplicateProduct(id: string): Promise<SavedProductDetail> {
  return apiRequest<SavedProductDetail>(`/products/${id}/duplicate`, { method: 'POST' });
}

export function deleteProduct(id: string): Promise<void> {
  return apiRequest<void>(`/products/${id}`, { method: 'DELETE' });
}

/**
 * Builds the save payload from the workspace.
 *
 * The totals are recomputed here rather than read from the UI, so what is
 * stored always matches the model being stored.
 */
export function toSaveRequest(state: AppState, thumbnail: string | null): SaveProductRequest {
  const costing = calculateCosting(state.costing, state.settings);
  const pricing = calculatePricing(costing.totalCostPerUnit, state.pricing, state.costing.quantityProduced);
  const { product } = state.costing;

  return {
    name: product.name.trim() || 'Untitled product',
    code: product.code,
    category: product.category,
    costingDate: product.costingDate,
    version: product.version ?? '1',
    quantityProduced: state.costing.quantityProduced,
    totalCostPerUnit: costing.totalCostPerUnit,
    sellingPrice: pricing.sellingPrice,
    targetGrossMargin: state.pricing.targetGrossMargin,
    currency: state.settings.currency,
    thumbnail,
    costing: state.costing,
    pricing: state.pricing,
    settings: state.settings,
  };
}

/**
 * Restores a saved product into workspace state.
 *
 * Anything missing from an older record falls back to the current defaults,
 * so a product saved by an earlier version still opens.
 */
export function toAppState(product: SavedProductDetail, fallback: AppState): AppState {
  const costing = product.costing as Partial<CostingModel> | null;
  const pricing = product.pricing as Partial<PricingModel> | null;
  const settings = product.settings as Partial<AppSettings> | null;

  const restored = {
    costing: { ...fallback.costing, ...(costing ?? {}) },
    pricing: { ...createPricingModel(), ...(pricing ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
  };

  return {
    ...restored,
    savedProductId: product.id,
    savedAt: product.updatedAt,
    // Freshly opened means no unsaved changes yet.
    savedHash: modelHash(restored),
  };
}

/**
 * Identifies the saved state of the workspace. Only the parts that are stored
 * count, so navigating or reopening a product never looks like an edit.
 */
export function modelHash(state: Pick<AppState, 'costing' | 'pricing' | 'settings'>): string {
  return hashValue({ costing: state.costing, pricing: state.pricing, settings: state.settings });
}
