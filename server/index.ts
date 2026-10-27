/**
 * Server entry point.
 *
 * Serves the API and, when the front end has been built, the app itself — so
 * `npm start` gives one command and one URL with a real database behind it.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import express from 'express';

import { createApp } from './app.ts';
import { openDatabase, DEFAULT_DB_PATH } from './db.ts';

const PORT = Number(process.env.PORT ?? 4000);
const dbPath = process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;

const db = openDatabase(dbPath);
const app = createApp(db);

// Serve the built front end when it exists (npm start); in development Vite
// serves it and proxies /api here.
const dist = resolve(process.cwd(), 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}

const server = app.listen(PORT, () => {
  console.log(`Finance Support API  http://localhost:${PORT}/api`);
  console.log(`Database             ${dbPath}`);
  if (existsSync(dist)) console.log(`App                  http://localhost:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
