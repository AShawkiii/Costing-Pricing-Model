/**
 * Application shell: brand, page navigation and the global actions
 * (New Costing, Print / Export, Settings). Every button is wired.
 */

import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Notice } from '../ui/Notice';
import { SettingsDialog } from '../settings/SettingsDialog';
import { CostSheet } from '../print/CostSheet';
import { CostingPricingCard } from '../card/CostingPricingCard';
import { printDocument } from '../../lib/print';
import { useApp } from '../../state/AppStateContext';
import { useFormatters } from '../../hooks/useFormatters';

export function AppShell({ children }: { children: ReactNode }) {
  const { dispatch, costing, persistenceFailed } = useApp();
  const f = useFormatters();
  const [confirmReset, setConfirmReset] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="app-header screen-only">
        <div className="app-header__top">
          <div className="app-brand">
            <span className="app-brand__mark">₤</span>
            <div>
              <div className="app-brand__title">Costing &amp; Pricing Model</div>
              <div className="app-brand__subtitle">
                v{__APP_VERSION__} · Total cost per unit · {f.money(costing.totalCostPerUnit)}
              </div>
            </div>
          </div>

          <div className="app-header__actions">
            <button className="btn btn--ghost-light btn--sm" onClick={() => setSettingsOpen(true)}>
              Settings
            </button>
            <button className="btn btn--ghost-light btn--sm" onClick={() => printDocument('sheet')}>
              Print / Export
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => setConfirmReset(true)}>
              New Costing
            </button>
          </div>
        </div>

        <nav className="app-nav">
          <NavLink to="/costing" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="app-nav__step">1</span> Costing
          </NavLink>
          <NavLink to="/pricing" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="app-nav__step">2</span> Pricing
          </NavLink>
          <NavLink to="/card" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="app-nav__step">3</span> Card
          </NavLink>
        </nav>
      </header>

      <main className="app-main screen-only">
        {persistenceFailed && (
          <div style={{ maxWidth: 1560, margin: '0 auto 16px' }}>
            <Notice tone="warn">
              This browser refused to save the model locally — usually a full storage quota (a large product photo) or
              private browsing. Your work still calculates normally, but it will be lost on reload. Print or export the
              cost sheet to keep a copy.
            </Notice>
          </div>
        )}
        {children}
      </main>

      {/* Confirmation before clearing the model */}
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
          This clears the product information, every cost line, the indirect costs and the pricing inputs of the current
          model. Your settings (currency, VAT rate, categories) are kept.
        </Notice>
        <p className="text-muted" style={{ margin: 0 }}>
          Print or export the current cost sheet first if you need a record of it.
        </p>
      </Modal>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Hidden on screen; body[data-print] selects which one is printed */}
      <CostSheet />
      <div className="print-card">
        <CostingPricingCard />
      </div>
    </div>
  );
}
