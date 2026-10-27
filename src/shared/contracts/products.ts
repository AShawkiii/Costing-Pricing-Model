/**
 * ---------------------------------------------------------------------------
 * SAVED PRODUCTS — API CONTRACT
 * ---------------------------------------------------------------------------
 * The single definition of what travels between the browser and the Finance
 * Support server. Both sides import this file, so a change to the shape is a
 * compile error on the side that has not caught up.
 *
 * A saved product carries the WHOLE costing model plus the settings that were
 * in force when it was saved (VAT rate and treatment, currency, allocation
 * rule). Reopening it therefore reproduces exactly the figures the user
 * approved, even if the workspace defaults have changed since.
 *
 * The numeric fields on the summary are denormalised copies of calculated
 * results. They exist so the library list can be sorted and read without
 * loading every model; the authoritative figures are always recomputed from
 * the model by the calculation engine when a product is opened.
 * ---------------------------------------------------------------------------
 */

/** Row shown in the Product Library list. Never includes the full model. */
export interface SavedProductSummary {
  id: string;
  name: string;
  code: string;
  category: string;
  costingDate: string;
  version: string;
  quantityProduced: number;
  totalCostPerUnit: number;
  sellingPrice: number;
  targetGrossMargin: number;
  currency: string;
  /** Small JPEG data URL (or null) — the library list stays light. */
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A saved product with everything needed to restore the workspace. */
export interface SavedProductDetail extends SavedProductSummary {
  /** CostingModel as stored — typed on the client by the module. */
  costing: unknown;
  /** PricingModel as stored. */
  pricing: unknown;
  /** AppSettings snapshot taken at save time. */
  settings: unknown;
}

/** Body of POST /api/products and PUT /api/products/:id. */
export interface SaveProductRequest {
  name: string;
  code?: string;
  category?: string;
  costingDate?: string;
  version?: string;
  quantityProduced: number;
  totalCostPerUnit: number;
  sellingPrice: number;
  targetGrossMargin: number;
  currency?: string;
  thumbnail?: string | null;
  costing: unknown;
  pricing: unknown;
  settings: unknown;
}

export type ProductSort = 'updated' | 'created' | 'name' | 'cost' | 'price';

export interface ListProductsQuery {
  /** Free text matched against name, code and category. */
  q?: string;
  category?: string;
  sort?: ProductSort;
}

export interface ListProductsResponse {
  products: SavedProductSummary[];
  /** Every distinct category in the library, for the filter dropdown. */
  categories: string[];
  total: number;
}

/** Error body returned by every failing endpoint. */
export interface ApiErrorBody {
  error: {
    code: 'validation_failed' | 'not_found' | 'server_error';
    message: string;
    /** Field-level problems, when the request failed validation. */
    details?: string[];
  };
}

export const PRODUCT_SORTS: ProductSort[] = ['updated', 'created', 'name', 'cost', 'price'];

/** Longest values accepted by the server, mirrored by the client inputs. */
export const LIMITS = {
  name: 200,
  code: 80,
  category: 120,
  /** A product photo is downscaled before saving; this is a generous ceiling. */
  documentBytes: 8 * 1024 * 1024,
} as const;
