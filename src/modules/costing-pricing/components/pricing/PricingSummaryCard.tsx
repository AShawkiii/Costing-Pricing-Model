/**
 * Pricing summary — the recommended selling price is the highlighted result.
 *
 * Selling Price = Cost Per Unit / (1 - Gross Profit Margin)
 * (a margin calculation, deliberately NOT Cost x (1 + margin), which is a
 * mark-up and would under-price the product.)
 */

import { Link } from 'react-router-dom';
import { Headline, SummaryRow } from '@shared/ui/Summary';
import { useApp } from '../../state/AppStateContext';
import { useFormatters } from '../../hooks/useFormatters';

export function PricingSummaryCard() {
  const { state, pricing } = useApp();
  const f = useFormatters();
  const { product } = state.costing;

  return (
    <div className="summary-card">
      <header className="summary-card__header">
        <h3>Pricing Summary</h3>
        <p>{product.name || 'Untitled product'}{product.code ? ` · ${product.code}` : ''}</p>
      </header>

      <div className="summary-card__body">
        <SummaryRow label="Cost Per Unit" value={f.money(pricing.costPerUnit)} />
        <SummaryRow label="Target Gross Profit Margin" value={f.pct(pricing.targetGrossMargin)} />
        <SummaryRow label="Gross Profit Per Unit" value={f.money(pricing.grossProfit)} />
        <SummaryRow label="Mark-up on Cost" value={f.pct(pricing.markup)} />

        <Headline
          label="Recommended Selling Price"
          value={f.money(pricing.sellingPrice)}
          note={`${f.num(pricing.costPerUnit)} ÷ (1 − ${f.pct(pricing.targetGrossMargin)})`}
          accent
        />

        <div style={{ marginTop: 14 }}>
          <SummaryRow label="Quantity Produced" value={`${f.int(state.costing.quantityProduced)} units`} sub />
          <SummaryRow label="Total Revenue at this price" value={f.money(pricing.totalRevenue)} sub />
          <SummaryRow label="Total Gross Profit" value={f.money(pricing.totalGrossProfit)} sub />
          <SummaryRow label="Realised Gross Margin" value={f.pct(pricing.realisedGrossMargin)} total />
          <Link className="btn btn--secondary btn--sm" to="/card" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>
            View Costing &amp; Pricing Card →
          </Link>
        </div>
      </div>
    </div>
  );
}
