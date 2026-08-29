import { Notice } from '@shared/ui/Notice';
import type { ValidationIssue } from '../lib/validation';

/** Renders the current validation errors / warnings for a page. */
export function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  if (errors.length === 0 && warnings.length === 0) return null;

  // De-duplicate identical messages coming from several rows.
  const unique = (list: ValidationIssue[]) => [...new Set(list.map((i) => i.message))];

  return (
    <div className="stack">
      {errors.length > 0 && (
        <Notice tone="error">
          <strong>{errors.length} issue{errors.length > 1 ? 's' : ''} blocking an accurate result</strong>
          <ul>{unique(errors).map((m) => <li key={m}>{m}</li>)}</ul>
        </Notice>
      )}
      {warnings.length > 0 && (
        <Notice tone="warn">
          <ul>{unique(warnings).map((m) => <li key={m}>{m}</li>)}</ul>
        </Notice>
      )}
    </div>
  );
}
