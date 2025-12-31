import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppLayout from './components/layout/AppLayout';
import Landing from './pages/Landing';
import DNALab from './pages/DNALab';
import Simulator from './pages/Simulator';
import Archive from './pages/Archive';
import HiringPlanner from './pages/HiringPlanner';
import GrowthTracker from './pages/GrowthTracker';
import Valuation from './pages/Toolkit/Valuation';
import TaxCredit from './pages/Toolkit/TaxCredit';
import Dilution from './pages/Toolkit/Dilution';
import AIAdvisor from './pages/AIAdvisor';
import EnvDebug from './pages/EnvDebug';
import APITest from './pages/APITest';
import { WelcomeOverlay } from './components/ui/WelcomeOverlay';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        richColors
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(26, 26, 31, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
      <WelcomeOverlay />
      <Routes>
        {/* Landing page - no layout wrapper */}
        <Route path="/" element={<Landing />} />

        {/* App pages with sidebar layout */}
        <Route element={<AppLayout />}>
          <Route path="/dna-lab" element={<DNALab />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/hiring" element={<HiringPlanner />} />
          <Route path="/growth" element={<GrowthTracker />} />
          <Route path="/valuation" element={<Valuation />} />
          <Route path="/tax-credit" element={<TaxCredit />} />
          <Route path="/dilution" element={<Dilution />} />
          <Route path="/ai-advisor" element={<AIAdvisor />} />
          <Route path="/env-debug" element={<EnvDebug />} />
          <Route path="/api-test" element={<APITest />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
