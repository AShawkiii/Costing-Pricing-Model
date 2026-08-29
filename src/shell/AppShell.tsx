/**
 * Finance Support shell.
 *
 * Renders the system chrome — brand, module switcher, the open module's page
 * navigation and the buttons that module contributes — around whatever the
 * router puts inside. Everything it shows comes from the module registry, so
 * the shell never needs to know what a module actually does.
 */

import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { Notice } from '@shared/ui/Notice';
import { useSystemStatus } from '@shared/state/SystemStatus';

import { AVAILABLE_MODULES, findModuleByPath, SYSTEM } from './modules';

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const module = findModuleByPath(pathname);

  return (
    <div className="app-shell">
      <header className="app-header screen-only">
        <div className="app-header__top">
          <div className="app-brand">
            <Link to="/" className="app-brand__mark" aria-label={`${SYSTEM.name} home`}>
              FS
            </Link>
            <div>
              <div className="app-brand__title">
                <Link to="/" className="app-brand__system">{SYSTEM.name}</Link>
                {module && (
                  <>
                    <span className="app-brand__divider" aria-hidden>/</span>
                    <span>{module.name}</span>
                  </>
                )}
              </div>
              <div className="app-brand__subtitle">
                v{__APP_VERSION__} · {module ? module.group : SYSTEM.tagline}
              </div>
            </div>
          </div>

          <div className="app-header__actions">
            {AVAILABLE_MODULES.length > 1 && (
              <ModuleSwitcher currentId={module?.id} />
            )}
            {module?.Actions && <module.Actions />}
          </div>
        </div>

        {module && (
          <nav className="app-nav" aria-label={`${module.name} pages`}>
            <Link to="/" className="app-nav__home" title="All modules">
              ← Modules
            </Link>
            {module.pages.map((page, index) => (
              <NavLink
                key={page.path}
                to={`${module.basePath}/${page.path}`}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <span className="app-nav__step">{index + 1}</span> {page.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="app-main screen-only">
        <SystemIssues />
        {children}
      </main>

      {/* Printable documents of the open module (hidden on screen). */}
      {module?.PrintDocuments && <module.PrintDocuments />}
    </div>
  );
}

/** Shown once more than one module exists. */
function ModuleSwitcher({ currentId }: { currentId?: string }) {
  return (
    <div className="module-switcher">
      {AVAILABLE_MODULES.map((m) => (
        <Link
          key={m.id}
          to={`${m.basePath}/${m.pages[0].path}`}
          className={`module-switcher__item${m.id === currentId ? ' module-switcher__item--active' : ''}`}
        >
          {m.name}
        </Link>
      ))}
    </div>
  );
}

/** Problems any module has reported to the system status channel. */
function SystemIssues() {
  const { issues } = useSystemStatus();
  if (issues.length === 0) return null;

  return (
    <div className="shell-notice">
      {issues.map((issue) => (
        <Notice key={issue.key} tone={issue.tone}>{issue.message}</Notice>
      ))}
    </div>
  );
}
