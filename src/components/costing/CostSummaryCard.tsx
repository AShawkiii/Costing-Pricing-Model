/**
 * Sticky costing summary. Every figure is derived from the calculation engine
 * and updates on every keystroke.
 */

import { Link } from 'react-router-dom';
import { Headline, SummaryRow } from '../ui/Summary';
import { useApp } from '../../state/AppStateContext';
import { useFormatters } from '../../hooks/useFormatters';

export function CostSummaryCard() {
  const { state, costing, pricing } = useApp();
  const f = useFormatters();
  const { product } = state.costing;

  return (
    <div className="summary-card">
      <header className="summary-card__header">
        <h3>Cost Summary</h3>
        <p>{product.name || 'Untitled product'}{product.code ? ` · ${product.code}` : ''}</p>
      </header>

      <div className="summary-card__body">
        <SummaryRow label="Quantity Produced" value={`${f.int(costing.quantityProduced)} units`} />
        <SummaryRow label="Direct Cost Per Unit" value={f.money(costing.direct.perUnit)} />
        <SummaryRow label="Sample Cost Per Unit" value={f.money(costing.sample.perUnit)} />
        <SummaryRow label="Marketing Per Unit" value={f.money(costing.marketing.perUnit)} />
        <SummaryRow label="Overheads Per Unit" value={f.money(costing.overheadsPerUnit)} />
        <SummaryRow label="Base Cost Per Unit" value={f.money(costing.baseCostPerUnit)} total />
        <SummaryRow label="Exchange Rate Valuation" value={f.pct(costing.exchangeRateValuation)} />
        <SummaryRow label="Exchange Rate Adjustment" value={f.money(costing.exchangeRateAdjustment)} />

        <Headline
          label="Total Cost Per Unit"
          value={f.money(costing.totalCostPerUnit)}
          note={`Base ${f.num(costing.baseCostPerUnit)} × (1 + ${f.pct(costing.exchangeRateValuation)})`}
          accent
        />

        <div style={{ marginTop: 14 }}>
          <SummaryRow label="Direct Cost (total run)" value={f.money(costing.direct.total)} sub />
          <SummaryRow label="Sample Cost (total run)" value={f.money(costing.sample.total)} sub />
          <SummaryRow label="Marketing (total run)" value={f.money(costing.marketing.total)} sub />
          <SummaryRow
            label={state.settings.vatTreatment === 'inclusive' ? 'VAT included in costs' : 'VAT (recoverable, excluded)'}
            value={f.money(costing.vatTotal)}
            sub
          />
          {costing.unallocatedTotal > 0 && (
            <SummaryRow label="Unallocated lump-sum costs" value={f.money(costing.unallocatedTotal)} sub />
          )}
          <SummaryRow
            label="Total Production Cost"
            value={f.money(costing.totalProductionCost)}
            total
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <SummaryRow label="Target Gross Margin" value={f.pct(pricing.targetGrossMargin)} />
          <SummaryRow label="Recommended Selling Price" value={f.money(pricing.sellingPrice)} />
          <Link className="btn btn--secondary btn--sm" to="/pricing" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>
            Continue to Pricing →
          </Link>
          <Link className="btn btn--secondary btn--sm" to="/card" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
            View Costing &amp; Pricing Card →
          </Link>
        </div>
      </div>
    </div>
  );
}
