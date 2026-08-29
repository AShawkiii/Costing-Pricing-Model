/**
 * PAGE 1 — COSTING
 * Sections: Direct Cost (mandatory), Sample Cost, Marketing Expenses,
 * Indirect Cost (mandatory), plus the sticky Cost Summary.
 */

import { ProductInfoCard } from '../components/costing/ProductInfoCard';
import { ProductPhotoCard } from '../components/costing/ProductPhotoCard';
import { CostLineTable } from '../components/costing/CostLineTable';
import { MarketingTable } from '../components/costing/MarketingTable';
import { IndirectCostCard } from '../components/costing/IndirectCostCard';
import { CostSummaryCard } from '../components/costing/CostSummaryCard';
import { ValidationPanel } from '../components/ValidationPanel';
import { Notice } from '../components/ui/Notice';
import { useApp } from '../state/AppStateContext';
import { useFormatters } from '../hooks/useFormatters';

export function CostingPage() {
  const { state, costing, costingIssues } = useApp();
  const f = useFormatters();

  return (
    <div className="page-layout">
      <div className="page-column">
        <ValidationPanel issues={costingIssues} />

        <ProductInfoCard />

        <ProductPhotoCard />

        <Notice tone="accent">
          <strong>Allocation rule.</strong> <em>Yes</em> spreads the line over the production run
          (Total ÷ {f.int(state.costing.quantityProduced)} units). <em>No</em> keeps the line unallocated —
          {state.settings.unallocatedTreatment === 'per-unit'
            ? ' its full amount is counted for every unit.'
            : ' it stays a lump-sum production cost outside the cost per unit.'}{' '}
          Marketing is always allocated; Overheads Per Unit is always already per unit.
        </Notice>

        <CostLineTable
          section="directCosts"
          index={1}
          title="Direct Cost"
          subtitle="Materials, trims, packaging and production charges that build the garment."
          mandatory
          emptyHint="Direct Cost is mandatory — add at least one line."
          result={costing.direct}
        />

        <CostLineTable
          section="sampleCosts"
          index={2}
          title="Sample Cost"
          subtitle="Development and sampling costs. Optional — leave empty and sample cost is 0."
          mandatory={false}
          emptyHint="No sample costs — sample cost is 0. You can continue without adding any."
          result={costing.sample}
        />

        <MarketingTable index={3} result={costing.marketing} />

        <IndirectCostCard index={4} result={costing} />
      </div>

      <aside className="page-aside">
        <CostSummaryCard />
      </aside>
    </div>
  );
}
