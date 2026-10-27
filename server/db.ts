/**
 * SQLite connection and schema.
 *
 * Uses node:sqlite — SQLite is built into Node, so the database is a real
 * on-disk SQL store with no native module to compile and nothing to install.
 * The file lives in data/ (git-ignored) and survives restarts, refreshes and
 * redeploys of the front end.
 */

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Database = DatabaseSync;

export const DEFAULT_DB_PATH = resolve(process.cwd(), 'data/finance-support.db');

/**
 * Opens (and creates, if needed) the database.
 * Pass ':memory:' for tests.
 */
export function openDatabase(path: string = process.env.DATABASE_PATH ?? DEFAULT_DB_PATH): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  // Durability and concurrency defaults suited to a small multi-tab app.
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}

/**
 * Schema migrations, applied in order and recorded by user_version so an
 * existing database upgrades in place instead of being recreated.
 */
const MIGRATIONS: Array<(db: Database) => void> = [
  (db) => {
    db.exec(`
      CREATE TABLE products (
        id                  TEXT PRIMARY KEY,
        name                TEXT NOT NULL,
        code                TEXT NOT NULL DEFAULT '',
        category            TEXT NOT NULL DEFAULT '',
        costing_date        TEXT NOT NULL DEFAULT '',
        version             TEXT NOT NULL DEFAULT '1',
        quantity_produced   REAL NOT NULL DEFAULT 0,
        total_cost_per_unit REAL NOT NULL DEFAULT 0,
        selling_price       REAL NOT NULL DEFAULT 0,
        target_gross_margin REAL NOT NULL DEFAULT 0,
        currency            TEXT NOT NULL DEFAULT 'EGP',
        thumbnail           TEXT,
        costing_json        TEXT NOT NULL,
        pricing_json        TEXT NOT NULL,
        settings_json       TEXT NOT NULL,
        created_at          TEXT NOT NULL,
        updated_at          TEXT NOT NULL
      );

      CREATE INDEX idx_products_updated_at ON products (updated_at DESC);
      CREATE INDEX idx_products_name       ON products (name COLLATE NOCASE);
      CREATE INDEX idx_products_category   ON products (category COLLATE NOCASE);
    `);
  },
];

export function migrate(db: Database): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  const current = Number(row.user_version ?? 0);

  for (let version = current; version < MIGRATIONS.length; version += 1) {
    MIGRATIONS[version](db);
    // PRAGMA does not accept bound parameters.
    db.exec(`PRAGMA user_version = ${version + 1}`);
  }
}
