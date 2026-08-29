/**
 * Optional product identification + the mandatory Quantity Produced input.
 * Quantity Produced drives every allocation on the page, so it is validated
 * and explained inline.
 */

import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { NumericInput } from '../ui/NumericInput';
import { Notice } from '../ui/Notice';
import { useApp } from '../../state/AppStateContext';
import { useFormatters } from '../../hooks/useFormatters';
import { issueFor, RULES } from '../../lib/validation';

export function ProductInfoCard() {
  const { state, dispatch, costingIssues } = useApp();
  const { product, quantityProduced } = state.costing;
  const f = useFormatters();
  const qtyError = issueFor(costingIssues, 'quantityProduced');

  return (
    <Card
      title="Product & Production"
      subtitle="Identify the product being costed and the production run the costs are spread over."
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Product Name" htmlFor="product-name" hint="Optional">
            <input
              id="product-name"
              className="input"
              value={product.name}
              placeholder="e.g. Milton Shirt SS26"
              onChange={(e) => dispatch({ type: 'setProductField', field: 'name', value: e.target.value })}
            />
          </Field>

          <Field label="Product Code / SKU" htmlFor="product-code" hint="Optional">
            <input
              id="product-code"
              className="input"
              value={product.code}
              placeholder="e.g. SH-1042"
              onChange={(e) => dispatch({ type: 'setProductField', field: 'code', value: e.target.value })}
            />
          </Field>

          <Field label="Category" htmlFor="product-category" hint="Optional">
            <input
              id="product-category"
              className="input"
              value={product.category}
              placeholder="e.g. Shirts"
              onChange={(e) => dispatch({ type: 'setProductField', field: 'category', value: e.target.value })}
            />
          </Field>

          <Field label="Costing Date" htmlFor="product-date">
            <input
              id="product-date"
              className="input"
              type="date"
              value={product.costingDate}
              onChange={(e) => dispatch({ type: 'setProductField', field: 'costingDate', value: e.target.value })}
            />
          </Field>

          <Field
            label="Quantity Produced *"
            htmlFor="quantity-produced"
            hint={
              quantityProduced > 0
                ? `Allocated costs are divided by ${f.int(quantityProduced)} units.`
                : undefined
            }
            error={qtyError?.message}
          >
            <NumericInput
              id="quantity-produced"
              value={quantityProduced}
              min={0}
              step={1}
              invalid={Boolean(qtyError)}
              ariaLabel="Quantity Produced"
              suffix="units"
              onChange={(value) => dispatch({ type: 'setQuantityProduced', value })}
            />
          </Field>
        </div>

        {qtyError && <Notice tone="error">{RULES.quantityProduced} Allocation calculations cannot run without it.</Notice>}
      </div>
    </Card>
  );
}
