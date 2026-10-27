/**
 * Repository and API tests.
 *
 * Everything runs against an in-memory SQLite database created by the same
 * migrations as the real one, so the schema under test is the shipped schema.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SaveProductRequest } from '../src/shared/contracts/products.ts';
import { openDatabase, type Database } from './db.ts';
import { copyName, ProductRepository } from './products.repository.ts';
import { createApp } from './app.ts';
import { parseListQuery, validateSaveProduct } from './validation.ts';

function productInput(overrides: Partial<SaveProductRequest> = {}): SaveProductRequest {
  return {
    name: 'Milton Shirt',
    code: 'SH-1042',
    category: 'Shirts',
    costingDate: '2026-01-15',
    version: '1',
    quantityProduced: 1000,
    totalCostPerUnit: 184,
    sellingPrice: 306.67,
    targetGrossMargin: 0.4,
    currency: 'EGP',
    thumbnail: null,
    costing: { quantityProduced: 1000, directCosts: [{ id: 'a', unitPrice: 200 }] },
    pricing: { targetGrossMargin: 0.4, scenarioMargins: [0.3, 0.4] },
    settings: { currency: 'EGP', vatRate: 0.14, vatTreatment: 'inclusive' },
    ...overrides,
  };
}

let db: Database;
let repo: ProductRepository;

beforeEach(() => {
  db = openDatabase(':memory:');
  repo = new ProductRepository(db);
});

afterEach(() => db.close());

describe('persistence', () => {
  it('stores a product and reads it back whole', () => {
    const created = repo.create(productInput());
    const loaded = repo.get(created.id);

    expect(loaded?.name).toBe('Milton Shirt');
    expect(loaded?.totalCostPerUnit).toBe(184);
    // The model and the settings snapshot survive the round trip intact.
    expect(loaded?.costing).toEqual(productInput().costing);
    expect(loaded?.settings).toEqual(productInput().settings);
  });

  it('survives closing and reopening the database', () => {
    const path = `${process.env.TMPDIR ?? '/tmp'}/fs-test-${Date.now()}.db`;
    const first = openDatabase(path);
    const id = new ProductRepository(first).create(productInput({ name: 'Persisted' })).id;
    first.close();

    const second = openDatabase(path);
    expect(new ProductRepository(second).get(id)?.name).toBe('Persisted');
    second.close();
  });

  it('updates in place and keeps created_at', async () => {
    const created = repo.create(productInput());
    await new Promise((r) => setTimeout(r, 5));
    const updated = repo.update(created.id, productInput({ name: 'Renamed', totalCostPerUnit: 200 }));

    expect(updated?.id).toBe(created.id);
    expect(updated?.name).toBe('Renamed');
    expect(updated?.totalCostPerUnit).toBe(200);
    expect(updated?.createdAt).toBe(created.createdAt);
    expect(repo.count()).toBe(1);
  });

  it('reports a missing product instead of creating one', () => {
    expect(repo.update('nope', productInput())).toBeUndefined();
    expect(repo.get('nope')).toBeUndefined();
    expect(repo.remove('nope')).toBe(false);
  });
});

describe('library listing', () => {
  beforeEach(() => {
    repo.create(productInput({ name: 'Alpha Shirt', code: 'A-1', category: 'Shirts', totalCostPerUnit: 100 }));
    repo.create(productInput({ name: 'Beta Trouser', code: 'B-2', category: 'Trousers', totalCostPerUnit: 300 }));
    repo.create(productInput({ name: 'Gamma Shirt', code: 'C-3', category: 'Shirts', totalCostPerUnit: 200 }));
  });

  it('searches name, code and category', () => {
    expect(repo.list({ q: 'shirt' }).products).toHaveLength(2);
    expect(repo.list({ q: 'B-2' }).products[0].name).toBe('Beta Trouser');
    expect(repo.list({ q: 'trousers' }).products).toHaveLength(1);
    expect(repo.list({ q: 'nothing here' }).products).toHaveLength(0);
  });

  it('filters by category and lists the categories available', () => {
    expect(repo.list({ category: 'Shirts' }).products).toHaveLength(2);
    expect(repo.list().categories).toEqual(['Shirts', 'Trousers']);
  });

  it('sorts by name and by cost', () => {
    expect(repo.list({ sort: 'name' }).products.map((p) => p.name)).toEqual([
      'Alpha Shirt',
      'Beta Trouser',
      'Gamma Shirt',
    ]);
    expect(repo.list({ sort: 'cost' }).products.map((p) => p.totalCostPerUnit)).toEqual([300, 200, 100]);
  });

  it('leaves the stored model out of the list payload', () => {
    expect(repo.list().products[0]).not.toHaveProperty('costing');
  });
});

describe('duplicate', () => {
  it('copies the model under a new id and name', () => {
    const original = repo.create(productInput());
    const copy = repo.duplicate(original.id);

    expect(copy?.id).not.toBe(original.id);
    expect(copy?.name).toBe('Milton Shirt (copy)');
    expect(copy?.costing).toEqual(original.costing);
    expect(repo.count()).toBe(2);
    // The original is untouched.
    expect(repo.get(original.id)?.name).toBe('Milton Shirt');
  });

  it('numbers repeated copies', () => {
    expect(copyName('Shirt')).toBe('Shirt (copy)');
    expect(copyName('Shirt (copy)')).toBe('Shirt (copy 2)');
    expect(copyName('Shirt (copy 2)')).toBe('Shirt (copy 3)');
  });
});

describe('validation', () => {
  it('requires a name and sane numbers', () => {
    const result = validateSaveProduct({ ...productInput(), name: '  ', totalCostPerUnit: 'free' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('Product name is required.');
      expect(result.errors.some((e) => e.includes('totalCostPerUnit'))).toBe(true);
    }
  });

  it('rejects an impossible gross margin', () => {
    const result = validateSaveProduct(productInput({ targetGrossMargin: 1 }));
    expect(result.ok).toBe(false);
  });

  it('falls back to a safe sort instead of trusting the query string', () => {
    expect(parseListQuery({ sort: 'name' }).sort).toBe('name');
    expect(parseListQuery({ sort: 'updated_at; DROP TABLE products' }).sort).toBe('updated');
  });
});

describe('HTTP API', () => {
  async function request(path: string, init?: RequestInit) {
    const app = createApp(db);
    const server = app.listen(0);
    const { port } = server.address() as { port: number };
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      });
      // Tests assert on the shape, so an `any` body keeps them readable.
      const body = response.status === 204 ? null : ((await response.json()) as any);
      return { status: response.status, body };
    } finally {
      server.close();
    }
  }

  it('creates, reads, updates, duplicates and deletes over HTTP', async () => {
    const created = await request('/api/products', { method: 'POST', body: JSON.stringify(productInput()) });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    expect((await request(`/api/products/${id}`)).body.name).toBe('Milton Shirt');

    const updated = await request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productInput({ name: 'Milton Shirt v2' })),
    });
    expect(updated.body.name).toBe('Milton Shirt v2');

    const copy = await request(`/api/products/${id}/duplicate`, { method: 'POST' });
    expect(copy.status).toBe(201);
    expect(copy.body.name).toBe('Milton Shirt v2 (copy)');

    expect((await request(`/api/products/${id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await request(`/api/products/${id}`)).status).toBe(404);
  });

  it('answers a bad payload with the field problems', async () => {
    const response = await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ ...productInput(), name: '' }),
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_failed');
    expect(response.body.error.details).toContain('Product name is required.');
  });

  it('reports health with the product count', async () => {
    repo.create(productInput());
    const response = await request('/api/health');
    expect(response.body).toMatchObject({ status: 'ok', products: 1 });
  });
});
