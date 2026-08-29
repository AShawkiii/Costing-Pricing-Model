/**
 * PAGE 3 — COSTING & PRICING CARD
 * The approval-ready one-pager: photo, full cost breakdown, selling price.
 */

import { Link } from 'react-router-dom';
import { CostingPricingCard } from '../components/card/CostingPricingCard';
import { Notice } from '../components/ui/Notice';
import { useApp } from '../state/AppStateContext';
import { printDocument } from '../lib/print';

export function CardPage() {
  const { state, costingIssues } = useApp();
  const hasErrors = costingIssues.some((i) => i.level === 'error');

  return (
    <div className="page-layout page-layout--single">
      <div className="page-column">
        <div className="row-gap" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 17 }}>Costing &amp; Pricing Card</h1>
            <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
              One page with the product photo, the cost broken down per unit and the recommended selling price.
            </p>
          </div>
          <div className="row-gap">
            <button className="btn btn--secondary" onClick={() => printDocument('sheet')}>
              Print full cost sheet
            </button>
            <button className="btn btn--primary" onClick={() => printDocument('card')}>
              Print / Export card
            </button>
          </div>
        </div>

        {hasErrors && (
          <Notice tone="warn">
            The costing model still has validation errors, so these figures may be incomplete.{' '}
            <Link to="/costing">Review the Costing page →</Link>
          </Notice>
        )}

        {!state.costing.product.photo && (
          <Notice tone="info">
            No product photo yet — add one in the <Link to="/costing">Product Photo</Link> section and it will appear
            here and on the printed card.
          </Notice>
        )}

        <CostingPricingCard />
      </div>
    </div>
  );
}
