/**
 * Costing & Pricing — the first Finance Support module.
 *
 * Everything the shell needs to mount this module is declared here: its pages,
 * its state provider, the buttons it contributes to the header, and the
 * documents it can print. The shell knows nothing else about it.
 */

import { useState, type ReactNode } from 'react';

import { Modal } from '@shared/ui/Modal';
import { Notice } from '@shared/ui/Notice';
import { printDocument } from '@shared/lib/print';
import type { AvailableModule } from '@shell/modules';

import { CostingPricingCard } from './components/card/CostingPricingCard';
import { CostSheet } from './components/print/CostSheet';
import { SettingsDialog } from './components/settings/SettingsDialog';
import { SaveControls } from './components/library/SaveControls';
import { CardPage } from './pages/CardPage';
import { LibraryPage } from './pages/LibraryPage';
import { CostingPage } from './pages/CostingPage';
import { PricingPage } from './pages/PricingPage';
import { AppStateProvider, useApp } from './state/AppStateContext';
import { LibraryProvider, useLibrary } from './state/LibraryContext';
import { useFormatters } from './hooks/useFormatters';

import './styles/module.css';

export { COSTING_PRICING_BASE } from './routes';

import { COSTING_PRICING_BASE as BASE_PATH } from './routes';

/**
 * The module's state: the workspace model, and the library of products saved
 * in the database on top of it.
 */
function CostingPricingProvider({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <LibraryProvider>{children}</LibraryProvider>
    </AppStateProvider>
  );
}

/** Header buttons shown while this module is open. */
function CostingPricingActions() {
  const { dispatch } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <SaveControls />
      <button className="btn btn--ghost-light btn--sm" onClick={() => setSettingsOpen(true)}>
        Settings
      </button>
      <button className="btn btn--ghost-light btn--sm" onClick={() => printDocument('sheet')}>
        Print / Export
      </button>
      <button className="btn btn--primary btn--sm" onClick={() => setConfirmReset(true)}>
        New Costing
      </button>

      <Modal
        open={confirmReset}
        title="Start a new costing?"
        onClose={() => setConfirmReset(false)}
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button
              className="btn btn--danger"
              onClick={() => {
                dispatch({ type: 'resetModel' });
                setConfirmReset(false);
              }}
            >
              Clear and start new
            </button>
          </>
        }
      >
        <Notice tone="warn">
          This clears the product information, the photo, every cost line, the indirect costs and the pricing inputs of
          the current model. Your settings (currency, VAT rate, categories) are kept.
        </Notice>
        <p className="text-muted" style={{ margin: 0 }}>
          Print or export the current cost sheet first if you need a record of it.
        </p>
      </Modal>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

/** Hidden on screen; body[data-print] decides which one the browser prints. */
function CostingPricingPrintDocuments() {
  return (
    <>
      <CostSheet />
      <div className="print-card">
        <CostingPricingCard />
      </div>
    </>
  );
}

/** Live figures on the module's tile on the Finance Support home page. */
function CostingPricingHomeSummary() {
  const { state, costing, pricing } = useApp();
  const { total, status, apiEnabled } = useLibrary();
  const f = useFormatters();
  const { product } = state.costing;

  return (
    <dl className="tile-stats">
      <div>
        <dt>Current model</dt>
        <dd>{product.name || 'Untitled product'}</dd>
      </div>
      <div>
        <dt>Total cost per unit</dt>
        <dd>{f.money(costing.totalCostPerUnit)}</dd>
      </div>
      <div>
        <dt>Selling price at {f.pct(pricing.targetGrossMargin)}</dt>
        <dd>{f.money(pricing.sellingPrice)}</dd>
      </div>
      <div>
        <dt>Saved products</dt>
        <dd>{!apiEnabled ? '—' : status === 'ready' ? f.int(total) : '…'}</dd>
      </div>
    </dl>
  );
}

export const costingPricingModule: AvailableModule = {
  id: 'costing-pricing',
  name: 'Costing & Pricing',
  description:
    'True cost per unit for a production run — materials, samples, marketing, overheads and exchange-rate valuation — and the selling price required to hit a target gross profit margin.',
  group: 'Costing & Pricing',
  status: 'available',
  basePath: BASE_PATH,
  mark: '₤',
  pages: [
    { path: 'costing', label: 'Costing', element: <CostingPage /> },
    { path: 'pricing', label: 'Pricing', element: <PricingPage /> },
    { path: 'card', label: 'Card', element: <CardPage /> },
    { path: 'library', label: 'Library', element: <LibraryPage /> },
  ],
  Provider: CostingPricingProvider,
  Actions: CostingPricingActions,
  PrintDocuments: CostingPricingPrintDocuments,
  HomeSummary: CostingPricingHomeSummary,
};
