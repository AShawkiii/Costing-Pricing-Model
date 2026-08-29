import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { CostingPage } from './pages/CostingPage';
import { PricingPage } from './pages/PricingPage';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/costing" replace />} />
        <Route path="/costing" element={<CostingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="*" element={<Navigate to="/costing" replace />} />
      </Routes>
    </AppShell>
  );
}
