/**
 * Finance Support routing.
 *
 * Routes are derived from the module registry: the home page lists the
 * modules, and each available module owns everything under its base path.
 * Adding a module to the registry is enough to route it.
 */

import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@shell/AppShell';
import { HomePage } from '@shell/HomePage';
import { AVAILABLE_MODULES, type AvailableModule } from '@shell/modules';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />

        {AVAILABLE_MODULES.map((module) => (
          <Route key={module.id} path={`${module.basePath}/*`} element={<ModuleRoutes module={module} />} />
        ))}

        {/* Paths from before Costing & Pricing became a Finance Support module. */}
        <Route path="/costing" element={<Navigate to="/costing-pricing/costing" replace />} />
        <Route path="/pricing" element={<Navigate to="/costing-pricing/pricing" replace />} />
        <Route path="/card" element={<Navigate to="/costing-pricing/card" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

/** The pages of one module, plus a redirect from its base path. */
function ModuleRoutes({ module }: { module: AvailableModule }) {
  return (
    <Routes>
      <Route index element={<Navigate to={module.pages[0].path} replace />} />
      {module.pages.map((page) => (
        <Route key={page.path} path={page.path} element={page.element} />
      ))}
      <Route path="*" element={<Navigate to={module.pages[0].path} replace />} />
    </Routes>
  );
}

/**
 * Composes the state providers of every available module.
 *
 * Mounted above the router so a module keeps its state while the user works in
 * another one. With many modules this is where lazy mounting would go.
 */
export function ModuleProviders({ children }: { children: ReactNode }) {
  const tree = AVAILABLE_MODULES.reduceRight<ReactNode>(
    (inner, module) => (module.Provider ? <module.Provider>{inner}</module.Provider> : inner),
    children,
  );
  return <>{tree}</>;
}
