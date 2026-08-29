/**
 * Settings — everything that the specification asks to keep "configurable":
 * VAT rate & treatment, currency, unallocated-cost treatment, measurement
 * units, marketing categories and the scenario margins.
 */

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { NumericInput, PercentInput } from '../ui/NumericInput';
import { Notice } from '../ui/Notice';
import { useApp } from '../../state/AppStateContext';
import { createId } from '../../lib/id';
import { formatPercent } from '../../lib/format';

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const { settings, pricing } = state;
  const [newMeasurement, setNewMeasurement] = useState('');
  const [newMarketingType, setNewMarketingType] = useState('');
  const [newScenario, setNewScenario] = useState(0.65);

  const addMeasurement = () => {
    const label = newMeasurement.trim();
    if (!label) return;
    dispatch({
      type: 'updateSettings',
      patch: { measurements: [...settings.measurements, { id: createId('m'), label }] },
    });
    setNewMeasurement('');
  };

  const addMarketingType = () => {
    const label = newMarketingType.trim();
    if (!label) return;
    dispatch({
      type: 'updateSettings',
      patch: { marketingTypes: [...settings.marketingTypes, { id: createId('mt'), label }] },
    });
    setNewMarketingType('');
  };

  const addScenario = () => {
    if (!(newScenario >= 0 && newScenario < 1)) return;
    const margins = [...new Set([...pricing.scenarioMargins, Number(newScenario.toFixed(4))])].sort((a, b) => a - b);
    dispatch({ type: 'setScenarioMargins', value: margins });
  };

  return (
    <Modal
      open={open}
      title="Settings"
      onClose={onClose}
      footer={<button className="btn btn--primary" onClick={onClose}>Done</button>}
    >
      <div className="form-grid">
        <Field label="Currency" htmlFor="setting-currency">
          <input
            id="setting-currency"
            className="input"
            value={settings.currency}
            onChange={(e) => dispatch({ type: 'updateSettings', patch: { currency: e.target.value } })}
          />
        </Field>

        <Field label="Default VAT Rate" htmlFor="setting-vat" hint="Applied to new cost lines.">
          <PercentInput
            id="setting-vat"
            value={settings.defaultVatRate}
            min={0}
            max={100}
            onChange={(defaultVatRate) => dispatch({ type: 'updateSettings', patch: { defaultVatRate } })}
          />
        </Field>
      </div>

      <button
        className="btn btn--secondary btn--sm"
        onClick={() => dispatch({ type: 'applyVatRateToAllLines', value: settings.defaultVatRate })}
      >
        Apply {formatPercent(settings.defaultVatRate)} VAT to every existing line
      </button>

      <Field label="VAT treatment in costing">
        <div className="toggle-group">
          <button
            aria-pressed={settings.vatTreatment === 'inclusive'}
            onClick={() => dispatch({ type: 'updateSettings', patch: { vatTreatment: 'inclusive' } })}
          >
            VAT is a cost (inclusive)
          </button>
          <button
            aria-pressed={settings.vatTreatment === 'recoverable'}
            onClick={() => dispatch({ type: 'updateSettings', patch: { vatTreatment: 'recoverable' } })}
          >
            VAT is recoverable (net)
          </button>
        </div>
      </Field>
      <Notice tone="info">
        <strong>Inclusive</strong> costs each line at Net + VAT — use it when input VAT cannot be reclaimed.{' '}
        <strong>Recoverable</strong> costs the net amount and reports VAT for information only.
      </Notice>

      <Field label="Lines with Allocation = No">
        <div className="toggle-group">
          <button
            aria-pressed={settings.unallocatedTreatment === 'per-unit'}
            onClick={() => dispatch({ type: 'updateSettings', patch: { unallocatedTreatment: 'per-unit' } })}
          >
            Count in full per unit
          </button>
          <button
            aria-pressed={settings.unallocatedTreatment === 'total-only'}
            onClick={() => dispatch({ type: 'updateSettings', patch: { unallocatedTreatment: 'total-only' } })}
          >
            Keep as lump sum
          </button>
        </div>
      </Field>
      <Notice tone="warn">
        <strong>Count in full per unit</strong> follows the rule “Total Price = Total” literally: the line is treated as a
        cost incurred for every unit.{' '}
        <strong>Keep as lump sum</strong> excludes it from the cost per unit and reports it separately as a total
        production cost.
      </Notice>

      <Field label="Measurement units">
        <div className="chip-list">
          {settings.measurements.map((m) => (
            <span className="chip" key={m.id}>
              {m.label}
              <button
                aria-label={`Remove ${m.label}`}
                onClick={() =>
                  dispatch({
                    type: 'updateSettings',
                    patch: { measurements: settings.measurements.filter((x) => x.id !== m.id) },
                  })
                }
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </Field>
      <div className="inline-form">
        <input
          className="input"
          placeholder="Add a measurement (e.g. Yard)"
          value={newMeasurement}
          onChange={(e) => setNewMeasurement(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addMeasurement(); }}
        />
        <button className="btn btn--secondary" onClick={addMeasurement}>Add</button>
      </div>

      <Field label="Marketing categories">
        <div className="chip-list">
          {settings.marketingTypes.map((t) => (
            <span className="chip" key={t.id}>
              {t.label}
              <button
                aria-label={`Remove ${t.label}`}
                onClick={() =>
                  dispatch({
                    type: 'updateSettings',
                    patch: { marketingTypes: settings.marketingTypes.filter((x) => x.id !== t.id) },
                  })
                }
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </Field>
      <div className="inline-form">
        <input
          className="input"
          placeholder="Add a marketing category"
          value={newMarketingType}
          onChange={(e) => setNewMarketingType(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addMarketingType(); }}
        />
        <button className="btn btn--secondary" onClick={addMarketingType}>Add</button>
      </div>

      <Field label="Pricing scenario margins">
        <div className="chip-list">
          {pricing.scenarioMargins.map((m) => (
            <span className="chip" key={m}>
              {formatPercent(m)}
              <button
                aria-label={`Remove ${formatPercent(m)} scenario`}
                onClick={() =>
                  dispatch({ type: 'setScenarioMargins', value: pricing.scenarioMargins.filter((x) => x !== m) })
                }
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </Field>
      <div className="inline-form">
        <div style={{ width: 140 }}>
          <NumericInput
            value={Number((newScenario * 100).toFixed(2))}
            min={0}
            max={99.99}
            suffix="%"
            ariaLabel="New scenario margin"
            onChange={(pct) => setNewScenario(pct / 100)}
          />
        </div>
        <button className="btn btn--secondary" onClick={addScenario}>Add scenario</button>
      </div>
    </Modal>
  );
}
