/**
 * Costing & Pricing Card — the one-page summary of a costing model:
 * product photo, cost broken down per unit, and the recommended selling price.
 *
 * The same component is rendered on screen (page 3) and inside the printable
 * card, so what the user approves is exactly what is printed.
 */

import { buildCostBreakdown } from '../../lib/calculations';
import { useApp } from '../../state/AppStateContext';
import { useFormatters } from '../../hooks/useFormatters';

export function CostingPricingCard() {
  const { state, costing, pricing } = useApp();
  const f = useFormatters();
  const { product, quantityProduced } = state.costing;
  const { vatTreatment, vatRate } = state.settings;
  const breakdown = buildCostBreakdown(costing);

  return (
    <article className="cp-card">
      <header className="cp-card__banner">
        <div>
          <div className="cp-card__eyebrow">Costing &amp; Pricing Card</div>
          <div className="cp-card__name">{product.name || 'Untitled product'}</div>
          <div className="cp-card__meta">
            {[product.code, product.category].filter(Boolean).join(' · ') || 'No product code or category'}
          </div>
        </div>
        <div className="cp-card__stamp">
          <div>Costing date: <strong>{product.costingDate || '—'}</strong></div>
          <div>Version: <strong>{product.version || '1'}</strong></div>
          <div>Quantity produced: <strong>{f.int(quantityProduced)} units</strong></div>
        </div>
      </header>

      <div className="cp-card__grid">
        <div>
          {product.photo ? (
            <img className="cp-photo" src={product.photo.dataUrl} alt={`Product photo of ${product.name || 'the product'}`} />
          ) : (
            <div className="cp-photo cp-photo--empty">
              No product photo yet — add one in the Product Photo section on the Costing page.
            </div>
          )}

          <div className="cp-facts">
            <div className="cp-fact">
              <span className="cp-fact__label">Product code</span>
              <span className="cp-fact__value">{product.code || '—'}</span>
            </div>
            <div className="cp-fact">
              <span className="cp-fact__label">Category</span>
              <span className="cp-fact__value">{product.category || '—'}</span>
            </div>
            <div className="cp-fact">
              <span className="cp-fact__label">Quantity produced</span>
              <span className="cp-fact__value">{f.int(quantityProduced)} units</span>
            </div>
            <div className="cp-fact">
              <span className="cp-fact__label">VAT</span>
              <span className="cp-fact__value">
                {f.pct(vatRate)} · {vatTreatment === 'inclusive' ? 'in cost' : 'recoverable'}
              </span>
            </div>
            <div className="cp-fact">
              <span className="cp-fact__label">Exchange rate valuation</span>
              <span className="cp-fact__value">{f.pct(costing.exchangeRateValuation)}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="cp-headlines">
            <div className="headline">
              <div className="headline__label">Total Cost Per Unit</div>
              <div className="headline__value">{f.money(costing.totalCostPerUnit)}</div>
              <div className="headline__note">
                Base {f.num(costing.baseCostPerUnit)} × (1 + {f.pct(costing.exchangeRateValuation)})
              </div>
            </div>
            <div className="headline headline--accent">
              <div className="headline__label">Recommended Selling Price</div>
              <div className="headline__value">{f.money(pricing.sellingPrice)}</div>
              <div className="headline__note">
                {f.pct(pricing.targetGrossMargin)} gross margin · {f.pct(pricing.markup)} mark-up
              </div>
            </div>
          </div>

          <h3 className="cp-section-title">Cost breakdown</h3>
          <table className="breakdown-table">
            <thead>
              <tr>
                <th>Cost component</th>
                <th className="num">Per unit</th>
                <th className="num">Share</th>
                <th className="num">Total ({f.int(quantityProduced)} units)</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td className="num">{f.num(row.perUnit)}</td>
                  <td className="num">
                    <span className="share-bar">
                      <span className="share-bar__track">
                        <span className="share-bar__fill" style={{ width: `${Math.min(100, row.share * 100)}%` }} />
                      </span>
                      <span className="share-bar__value">{f.pct(row.share)}</span>
                    </span>
                  </td>
                  <td className="num">{f.num(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total Cost Per Unit</td>
                <td className="num">{f.num(costing.totalCostPerUnit)}</td>
                <td className="num">100%</td>
                <td className="num">{f.num(costing.totalProductionCost)}</td>
              </tr>
            </tfoot>
          </table>

          {costing.unallocatedTotal > 0 && (
            <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
              Plus {f.money(costing.unallocatedTotal)} of lump-sum costs kept outside the cost per unit.
            </p>
          )}

          <h3 className="cp-section-title">Selling price</h3>
          <table className="breakdown-table">
            <tbody>
              <tr>
                <td>Cost Per Unit</td>
                <td className="num">{f.money(pricing.costPerUnit)}</td>
              </tr>
              <tr>
                <td>Target Gross Profit Margin</td>
                <td className="num">{f.pct(pricing.targetGrossMargin)}</td>
              </tr>
              <tr>
                <td>Gross Profit Per Unit</td>
                <td className="num">{f.money(pricing.grossProfit)}</td>
              </tr>
              <tr>
                <td>Mark-up on Cost</td>
                <td className="num">{f.pct(pricing.markup)}</td>
              </tr>
              <tr>
                <td>Total Revenue at this price</td>
                <td className="num">{f.money(pricing.totalRevenue)}</td>
              </tr>
              <tr>
                <td>Total Gross Profit</td>
                <td className="num">{f.money(pricing.totalGrossProfit)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Recommended Selling Price</td>
                <td className="num">{f.money(pricing.sellingPrice)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <footer className="cp-card__footer">
        <span>
          Selling Price = Cost Per Unit ÷ (1 − Gross Margin) = {f.num(pricing.costPerUnit)} ÷ (1 −{' '}
          {f.pct(pricing.targetGrossMargin)})
        </span>
        <span>{product.name || 'Untitled product'} · {product.costingDate || '—'}</span>
      </footer>
    </article>
  );
}
