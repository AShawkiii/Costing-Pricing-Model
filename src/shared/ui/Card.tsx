import type { ReactNode } from 'react';

interface CardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  index?: number;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}

export function Card({ title, subtitle, index, badge, actions, children, flush }: CardProps) {
  return (
    <section className="card">
      <header className="card__header">
        <div className="card__titles">
          <h2 className="card__title">
            {index !== undefined && <span className="section-index">{index}</span>}
            {title}
            {badge}
          </h2>
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="card__actions">{actions}</div>}
      </header>
      <div className={flush ? 'card__body card__body--flush' : 'card__body'}>{children}</div>
    </section>
  );
}

export function RequiredBadge() {
  return <span className="badge badge--required">Mandatory</span>;
}

export function OptionalBadge() {
  return <span className="badge badge--optional">Optional</span>;
}
