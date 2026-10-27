/**
 * PAGE — PRODUCT LIBRARY
 *
 * Every product saved to the database: search it, filter it, open it, copy it
 * or delete it. Loading, error, empty and "no matches" are each handled
 * explicitly so the page always says what is going on.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Modal } from '@shared/ui/Modal';
import { Notice } from '@shared/ui/Notice';
import type { ProductSort, SavedProductSummary } from '@shared/contracts/products';

import { ProductCard } from '../components/library/ProductCard';
import { SaveResultNotice } from '../components/library/SaveControls';
import { useLibrary } from '../state/LibraryContext';
import { COSTING_PRICING_BASE } from '../routes';

const SORT_LABELS: Array<{ value: ProductSort; label: string }> = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'created', label: 'Recently created' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'cost', label: 'Highest cost per unit' },
  { value: 'price', label: 'Highest selling price' },
];

export function LibraryPage() {
  const navigate = useNavigate();
  const library = useLibrary();
  const [pendingDelete, setPendingDelete] = useState<SavedProductSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openProduct = async (id: string) => {
    const product = await library.open(id);
    if (product) navigate(`${COSTING_PRICING_BASE}/costing`);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const removed = await library.remove(pendingDelete.id);
    setDeleting(false);
    if (removed) setPendingDelete(null);
  };

  return (
    <div className="page-layout page-layout--single">
      <div className="page-column">
        <div className="row-gap" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 17 }}>Product Library</h1>
            <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
              {library.status === 'ready'
                ? `${library.total} product${library.total === 1 ? '' : 's'} saved in the database.`
                : 'Products saved in the database.'}
            </p>
          </div>
          <div className="row-gap">
            <button className="btn btn--secondary btn--sm" onClick={() => void library.refresh()}>
              Refresh
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => void library.save()}>
              Save current costing
            </button>
          </div>
        </div>

        <SaveResultNotice />

        <Card title="Find a product" subtitle="Search by name, code or category, then sort the results.">
          <div className="form-grid">
            <Field label="Search" htmlFor="library-search">
              <input
                id="library-search"
                className="input"
                type="search"
                value={library.query.q ?? ''}
                placeholder="e.g. Milton, SH-1042, Shirts"
                onChange={(e) => library.setSearch(e.target.value)}
              />
            </Field>

            <Field label="Category" htmlFor="library-category">
              <select
                id="library-category"
                className="select"
                value={library.query.category ?? ''}
                onChange={(e) => library.setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {library.categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </Field>

            <Field label="Sort by" htmlFor="library-sort">
              <select
                id="library-sort"
                className="select"
                value={library.query.sort ?? 'updated'}
                onChange={(e) => library.setSort(e.target.value as ProductSort)}
              >
                {SORT_LABELS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {library.filtered && (
            <div style={{ marginTop: 12 }}>
              <button className="btn btn--secondary btn--sm" onClick={library.clearFilters}>
                Clear filters
              </button>
            </div>
          )}
        </Card>

        {library.status === 'loading' && <LoadingList />}

        {library.status === 'error' && (
          <Notice tone="error">
            <div className="stack">
              <strong>{library.apiEnabled ? 'The product library could not be loaded.' : 'No database in this copy.'}</strong>
              <span>{library.error}</span>
              {library.apiEnabled && (
                <div>
                  <button className="btn btn--secondary btn--sm" onClick={() => void library.refresh()}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          </Notice>
        )}

        {library.status === 'ready' && library.products.length === 0 && (
          <Card title={library.filtered ? 'No products match' : 'No saved products yet'}>
            {library.filtered ? (
              <div className="stack">
                <p className="text-muted" style={{ margin: 0 }}>
                  Nothing matches those filters. {library.total} product{library.total === 1 ? '' : 's'} are saved in
                  total.
                </p>
                <div>
                  <button className="btn btn--secondary btn--sm" onClick={library.clearFilters}>
                    Clear filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="stack">
                <p className="text-muted" style={{ margin: 0 }}>
                  Build a costing on the Costing page, then press <strong>Save product</strong> in the header. Saved
                  products stay in the database and come back whenever you open Finance Support.
                </p>
                <div>
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => navigate(`${COSTING_PRICING_BASE}/costing`)}
                  >
                    Go to Costing
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {library.status === 'ready' && library.products.length > 0 && (
          <div className="product-grid">
            {library.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                busy={library.busyIds.includes(product.id)}
                isOpen={product.id === library.savedProductId}
                onOpen={() => void openProduct(product.id)}
                onDuplicate={() => void library.duplicate(product.id)}
                onDelete={() => setPendingDelete(product)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={pendingDelete !== null}
        title="Delete this product?"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </button>
            <button className="btn btn--danger" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </button>
          </>
        }
      >
        <Notice tone="warn">
          <strong>{pendingDelete?.name}</strong> will be removed from the database, with its costing, pricing and
          photo. This cannot be undone.
        </Notice>
        {pendingDelete?.id === library.savedProductId && (
          <p className="text-muted" style={{ margin: 0 }}>
            This is the product currently open in the workspace. Your figures stay on screen — they simply stop being a
            saved product, and Save will store them as a new one.
          </p>
        )}
      </Modal>
    </div>
  );
}

/** Skeleton rows while the first request is in flight. */
function LoadingList() {
  return (
    <div className="product-grid" aria-busy="true" aria-label="Loading saved products">
      {[0, 1, 2].map((i) => (
        <div className="product-card product-card--skeleton" key={i}>
          <div className="product-card__photo skeleton" />
          <div className="product-card__body">
            <div className="skeleton skeleton--line" style={{ width: '46%' }} />
            <div className="skeleton skeleton--line" style={{ width: '28%' }} />
            <div className="skeleton skeleton--block" />
          </div>
        </div>
      ))}
    </div>
  );
}
