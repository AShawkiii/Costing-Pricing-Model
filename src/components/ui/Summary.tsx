import type { ReactNode } from 'react';

export function SummaryRow({
  label,
  value,
  sub,
  total,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: boolean;
  total?: boolean;
}) {
  return (
    <div className={`summary-row${sub ? ' summary-row--sub' : ''}${total ? ' summary-row--total' : ''}`}>
      <span className="summary-row__label">{label}</span>
      <span className="summary-row__value">{value}</span>
    </div>
  );
}

export function Headline({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`headline${accent ? ' headline--accent' : ''}`}>
      <div className="headline__label">{label}</div>
      <div className="headline__value">{value}</div>
      {note && <div className="headline__note">{note}</div>}
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: string; note?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {note && <div className="stat__note">{note}</div>}
    </div>
  );
}
