import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import App from './App';
import { AppStateProvider } from './state/AppStateContext';
import './styles/global.css';
import './styles/print.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter keeps the app working when served as static files. */}
    <HashRouter>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </HashRouter>
  </StrictMode>,
);
