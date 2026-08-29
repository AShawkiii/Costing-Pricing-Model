/**
 * SECTION 4 — INDIRECT COST (mandatory)
 *
 * A. Overheads Per Unit    — a fixed per-unit amount, never divided by
 *                            Quantity Produced.
 * B. Exchange Rate Valuation — a gross-up percentage applied to the base cost
 *                            per unit:  Base x (1 + rate).
 */

import { Card, RequiredBadge } from '../ui/Card';
import { Field } from '../ui/Field';
import { NumericInput, PercentInput } from '../ui/NumericInput';
import { useApp } from '../../state/AppStateContext';
import { useFormatters } from '../../hooks/useFormatters';
import { issueFor } from '../../lib/validation';
import type { CostingResult } from '../../lib/calculations';

export function IndirectCostCard({ index, result }: { index: number; result: CostingResult }) {
  const { state, dispatch, costingIssues } = useApp();
  const f = useFormatters();
  const { overheadsPerUnit, exchangeRateValuation } = state.costing;
  const overheadError = issueFor(costingIssues, 'overheadsPerUnit');
  const rateError = issueFor(costingIssues, 'exchangeRateValuation');

  return (
    <Card
      index={index}
      title="Indirect Cost"
      subtitle="Fixed per-unit overheads and the exchange-rate gross-up applied to the base cost."
      badge={<RequiredBadge />}
    >
      <div className="stack">
        <div className="form-grid">
          <Field
            label="Overheads Per Unit"
            htmlFor="overheads"
            hint="Already a per-unit amount — it is NOT divided by Quantity Produced."
            error={overheadError?.message}
          >
            <NumericInput
              id="overheads"
              value={overheadsPerUnit}
              min={0}
              invalid={Boolean(overheadError)}
              suffix={f.currency}
              ariaLabel="Overheads per unit"
              onChange={(value) => dispatch({ type: 'setOverheadsPerUnit', value })}
            />
          </Field>

          <Field
            label="Exchange Rate Valuation"
            htmlFor="exchange-rate"
            hint="Gross-up applied to the base cost per unit."
            error={rateError?.message}
          >
            <PercentInput
              id="exchange-rate"
              value={exchangeRateValuation}
              min={0}
              max={100}
              invalid={Boolean(rateError)}
              ariaLabel="Exchange rate valuation"
              onChange={(value) => dispatch({ type: 'setExchangeRateValuation', value })}
            />
          </Field>
        </div>

        <div className="formula">
          Total Cost Per Unit = Base Cost Per Unit × (1 + Exchange Rate %) ={' '}
          {f.num(result.baseCostPerUnit)} × (1 + {f.pct(exchangeRateValuation)}) = {f.num(result.totalCostPerUnit)}{' '}
          {f.currency}
        </div>

        {/* The gross-up is shown step by step so the user can audit it. */}
        <div className="stat-grid">
          <div className="stat">
            <div className="stat__label">Base Cost Per Unit</div>
            <div className="stat__value">{f.money(result.baseCostPerUnit)}</div>
            <div className="stat__note">Direct + Sample + Marketing + Overheads</div>
          </div>
          <div className="stat">
            <div className="stat__label">Exchange Rate %</div>
            <div className="stat__value">{f.pct(exchangeRateValuation)}</div>
            <div className="stat__note">Valuation applied to the base cost</div>
          </div>
          <div className="stat">
            <div className="stat__label">Exchange Rate Adjustment</div>
            <div className="stat__value">{f.money(result.exchangeRateAdjustment)}</div>
            <div className="stat__note">{f.num(result.baseCostPerUnit)} × {f.pct(exchangeRateValuation)}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Cost After Exchange Rate Valuation</div>
            <div className="stat__value">{f.money(result.totalCostPerUnit)}</div>
            <div className="stat__note">Base + adjustment</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
