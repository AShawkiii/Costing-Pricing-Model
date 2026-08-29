/**
 * Printable cost sheet.
 *
 * Rendered into the DOM on every page but hidden on screen (see print.css).
 * Pressing Print / Export produces the same complete, management-ready
 * document regardless of which page the user is on. "Save as PDF" in the
 * browser's print dialog gives the PDF export.
 */

import { useApp } from '../../state/AppStateContext';
import { useFormatters } from '../../hooks/useFormatters';

export function CostSheet() {
  const { state, costing, pricing } = useApp();
  const f = useFormatters();
  const { product, quantityProduced, directCosts, sampleCosts, marketingExpenses } = state.costing;
  const { measurements, marketingTypes, vatTreatment } = state.settings;

  const measurementLabel = (id: string) => measurements.find((m) => m.id === id)?.label ?? '—';
  const marketingLabel = (id: string) => marketingTypes.find((t) => t.id === id)?.label ?? '—';

  return (
    <div className="print-sheet">
      <header className="print-sheet__header">
        <div>
          <div className="print-sheet__title">Product Cost &amp; Price Sheet</div>
          <div className="print-sheet__subtitle">
            {product.name || 'Untitled product'}
            {product.code ? ` · ${product.code}` : ''}
            {product.category ? ` · ${product.category}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 9.5 }}>
          <div><strong>Costing date:</strong> {product.costingDate || '—'}</div>
          <div><strong>Version:</strong> {product.version || '1'}</div>
          <div><strong>Status:</strong> {product.approvalStatus ?? 'draft'}</div>
        </div>
      </header>

      <div className="print-meta">
        <div><div className="k">Quantity Produced</div><div className="v">{f.int(quantityProduced)} units</div></div>
        <div><div className="k">Currency</div><div className="v">{f.currency}</div></div>
        <div><div className="k">VAT treatment</div><div className="v">{vatTreatment === 'inclusive' ? 'Included in cost' : 'Recoverable'}</div></div>
        <div><div className="k">Exchange Rate Valuation</div><div className="v">{f.pct(costing.exchangeRateValuation)}</div></div>
      </div>

      <section className="print-section">
        <h3>1. Direct Cost</h3>
        <PrintCostTable
          rows={directCosts.map((l, i) => ({
            description: l.description || '—',
            quantity: f.qty(l.quantity),
            measurement: measurementLabel(l.measurementId),
            unitPrice: f.num(l.unitPrice),
            total: f.num(costing.direct.lines[i].netTotal),
            vat: f.num(costing.direct.lines[i].vatAmount),
            allocation: l.allocate ? 'Yes' : 'No',
            totalPrice: f.num(costing.direct.lines[i].totalPrice),
          }))}
          totals={{
            total: f.num(costing.direct.netTotal),
            vat: f.num(costing.direct.vatTotal),
            totalPrice: f.num(costing.direct.perUnit),
          }}
        />
      </section>

      {sampleCosts.length > 0 && (
        <section className="print-section">
          <h3>2. Sample Cost</h3>
          <PrintCostTable
            rows={sampleCosts.map((l, i) => ({
              description: l.description || '—',
              quantity: f.qty(l.quantity),
              measurement: measurementLabel(l.measurementId),
              unitPrice: f.num(l.unitPrice),
              total: f.num(costing.sample.lines[i].netTotal),
              vat: f.num(costing.sample.lines[i].vatAmount),
              allocation: l.allocate ? 'Yes' : 'No',
              totalPrice: f.num(costing.sample.lines[i].totalPrice),
            }))}
            totals={{
              total: f.num(costing.sample.netTotal),
              vat: f.num(costing.sample.vatTotal),
              totalPrice: f.num(costing.sample.perUnit),
            }}
          />
        </section>
      )}

      {marketingExpenses.length > 0 && (
        <section className="print-section">
          <h3>3. Marketing Expenses</h3>
          <table className="print-table">
            <thead>
              <tr>
                <th>Marketing Type</th><th>Description</th><th className="num">Qty</th>
                <th className="num">Unit Price</th><th className="num">Total</th>
                <th className="num">VAT</th><th className="num">Total Price / Unit</th>
              </tr>
            </thead>
            <tbody>
              {marketingExpenses.map((l, i) => (
                <tr key={l.id}>
                  <td>{marketingLabel(l.marketingTypeId)}</td>
                  <td>{l.description || '—'}</td>
                  <td className="num">{f.qty(l.quantity)}</td>
                  <td className="num">{f.num(l.unitPrice)}</td>
                  <td className="num">{f.num(costing.marketing.lines[i].netTotal)}</td>
                  <td className="num">{f.num(costing.marketing.lines[i].vatAmount)}</td>
                  <td className="num">{f.num(costing.marketing.lines[i].totalPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total</td>
                <td className="num">{f.num(costing.marketing.netTotal)}</td>
                <td className="num">{f.num(costing.marketing.vatTotal)}</td>
                <td className="num">{f.num(costing.marketing.perUnit)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      <section className="print-section">
        <h3>4. Indirect Cost</h3>
        <table className="print-kv">
          <tbody>
            <tr><td>Overheads Per Unit (fixed)</td><td>{f.money(costing.overheadsPerUnit)}</td></tr>
            <tr><td>Exchange Rate Valuation</td><td>{f.pct(costing.exchangeRateValuation)}</td></tr>
            <tr><td>Exchange Rate Adjustment Per Unit</td><td>{f.money(costing.exchangeRateAdjustment)}</td></tr>
          </tbody>
        </table>
      </section>

      <div className="print-summary-grid">
        <section className="print-section">
          <h3>Costing Summary</h3>
          <table className="print-kv">
            <tbody>
              <tr><td>Quantity Produced</td><td>{f.int(quantityProduced)} units</td></tr>
              <tr><td>Direct Cost Per Unit</td><td>{f.money(costing.direct.perUnit)}</td></tr>
              <tr><td>Sample Cost Per Unit</td><td>{f.money(costing.sample.perUnit)}</td></tr>
              <tr><td>Marketing Expense Per Unit</td><td>{f.money(costing.marketing.perUnit)}</td></tr>
              <tr><td>Overheads Per Unit</td><td>{f.money(costing.overheadsPerUnit)}</td></tr>
              <tr><td>Base Cost Per Unit</td><td>{f.money(costing.baseCostPerUnit)}</td></tr>
              <tr><td>Exchange Rate Adjustment ({f.pct(costing.exchangeRateValuation)})</td><td>{f.money(costing.exchangeRateAdjustment)}</td></tr>
              <tr className="total"><td>Total Cost Per Unit</td><td>{f.money(costing.totalCostPerUnit)}</td></tr>
            </tbody>
          </table>
          <table className="print-kv" style={{ marginTop: 6 }}>
            <tbody>
              {costing.unallocatedTotal > 0 && (
                <tr><td>Unallocated lump-sum costs</td><td>{f.money(costing.unallocatedTotal)}</td></tr>
              )}
              <tr><td>Total Production Cost</td><td>{f.money(costing.totalProductionCost)}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="print-section">
          <h3>Pricing Summary</h3>
          <table className="print-kv">
            <tbody>
              <tr><td>Cost Per Unit</td><td>{f.money(pricing.costPerUnit)}</td></tr>
              <tr><td>Target Gross Profit Margin</td><td>{f.pct(pricing.targetGrossMargin)}</td></tr>
              <tr><td>Gross Profit Per Unit</td><td>{f.money(pricing.grossProfit)}</td></tr>
              <tr><td>Mark-up on Cost</td><td>{f.pct(pricing.markup)}</td></tr>
              <tr><td>Total Revenue ({f.int(quantityProduced)} units)</td><td>{f.money(pricing.totalRevenue)}</td></tr>
              <tr className="total"><td>Recommended Selling Price</td><td>{f.money(pricing.sellingPrice)}</td></tr>
            </tbody>
          </table>

          <div className="print-highlight">
            <span className="label">Total Cost Per Unit</span>
            <span className="value">{f.money(costing.totalCostPerUnit)}</span>
          </div>
          <div className="print-highlight">
            <span className="label">Recommended Selling Price</span>
            <span className="value">{f.money(pricing.sellingPrice)}</span>
          </div>
        </section>
      </div>

      <section className="print-section">
        <h3>Pricing Scenarios</h3>
        <table className="print-table">
          <thead>
            <tr><th>Gross Margin</th><th className="num">Selling Price</th><th className="num">Gross Profit</th><th className="num">Mark-up</th></tr>
          </thead>
          <tbody>
            {pricing.scenarios.map((s) => (
              <tr key={s.grossMargin}>
                <td>{f.pct(s.grossMargin)}</td>
                <td className="num">{f.num(s.sellingPrice)}</td>
                <td className="num">{f.num(s.grossProfit)}</td>
                <td className="num">{f.pct(s.markup)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="print-signoff">
        <div>Prepared by</div>
        <div>Reviewed by</div>
        <div>Approved by</div>
      </div>

      <footer className="print-footer">
        <span>Costing &amp; Pricing Model — {product.name || 'Untitled product'}</span>
        <span>Printed {new Date().toLocaleString()}</span>
      </footer>
    </div>
  );
}

interface PrintRow {
  description: string;
  quantity: string;
  measurement: string;
  unitPrice: string;
  total: string;
  vat: string;
  allocation: string;
  totalPrice: string;
}

function PrintCostTable({
  rows,
  totals,
}: {
  rows: PrintRow[];
  totals: { total: string; vat: string; totalPrice: string };
}) {
  return (
    <table className="print-table">
      <thead>
        <tr>
          <th>Description</th><th className="num">Qty</th><th>Measurement</th>
          <th className="num">Unit Price</th><th className="num">Total</th>
          <th className="num">VAT</th><th>Alloc.</th><th className="num">Total Price</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={8}>No lines.</td></tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i}>
              <td>{r.description}</td>
              <td className="num">{r.quantity}</td>
              <td>{r.measurement}</td>
              <td className="num">{r.unitPrice}</td>
              <td className="num">{r.total}</td>
              <td className="num">{r.vat}</td>
              <td>{r.allocation}</td>
              <td className="num">{r.totalPrice}</td>
            </tr>
          ))
        )}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={4}>Total</td>
          <td className="num">{totals.total}</td>
          <td className="num">{totals.vat}</td>
          <td />
          <td className="num">{totals.totalPrice}</td>
        </tr>
      </tfoot>
    </table>
  );
}
