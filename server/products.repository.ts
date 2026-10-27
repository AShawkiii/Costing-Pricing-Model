/**
 * Product repository — every SQL statement in the system lives here.
 *
 * Pure data access: no HTTP, no Express. The API layer validates input and
 * maps errors; this module reads and writes rows.
 */

import { randomUUID } from 'node:crypto';

import type {
  ListProductsQuery,
  ProductSort,
  SaveProductRequest,
  SavedProductDetail,
  SavedProductSummary,
} from '../src/shared/contracts/products.ts';
import type { Database } from './db.ts';

interface ProductRow {
  id: string;
  name: string;
  code: string;
  category: string;
  costing_date: string;
  version: string;
  quantity_produced: number;
  total_cost_per_unit: number;
  selling_price: number;
  target_gross_margin: number;
  currency: string;
  thumbnail: string | null;
  costing_json: string;
  pricing_json: string;
  settings_json: string;
  created_at: string;
  updated_at: string;
}

const SUMMARY_COLUMNS = `
  id, name, code, category, costing_date, version, quantity_produced,
  total_cost_per_unit, selling_price, target_gross_margin, currency,
  thumbnail, created_at, updated_at
`;

/** SQL fragment per sort option — never built from raw user input. */
const ORDER_BY: Record<ProductSort, string> = {
  updated: 'updated_at DESC',
  created: 'created_at DESC',
  name: 'name COLLATE NOCASE ASC',
  cost: 'total_cost_per_unit DESC',
  price: 'selling_price DESC',
};

function toSummary(row: Omit<ProductRow, 'costing_json' | 'pricing_json' | 'settings_json'>): SavedProductSummary {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    category: row.category,
    costingDate: row.costing_date,
    version: row.version,
    quantityProduced: row.quantity_produced,
    totalCostPerUnit: row.total_cost_per_unit,
    sellingPrice: row.selling_price,
    targetGrossMargin: row.target_gross_margin,
    currency: row.currency,
    thumbnail: row.thumbnail,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDetail(row: ProductRow): SavedProductDetail {
  return {
    ...toSummary(row),
    costing: JSON.parse(row.costing_json),
    pricing: JSON.parse(row.pricing_json),
    settings: JSON.parse(row.settings_json),
  };
}

export class ProductRepository {
  readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  list(query: ListProductsQuery = {}): { products: SavedProductSummary[]; categories: string[]; total: number } {
    const where: string[] = [];
    const params: Record<string, string> = {};

    if (query.q?.trim()) {
      // Matched against the three fields a user would recognise a product by.
      where.push('(name LIKE :q COLLATE NOCASE OR code LIKE :q COLLATE NOCASE OR category LIKE :q COLLATE NOCASE)');
      params.q = `%${query.q.trim()}%`;
    }
    if (query.category?.trim()) {
      where.push('category = :category COLLATE NOCASE');
      params.category = query.category.trim();
    }

    const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const order = ORDER_BY[query.sort ?? 'updated'] ?? ORDER_BY.updated;

    const rows = this.db
      .prepare(`SELECT ${SUMMARY_COLUMNS} FROM products ${clause} ORDER BY ${order}`)
      .all(params) as Array<Omit<ProductRow, 'costing_json' | 'pricing_json' | 'settings_json'>>;

    const categories = (
      this.db
        .prepare("SELECT DISTINCT category FROM products WHERE category <> '' ORDER BY category COLLATE NOCASE")
        .all() as Array<{ category: string }>
    ).map((r) => r.category);

    const { total } = this.db.prepare('SELECT COUNT(*) AS total FROM products').get() as { total: number };

    return { products: rows.map(toSummary), categories, total };
  }

  get(id: string): SavedProductDetail | undefined {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
    return row ? toDetail(row) : undefined;
  }

  create(input: SaveProductRequest, now = new Date().toISOString()): SavedProductDetail {
    const id = randomUUID();

    this.db
      .prepare(
        `INSERT INTO products (
           id, name, code, category, costing_date, version, quantity_produced,
           total_cost_per_unit, selling_price, target_gross_margin, currency,
           thumbnail, costing_json, pricing_json, settings_json, created_at, updated_at
         ) VALUES (
           :id, :name, :code, :category, :costing_date, :version, :quantity_produced,
           :total_cost_per_unit, :selling_price, :target_gross_margin, :currency,
           :thumbnail, :costing_json, :pricing_json, :settings_json, :created_at, :updated_at
         )`,
      )
      .run({ id, ...columns(input), created_at: now, updated_at: now });

    return this.get(id)!;
  }

  update(id: string, input: SaveProductRequest, now = new Date().toISOString()): SavedProductDetail | undefined {
    const result = this.db
      .prepare(
        `UPDATE products SET
           name = :name, code = :code, category = :category, costing_date = :costing_date,
           version = :version, quantity_produced = :quantity_produced,
           total_cost_per_unit = :total_cost_per_unit, selling_price = :selling_price,
           target_gross_margin = :target_gross_margin, currency = :currency,
           thumbnail = :thumbnail, costing_json = :costing_json, pricing_json = :pricing_json,
           settings_json = :settings_json, updated_at = :updated_at
         WHERE id = :id`,
      )
      .run({ id, ...columns(input), updated_at: now });

    return result.changes > 0 ? this.get(id) : undefined;
  }

  /**
   * Copies a product, including its model, settings and photo.
   * The copy is a new product: new id, new timestamps, " (copy)" appended to
   * the name, so the original is never touched.
   */
  duplicate(id: string, now = new Date().toISOString()): SavedProductDetail | undefined {
    const source = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
    if (!source) return undefined;

    const newId = randomUUID();
    this.db
      .prepare(
        `INSERT INTO products
           SELECT :newId, :name, code, category, costing_date, version, quantity_produced,
                  total_cost_per_unit, selling_price, target_gross_margin, currency,
                  thumbnail, costing_json, pricing_json, settings_json, :now, :now
           FROM products WHERE id = :id`,
      )
      .run({ newId, id, name: copyName(source.name), now });

    return this.get(newId);
  }

  remove(id: string): boolean {
    return this.db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0;
  }

  count(): number {
    return (this.db.prepare('SELECT COUNT(*) AS total FROM products').get() as { total: number }).total;
  }
}

/** "Shirt" -> "Shirt (copy)", "Shirt (copy)" -> "Shirt (copy 2)". */
export function copyName(name: string): string {
  const match = /^(.*) \(copy(?: (\d+))?\)$/.exec(name);
  if (!match) return `${name} (copy)`;
  const next = match[2] ? Number(match[2]) + 1 : 2;
  return `${match[1]} (copy ${next})`;
}

function columns(input: SaveProductRequest) {
  return {
    name: input.name,
    code: input.code ?? '',
    category: input.category ?? '',
    costing_date: input.costingDate ?? '',
    version: input.version ?? '1',
    quantity_produced: input.quantityProduced,
    total_cost_per_unit: input.totalCostPerUnit,
    selling_price: input.sellingPrice,
    target_gross_margin: input.targetGrossMargin,
    currency: input.currency ?? 'EGP',
    thumbnail: input.thumbnail ?? null,
    costing_json: JSON.stringify(input.costing),
    pricing_json: JSON.stringify(input.pricing),
    settings_json: JSON.stringify(input.settings),
  };
}
