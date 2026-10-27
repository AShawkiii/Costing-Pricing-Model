/**
 * Save button and save status, shown in the shell header while the module is
 * open. The user always knows whether their work is in the database: the chip
 * reads saved, unsaved changes, saving, or the reason it failed.
 */

import { Notice } from '@shared/ui/Notice';

import { useLibrary } from '../../state/LibraryContext';

export function SaveControls() {
  const { save, saveAsNew, saveState, hasUnsavedChanges, savedProductId, apiEnabled } = useLibrary();

  if (!apiEnabled) return null;

  const saving = saveState.status === 'saving';

  return (
    <div className="save-controls">
      <SaveStatusChip />
      <button className="btn btn--primary btn--sm" onClick={() => void save()} disabled={saving}>
        {saving ? 'Saving…' : savedProductId ? 'Save' : 'Save product'}
      </button>
      {savedProductId && (
        <button
          className="btn btn--ghost-light btn--sm"
          onClick={() => void saveAsNew()}
          disabled={saving}
          title="Store the current figures as a separate product"
        >
          Save as new
        </button>
      )}
      {hasUnsavedChanges && <span className="sr-only">You have unsaved changes.</span>}
    </div>
  );
}

function SaveStatusChip() {
  const { saveState, hasUnsavedChanges, savedProductId } = useLibrary();

  if (saveState.status === 'saving') return <span className="save-chip save-chip--busy">Saving…</span>;
  if (saveState.status === 'error') return <span className="save-chip save-chip--error">Not saved</span>;
  if (hasUnsavedChanges) return <span className="save-chip save-chip--dirty">Unsaved changes</span>;
  if (savedProductId && saveState.at) {
    return <span className="save-chip save-chip--ok">Saved {formatTime(saveState.at)}</span>;
  }
  if (savedProductId) return <span className="save-chip save-chip--ok">Saved</span>;
  return <span className="save-chip">Not in library</span>;
}

/** The result of the last save, shown in the page body where it is readable. */
export function SaveResultNotice() {
  const { saveState, dismissSaveMessage, apiEnabled } = useLibrary();
  if (!apiEnabled || !saveState.message) return null;

  return (
    <Notice tone={saveState.status === 'error' ? 'error' : 'accent'}>
      <div className="row-gap" style={{ justifyContent: 'space-between' }}>
        <span>{saveState.message}</span>
        <button className="btn btn--secondary btn--sm" onClick={dismissSaveMessage}>
          Dismiss
        </button>
      </div>
    </Notice>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
