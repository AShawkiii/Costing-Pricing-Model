import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import { SystemStatusProvider } from '@shared/state/SystemStatus';

import App, { ModuleProviders } from './App';
import './styles/global.css';
import './styles/print.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter keeps the app working when served as static files. */}
    <HashRouter>
      <SystemStatusProvider>
        <ModuleProviders>
          <App />
        </ModuleProviders>
      </SystemStatusProvider>
    </HashRouter>
  </StrictMode>,
);
