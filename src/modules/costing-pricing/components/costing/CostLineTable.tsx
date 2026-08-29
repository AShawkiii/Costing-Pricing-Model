/**
 * Dynamic cost table shared by SECTION 1 (Direct Cost) and SECTION 2 (Sample
 * Cost) — both have identical columns and behaviour, only the mandatory flag
 * and the copy differ.
 *
 * Columns: Description | Quantity | Measurement | Unit Price | Total | VAT |
 *          Allocation | Total Price
 */

import { Card, OptionalBadge, RequiredBadge } from '@shared/ui/Card';
import { NumericInput } from '@shared/ui/NumericInput';
import { Notice } from '@shared/ui/Notice';
import { useApp } from '../../state/AppStateContext';
import { useFormatters } from '../../hooks/useFormatters';
import type { CostSectionKey } from '../../state/store';
import type { CostSectionResult } from '../../lib/calculations';

interface Props {
  section: CostSectionKey;
  index: number;
  title: string;
  subtitle: string;
  mandatory: boolean;
  emptyHint: string;
  result: CostSectionResult;
}

export function CostLineTable({ section, index, title, subtitle, mandatory, emptyHint, result }: Props) {
  const { state, dispatch } = useApp();
  const f = useFormatters();
  const lines = state.costing[section];
  const { measurements, vatTreatment, unallocatedTreatment, vatRate } = state.settings;
  const quantityProduced = state.costing.quantityProduced;

  return (
    <Card
      index={index}
      title={title}
      subtitle={subtitle}
      badge={mandatory ? <RequiredBadge /> : <OptionalBadge />}
      actions={
        <button className="btn btn--primary btn--sm" onClick={() => dispatch({ type: 'addCostLine', section })}>
          + Add Row
        </button>
      }
      flush
    >
      {lines.length === 0 ? (
        <div className="empty-state">
          {emptyHint}
          <div style={{ marginTop: 10 }}>
            <button className="btn btn--secondary btn--sm" onClick={() => dispatch({ type: 'addCostLine', section })}>
              + Add the first row
            </button>
          </div>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 190 }}>Description</th>
                <th className="num" style={{ width: 96 }}>Quantity</th>
                <th style={{ width: 120 }}>Measurement</th>
                <th className="num" style={{ width: 118 }}>Unit Price</th>
                <th className="num" style={{ width: 118 }}>Total</th>
                <th className="num" style={{ width: 128 }}>VAT ({f.pct(vatRate)})</th>
                <th style={{ width: 108 }}>Allocation</th>
                <th className="num" style={{ width: 140 }}>Total Price</th>
                <th style={{ width: 72 }} aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const calc = result.lines[i];
                const invalidQty = !(line.quantity >= 0);
                const invalidPrice = !(line.unitPrice >= 0);

                return (
                  <tr key={line.id}>
                    <td>
                      <input
                        className="input"
                        value={line.description}
                        placeholder="e.g. Milton Fabric"
                        aria-label="Description"
                        onChange={(e) =>
                          dispatch({ type: 'updateCostLine', section, id: line.id, patch: { description: e.target.value } })
                        }
                      />
                    </td>

                    <td>
                      <NumericInput
                        value={line.quantity}
                        min={0}
                        invalid={invalidQty}
                        ariaLabel="Quantity"
                        onChange={(quantity) =>
                          dispatch({ type: 'updateCostLine', section, id: line.id, patch: { quantity } })
                        }
                      />
                    </td>

                    <td>
                      <select
                        className="select"
                        value={line.measurementId}
                        aria-label="Measurement"
                        onChange={(e) =>
                          dispatch({ type: 'updateCostLine', section, id: line.id, patch: { measurementId: e.target.value } })
                        }
                      >
                        {measurements.map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <NumericInput
                        value={line.unitPrice}
                        min={0}
                        invalid={invalidPrice}
                        ariaLabel="Unit Price"
                        onChange={(unitPrice) =>
                          dispatch({ type: 'updateCostLine', section, id: line.id, patch: { unitPrice } })
                        }
                      />
                    </td>

                    {/* Total = Quantity x Unit Price — read-only */}
                    <td className="num">
                      <div className="cell-result">{f.num(calc.netTotal)}</div>
                      <span className="cell-note">net</span>
                    </td>

                    {/* VAT is a checkbox: ticked = taxed at the Settings rate, unticked = zero */}
                    <td>
                      <label className="vat-check">
                        <input
                          type="checkbox"
                          checked={line.vatable}
                          aria-label={`VAT applies at ${f.pct(vatRate)}`}
                          onChange={(e) =>
                            dispatch({
                              type: 'updateCostLine',
                              section,
                              id: line.id,
                              patch: { vatable: e.target.checked },
                            })
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

                    <td>
                      <select
                        className="select"
                        value={line.allocate ? 'yes' : 'no'}
                        aria-label="Allocation"
                        onChange={(e) =>
                          dispatch({
                            type: 'updateCostLine',
                            section,
                            id: line.id,
                            patch: { allocate: e.target.value === 'yes' },
                          })
                        }
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </td>

                    {/* Total Price = Total / Quantity Produced (Yes) or Total (No) */}
                    <td className="num">
                      <div className="cell-result">{f.num(calc.totalPrice)}</div>
                      <span className="cell-note">
                        {line.allocate
                          ? `${f.num(calc.costBase)} ÷ ${f.int(quantityProduced)} = per unit`
                          : unallocatedTreatment === 'per-unit'
                            ? 'not allocated · counts per unit'
                            : 'not allocated · lump sum'}
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          title="Duplicate row"
                          aria-label="Duplicate row"
                          onClick={() => dispatch({ type: 'duplicateCostLine', section, id: line.id })}
                        >
                          ⧉
                        </button>
                        <button
                          className="icon-btn icon-btn--danger"
                          title="Delete row"
                          aria-label="Delete row"
                          onClick={() => dispatch({ type: 'removeCostLine', section, id: line.id })}
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
                <td />
                <td className="num">{f.num(result.perUnit)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="table-footnote">
        <div className="mini-total">
          <span className="mini-total__label">{title} — Net</span>
          <span className="mini-total__value">{f.money(result.netTotal)}</span>
        </div>
        <div className="mini-total">
          <span className="mini-total__label">VAT ({vatTreatment === 'inclusive' ? 'in cost' : 'recoverable'})</span>
          <span className="mini-total__value">{f.money(result.vatTotal)}</span>
        </div>
        <div className="mini-total">
          <span className="mini-total__label">{title} Total</span>
          <span className="mini-total__value">{f.money(result.total)}</span>
        </div>
        <div className="mini-total">
          <span className="mini-total__label">{title} Per Unit</span>
          <span className="mini-total__value mini-total__value--accent">{f.money(result.perUnit)}</span>
        </div>
      </div>

      {result.unallocatedTotal > 0 && (
        <div style={{ padding: '0 18px 14px' }}>
          <Notice tone="warn">
            {f.money(result.unallocatedTotal)} of this section is marked <strong>Allocation = No</strong> and is kept as a
            lump-sum production cost, outside the cost per unit (Settings → unallocated cost treatment).
          </Notice>
        </div>
      )}
    </Card>
  );
}
