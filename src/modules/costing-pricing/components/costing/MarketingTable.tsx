/**
 * SECTION 3 — MARKETING EXPENSES (optional)
 *
 * Columns: Marketing Type | Description | Quantity | Unit Price | Total | VAT |
 *          Total Price
 *
 * Marketing is ALWAYS allocated across Quantity Produced, so there is no
 * Yes/No allocation dropdown in this section.
 */

import { Card, OptionalBadge } from '@shared/ui/Card';
import { NumericInput } from '@shared/ui/NumericInput';
import { Notice } from '@shared/ui/Notice';
import { useApp } from '../../state/AppStateContext';
import { useFormatters } from '../../hooks/useFormatters';
import type { MarketingSectionResult } from '../../lib/calculations';

export function MarketingTable({ index, result }: { index: number; result: MarketingSectionResult }) {
  const { state, dispatch } = useApp();
  const f = useFormatters();
  const lines = state.costing.marketingExpenses;
  const { marketingTypes, vatTreatment, vatRate } = state.settings;
  const quantityProduced = state.costing.quantityProduced;

  return (
    <Card
      index={index}
      title="Marketing Expenses"
      subtitle="Campaign and content costs. Always spread across the full production quantity."
      badge={<OptionalBadge />}
      actions={
        <button className="btn btn--primary btn--sm" onClick={() => dispatch({ type: 'addMarketingLine' })}>
          + Add Row
        </button>
      }
      flush
    >
      {lines.length === 0 ? (
        <div className="empty-state">
          No marketing expenses — marketing cost is 0. Add a row if the product carries campaign costs.
          <div style={{ marginTop: 10 }}>
            <button className="btn btn--secondary btn--sm" onClick={() => dispatch({ type: 'addMarketingLine' })}>
              + Add the first row
            </button>
          </div>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 180 }}>Marketing Type</th>
                <th style={{ minWidth: 180 }}>Description</th>
                <th className="num" style={{ width: 96 }}>Quantity</th>
                <th className="num" style={{ width: 120 }}>Unit Price</th>
                <th className="num" style={{ width: 118 }}>Total</th>
                <th className="num" style={{ width: 128 }}>VAT ({f.pct(vatRate)})</th>
                <th className="num" style={{ width: 140 }}>Total Price</th>
                <th style={{ width: 72 }} aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const calc = result.lines[i];
                return (
                  <tr key={line.id}>
                    <td>
                      <select
                        className="select"
                        value={line.marketingTypeId}
                        aria-label="Marketing type"
                        onChange={(e) =>
                          dispatch({ type: 'updateMarketingLine', id: line.id, patch: { marketingTypeId: e.target.value } })
                        }
                      >
                        {marketingTypes.map((t) => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <input
                        className="input"
                        value={line.description}
                        placeholder="e.g. Spring campaign creators"
                        aria-label="Description"
                        onChange={(e) =>
                          dispatch({ type: 'updateMarketingLine', id: line.id, patch: { description: e.target.value } })
                        }
                      />
                    </td>

                    <td>
                      <NumericInput
                        value={line.quantity}
                        min={0}
                        invalid={!(line.quantity >= 0)}
                        ariaLabel="Quantity"
                        onChange={(quantity) => dispatch({ type: 'updateMarketingLine', id: line.id, patch: { quantity } })}
                      />
                    </td>

                    <td>
                      <NumericInput
                        value={line.unitPrice}
                        min={0}
                        invalid={!(line.unitPrice >= 0)}
                        ariaLabel="Unit price"
                        onChange={(unitPrice) => dispatch({ type: 'updateMarketingLine', id: line.id, patch: { unitPrice } })}
                      />
                    </td>

                    <td className="num">
                      <div className="cell-result">{f.num(calc.netTotal)}</div>
                      <span className="cell-note">net</span>
                    </td>

                    <td>
                      <label className="vat-check">
                        <input
                          type="checkbox"
                          checked={line.vatable}
                          aria-label={`VAT applies at ${f.pct(vatRate)}`}
                          onChange={(e) =>
                            dispatch({ type: 'updateMarketingLine', id: line.id, patch: { vatable: e.target.checked } })
                          }
                        />
                        <span>{line.vatable ? `VAT ${f.pct(vatRate)}` : 'No VAT'}</span>
                      </label>
                      <span className="cell-note text-right">
                        {line.vatable
                          ? `${f.num(calc.vatAmount)} · incl. ${f.num(calc.totalIncludingVat)}`
                          : 'zero-rated'}
                      </span>
                    </td>

                    <td className="num">
                      <div className="cell-result">{f.num(calc.totalPrice)}</div>
                      <span className="cell-note">{f.num(calc.costBase)} ÷ {f.int(quantityProduced)} = per unit</span>
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          title="Duplicate row"
                          aria-label="Duplicate row"
                          onClick={() => dispatch({ type: 'duplicateMarketingLine', id: line.id })}
                        >
                          ⧉
                        </button>
                        <button
                          className="icon-btn icon-btn--danger"
                          title="Delete row"
                          aria-label="Delete row"
                          onClick={() => dispatch({ type: 'removeMarketingLine', id: line.id })}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Section totals</td>
                <td className="num">{f.num(result.netTotal)}</td>
                <td className="num">{f.num(result.vatTotal)}</td>
                <td className="num">{f.num(result.perUnit)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="table-footnote">
        <div className="mini-total">
          <span className="mini-total__label">Marketing Net</span>
          <span className="mini-total__value">{f.money(result.netTotal)}</span>
        </div>
        <div className="mini-total">
          <span className="mini-total__label">VAT ({vatTreatment === 'inclusive' ? 'in cost' : 'recoverable'})</span>
          <span className="mini-total__value">{f.money(result.vatTotal)}</span>
        </div>
        <div className="mini-total">
          <span className="mini-total__label">Marketing Total</span>
          <span className="mini-total__value">{f.money(result.total)}</span>
        </div>
        <div className="mini-total">
          <span className="mini-total__label">Marketing Per Unit</span>
          <span className="mini-total__value mini-total__value--accent">{f.money(result.perUnit)}</span>
        </div>
      </div>

      {lines.length > 0 && (
        <div style={{ padding: '0 18px 14px' }}>
          <Notice tone="info">
            Every marketing line is divided by Quantity Produced:
            {' '}<strong>{f.money(result.total)} ÷ {f.int(quantityProduced)} units = {f.money(result.perUnit)} per unit</strong>.
          </Notice>
        </div>
      )}
    </Card>
  );
}
