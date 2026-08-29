/**
 * Pricing scenario table — the selling price at a range of target margins.
 * The user's own target row is highlighted; clicking a row adopts that margin.
 */

import { Card } from '@shared/ui/Card';
import { useApp } from '../../state/AppStateContext';
import { useFormatters } from '../../hooks/useFormatters';

export function ScenarioTable() {
  const { state, dispatch, pricing } = useApp();
  const f = useFormatters();
  const target = state.pricing.targetGrossMargin;

  return (
    <Card
      title="Pricing Scenarios"
      subtitle="Selling price and profit at alternative gross margins. Click a row to adopt that margin."
    >
      <div className="table-scroll">
        <table className="data-table" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>Gross Margin</th>
              <th className="num">Selling Price</th>
              <th className="num">Gross Profit</th>
              <th className="num">Mark-up on Cost</th>
              <th className="num">Total Gross Profit</th>
            </tr>
          </thead>
          <tbody>
            {pricing.scenarios.map((s) => {
              const isTarget = Math.abs(s.grossMargin - target) < 1e-9;
              return (
                <tr
                  key={s.grossMargin}
                  className={isTarget ? 'scenario-row--target' : undefined}
                  style={{ cursor: 'pointer' }}
                  onClick={() => dispatch({ type: 'setTargetGrossMargin', value: s.grossMargin })}
                  title={`Set target margin to ${f.pct(s.grossMargin)}`}
                >
                  <td>{f.pct(s.grossMargin)}{isTarget ? ' · target' : ''}</td>
                  <td className="num cell-result">{f.num(s.sellingPrice)}</td>
                  <td className="num cell-calc">{f.num(s.grossProfit)}</td>
                  <td className="num cell-calc">{f.pct(s.markup)}</td>
                  <td className="num cell-calc">{f.num(s.grossProfit * state.costing.quantityProduced)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
