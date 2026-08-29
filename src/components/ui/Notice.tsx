import type { ReactNode } from 'react';

const ICONS = { error: '!', warn: '!', info: 'i', accent: '=' } as const;

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'error' | 'warn' | 'info' | 'accent';
  children: ReactNode;
}) {
  return (
    <div className={`notice notice--${tone}`}>
      <span className="notice__icon" aria-hidden>{ICONS[tone]}</span>
      <div>{children}</div>
    </div>
  );
}
