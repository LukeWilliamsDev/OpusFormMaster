// @ts-nocheck
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { PortalProvider, usePortal } from './context/PortalContext';
import { PortalLayout } from './layouts/PortalLayout';
import { LandingPage } from './components/LandingPage';
import { PortalAuthPage } from './pages/PortalAuth';
import { DashboardPage } from './pages/Dashboard';
import { LaborRosterPage } from './pages/LaborRoster';
import { JobLedgerPage } from './pages/JobLedger';
import { PipelinePage } from './pages/Pipeline';

// Guard wrapper to protect dashboard routes
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = usePortal();
  return isAuthenticated ? <PortalLayout /> : <Navigate to="/portal" replace />;
};

// Sub-component to wire navigation on the Landing Page
const LandingPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <LandingPage onNavigateToPortal={() => navigate('/portal')} />;
};

export default function App() {
  return (
    <PortalProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Views */}
          <Route path="/" element={<LandingPageWrapper />} />
          <Route path="/portal" element={<PortalAuthPage />} />

          {/* Secure Portal Application Views */}
          <Route element={<ProtectedRoute />}>
            <Route path="/portal/dashboard" element={<DashboardPage />} />
            <Route path="/portal/roster" element={<LaborRosterPage />} />
            <Route path="/portal/ledger" element={<JobLedgerPage />} />
            <Route path="/portal/pipeline" element={<PipelinePage />} />
            
            {/* Fallback internal routes */}
            <Route path="/portal/*" element={<Navigate to="/portal/dashboard" replace />} />
          </Route>

          {/* Global Fallback to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PortalProvider>
  );
}
