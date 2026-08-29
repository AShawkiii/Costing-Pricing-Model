/**
 * Domain model for the Costing & Pricing application.
 *
 * The model is deliberately serialisable (plain JSON) so it can later be
 * persisted to a database, versioned, compared, or exported without changes
 * to the calculation engine or the UI.
 */

/** Unit of measurement used on a cost line. Configurable in Settings. */
export interface MeasurementOption {
  id: string;
  label: string;
}

/** Marketing expense category. Configurable in Settings. */
export interface MarketingTypeOption {
  id: string;
  label: string;
}

/**
 * How a cost line behaves when it is NOT allocated across the produced
 * quantity (Allocation = No).
 *
 *  - `per-unit`  : the line total is a cost incurred for every unit, so it is
 *                  added to the cost per unit as-is. (Specification default:
 *                  "Total Price = Total".)
 *  - `total-only`: the line total stays a lump-sum production cost. It is
 *                  reported separately and is excluded from the cost per unit.
 */
export type UnallocatedTreatment = 'per-unit' | 'total-only';

/**
 * How VAT participates in the costing.
 *
 *  - `inclusive`  : VAT is a real cost (business cannot recover input VAT),
 *                   so the cost base of a line is Net + VAT.
 *  - `recoverable`: input VAT is reclaimable, so the cost base is the net
 *                   amount. VAT is still calculated and displayed for
 *                   information / cash-flow purposes.
 */
export type VatTreatment = 'inclusive' | 'recoverable';

/** A single line inside the Direct Cost or Sample Cost tables. */
export interface CostLine {
  id: string;
  description: string;
  quantity: number;
  measurementId: string;
  unitPrice: number;
  /**
   * Is this line VATed? Ticked -> VAT is calculated at the rate configured in
   * Settings (14% by default). Unticked -> the line carries no VAT at all.
   */
  vatable: boolean;
  /** Yes = spread the line over Quantity Produced. */
  allocate: boolean;
}

/** A single line inside the Marketing Expenses table. */
export interface MarketingLine {
  id: string;
  marketingTypeId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  /** Is this line VATed? See CostLine.vatable. */
  vatable: boolean;
  /* Marketing expenses are ALWAYS allocated across Quantity Produced. */
}

/**
 * A product photo held inside the model.
 *
 * Images are downscaled and re-encoded before they are stored (see
 * lib/image.ts) so the model stays small enough to persist locally and to be
 * sent to a backend later as an ordinary JSON field.
 */
export interface ProductPhoto {
  /** Data URL (base64) of the compressed image. */
  dataUrl: string;
  /** Original file name, kept for the cost sheet and future uploads. */
  name: string;
  width: number;
  height: number;
  /** Size of the stored data URL in bytes. */
  bytes: number;
}

/** Optional descriptive information about the product being costed. */
export interface ProductInfo {
  name: string;
  code: string;
  category: string;
  costingDate: string; // ISO yyyy-mm-dd
  /** Optional product photo shown on the costing card and the cost sheet. */
  photo?: ProductPhoto;
  /* Future-ready placeholders (kept in the model, not yet surfaced in the UI):
     supplier, fabricType, collection, version, user, approvalStatus. */
  supplier?: string;
  fabricType?: string;
  collection?: string;
  version?: string;
  createdBy?: string;
  approvalStatus?: 'draft' | 'submitted' | 'approved' | 'rejected';
}

/** Application-level settings (defaults that can be changed by the user). */
export interface AppSettings {
  currency: string;
  locale: string;
  /** VAT rate applied to every VATed line, as a fraction (0.14 = 14%). */
  vatRate: number;
  /** Are new cost lines created as VATed? */
  vatableByDefault: boolean;
  vatTreatment: VatTreatment;
  unallocatedTreatment: UnallocatedTreatment;
  measurements: MeasurementOption[];
  marketingTypes: MarketingTypeOption[];
}

/** The full costing model — everything needed to compute a cost per unit. */
export interface CostingModel {
  id: string;
  product: ProductInfo;
  quantityProduced: number;
  directCosts: CostLine[];
  sampleCosts: CostLine[];
  marketingExpenses: MarketingLine[];
  /** Fixed amount per unit — never divided by Quantity Produced. */
  overheadsPerUnit: number;
  /** Gross-up factor applied to the base cost per unit (0.15 = 15%). */
  exchangeRateValuation: number;
}

/** The pricing inputs that sit on top of a costing model. */
export interface PricingModel {
  /** Target gross profit margin as a fraction (0.4 = 40%). */
  targetGrossMargin: number;
  /** Margins shown in the scenario table, as fractions. */
  scenarioMargins: number[];
}

/** Everything the app persists. */
export interface AppState {
  costing: CostingModel;
  pricing: PricingModel;
  settings: AppSettings;
}
