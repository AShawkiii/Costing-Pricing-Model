/**
 * PAGE 2 — PRICING
 * Pulls the Total Cost Per Unit from the costing model (read-only) and derives
 * the selling price required to hit a target GROSS MARGIN.
 */

import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { PercentInput } from '../components/ui/NumericInput';
import { Notice } from '../components/ui/Notice';
import { Stat } from '../components/ui/Summary';
import { PricingSummaryCard } from '../components/pricing/PricingSummaryCard';
import { ScenarioTable } from '../components/pricing/ScenarioTable';
import { ValidationPanel } from '../components/ValidationPanel';
import { useApp } from '../state/AppStateContext';
import { useFormatters } from '../hooks/useFormatters';
import { issueFor } from '../lib/validation';
import { calculateSellingPrice } from '../lib/calculations';

const QUICK_MARGINS = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6];

export function PricingPage() {
  const { state, dispatch, costing, pricing, pricingIssues, costingIssues } = useApp();
  const f = useFormatters();
  const marginError = issueFor(pricingIssues, 'targetGrossMargin');
  const target = state.pricing.targetGrossMargin;

  // Shown next to the correct calculation to make the difference explicit.
  const markupPrice = pricing.costPerUnit * (1 + target);

  return (
    <div className="page-layout">
      <div className="page-column">
        <ValidationPanel issues={pricingIssues} />

        {costingIssues.some((i) => i.level === 'error') && (
          <Notice tone="warn">
            The costing model still has validation errors, so the cost per unit below may be incomplete.{' '}
            <Link to="/costing">Review the Costing page →</Link>
          </Notice>
        )}

        <Card
          title="Target Pricing"
          subtitle="The cost per unit is pulled from the Costing page and cannot be edited here."
        >
          <div className="stack">
            <div className="form-grid">
              <Field label="Total Cost Per Unit (from Costing)" hint="Read-only — change it on the Costing page.">
                <div className="readonly-value">{f.money(costing.totalCostPerUnit)}</div>
              </Field>

              <Field
                label="Target Gross Profit Margin"
                htmlFor="target-margin"
                hint="Must be at least 0% and below 100%."
                error={marginError?.message}
              >
                <PercentInput
                  id="target-margin"
                  value={target}
                  min={0}
                  max={99.99}
                  invalid={Boolean(marginError)}
                  ariaLabel="Target gross profit margin"
                  onChange={(value) => dispatch({ type: 'setTargetGrossMargin', value })}
                />
              </Field>

              <Field label="Recommended Selling Price" hint="Cost ÷ (1 − margin)">
                <div className="readonly-value">{f.money(pricing.sellingPrice)}</div>
              </Field>
            </div>

            <div className="margin-presets">
              {QUICK_MARGINS.map((m) => (
                <button
                  key={m}
                  className={`margin-preset${Math.abs(m - target) < 1e-9 ? ' margin-preset--active' : ''}`}
                  onClick={() => dispatch({ type: 'setTargetGrossMargin', value: m })}
                >
                  {f.pct(m)}
                </button>
              ))}
            </div>

            <div className="formula">
              Selling Price = Cost Per Unit ÷ (1 − Gross Profit Margin) = {f.num(pricing.costPerUnit)} ÷ (1 −{' '}
              {f.pct(target)}) = {f.num(pricing.sellingPrice)} {f.currency}
            </div>

            <div className="stat-grid">
              <Stat label="Cost Per Unit" value={f.money(pricing.costPerUnit)} note="From the costing model" />
              <Stat label="Gross Profit Per Unit" value={f.money(pricing.grossProfit)} note="Selling price − cost" />
              <Stat label="Gross Margin" value={f.pct(pricing.realisedGrossMargin)} note="Gross profit ÷ selling price" />
              <Stat label="Mark-up on Cost" value={f.pct(pricing.markup)} note="Gross profit ÷ cost" />
            </div>

            {/* Margin vs mark-up — the accounting rule the spec insists on. */}
            <Notice tone="info">
              <strong>Margin is not mark-up.</strong> A {f.pct(target)} gross margin means the price is{' '}
              {f.money(calculateSellingPrice(pricing.costPerUnit, target))} — a {f.pct(target)} mark-up would price the
              product at only {f.money(markupPrice)}, which yields a gross margin of{' '}
              {f.pct(markupPrice > 0 ? (markupPrice - pricing.costPerUnit) / markupPrice : 0)}.
            </Notice>
          </div>
        </Card>

        <ScenarioTable />

        <Card title="Profit at the Full Production Run" subtitle="Applying the recommended price to every unit produced.">
          <div className="stat-grid">
            <Stat label="Quantity Produced" value={`${f.int(state.costing.quantityProduced)} units`} />
            <Stat label="Total Revenue" value={f.money(pricing.totalRevenue)} note="Selling price × quantity" />
            <Stat label="Total Production Cost" value={f.money(costing.totalProductionCost)} note="Cost per unit × quantity" />
            <Stat label="Total Gross Profit" value={f.money(pricing.totalGrossProfit)} note="Revenue − cost" />
          </div>
        </Card>
      </div>

      <aside className="page-aside">
        <PricingSummaryCard />
      </aside>
    </div>
  );
}
