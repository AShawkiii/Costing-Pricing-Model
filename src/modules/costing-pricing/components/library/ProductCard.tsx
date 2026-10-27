/**
 * One saved product in the library list: what it is, what it costs, and the
 * three things you can do with it.
 */

import type { SavedProductSummary } from '@shared/contracts/products';

import { formatCurrency, formatInteger, formatPercent } from '@shared/lib/format';

interface Props {
  product: SavedProductSummary;
  busy: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ProductCard({ product, busy, isOpen, onOpen, onDuplicate, onDelete }: Props) {
  const money = (value: number) => formatCurrency(value, product.currency);

  return (
    <article className={`product-card${isOpen ? ' product-card--open' : ''}`}>
      <div className="product-card__photo">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt="" loading="lazy" />
        ) : (
          <span className="product-card__placeholder" aria-hidden>
            No photo
          </span>
        )}
      </div>

      <div className="product-card__body">
        <div className="product-card__heading">
          <h3 className="product-card__name">{product.name}</h3>
          {isOpen && <span className="badge badge--accent">Open</span>}
        </div>
        <p className="product-card__meta">
          {[product.code, product.category, product.costingDate].filter(Boolean).join(' · ') || 'No code or category'}
        </p>

        <dl className="product-card__figures">
          <div>
            <dt>Cost per unit</dt>
            <dd>{money(product.totalCostPerUnit)}</dd>
          </div>
          <div>
            <dt>Selling price</dt>
            <dd>{money(product.sellingPrice)}</dd>
          </div>
          <div>
            <dt>Margin</dt>
            <dd>{formatPercent(product.targetGrossMargin)}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{formatInteger(product.quantityProduced)}</dd>
          </div>
        </dl>

        <div className="product-card__footer">
          <span className="product-card__updated">Updated {formatWhen(product.updatedAt)}</span>
          <div className="row-gap">
            <button className="btn btn--primary btn--sm" onClick={onOpen} disabled={busy}>
              {busy ? 'Working…' : 'Open'}
            </button>
            <button className="btn btn--secondary btn--sm" onClick={onDuplicate} disabled={busy}>
              Duplicate
            </button>
            <button className="btn btn--danger btn--sm" onClick={onDelete} disabled={busy}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'recently';

  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
