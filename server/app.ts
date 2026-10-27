/**
 * Finance Support HTTP API.
 *
 * Exported as a factory so tests can mount it against an in-memory database.
 * Every response is JSON; failures carry an ApiErrorBody the client renders
 * directly.
 */

import express, { type Express, type NextFunction, type Request, type Response } from 'express';

import { LIMITS, type ApiErrorBody } from '../src/shared/contracts/products.ts';
import type { Database } from './db.ts';
import { ProductRepository } from './products.repository.ts';
import { parseListQuery, validateSaveProduct } from './validation.ts';

function fail(res: Response, status: number, body: ApiErrorBody['error']) {
  res.status(status).json({ error: body } satisfies ApiErrorBody);
}

export function createApp(db: Database): Express {
  const app = express();
  const products = new ProductRepository(db);

  // Product photos travel inside the model, so the limit is generous.
  app.use(express.json({ limit: LIMITS.documentBytes }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', products: products.count(), time: new Date().toISOString() });
  });

  app.get('/api/products', (req, res) => {
    res.json(products.list(parseListQuery(req.query as Record<string, unknown>)));
  });

  app.get('/api/products/:id', (req, res) => {
    const product = products.get(req.params.id);
    if (!product) return fail(res, 404, { code: 'not_found', message: 'That product no longer exists.' });
    res.json(product);
  });

  app.post('/api/products', (req, res) => {
    const parsed = validateSaveProduct(req.body);
    if (!parsed.ok) {
      return fail(res, 400, {
        code: 'validation_failed',
        message: 'The product could not be saved.',
        details: parsed.errors,
      });
    }
    res.status(201).json(products.create(parsed.value));
  });

  app.put('/api/products/:id', (req, res) => {
    const parsed = validateSaveProduct(req.body);
    if (!parsed.ok) {
      return fail(res, 400, {
        code: 'validation_failed',
        message: 'The product could not be saved.',
        details: parsed.errors,
      });
    }
    const updated = products.update(req.params.id, parsed.value);
    if (!updated) {
      return fail(res, 404, {
        code: 'not_found',
        message: 'That product no longer exists — save it as a new product instead.',
      });
    }
    res.json(updated);
  });

  app.post('/api/products/:id/duplicate', (req, res) => {
    const copy = products.duplicate(req.params.id);
    if (!copy) return fail(res, 404, { code: 'not_found', message: 'That product no longer exists.' });
    res.status(201).json(copy);
  });

  app.delete('/api/products/:id', (req, res) => {
    if (!products.remove(req.params.id)) {
      return fail(res, 404, { code: 'not_found', message: 'That product no longer exists.' });
    }
    res.status(204).end();
  });

  app.use('/api', (_req, res) => {
    fail(res, 404, { code: 'not_found', message: 'Unknown API endpoint.' });
  });

  // Last-resort handler: a crash must still produce a readable JSON error.
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api]', error);
    fail(res, 500, { code: 'server_error', message: 'The server could not complete that request.' });
  });

  return app;
}
