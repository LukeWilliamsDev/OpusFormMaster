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
import { AuditLogPage } from './pages/AuditLog';

// Session gate — any /portal/* view requires a valid Supabase session.
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, authLoading } = usePortal();
  if (authLoading) {
    return <div className="min-h-screen bg-[#1A1B1E]" />;
  }
  return isAuthenticated ? <PortalLayout /> : <Navigate to="/portal" replace />;
};

// Role gate — restricts a subtree to a role allowlist. Blocked users go to the
// first surface their role can see.
const RoleGuard: React.FC<{ allow: Array<'admin' | 'dispatcher' | 'operative'>; children: React.ReactNode }> = ({ allow, children }) => {
  const { role, authLoading } = usePortal();
  if (authLoading || role === null) {
    return <div className="min-h-screen bg-[#1A1B1E]" />;
  }
  if (!allow.includes(role)) {
    const fallback = role === 'operative' ? '/portal/roster?view=calendar' : '/portal/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
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
            <Route path="/portal/dashboard" element={
              <RoleGuard allow={['admin', 'dispatcher']}><DashboardPage /></RoleGuard>
            } />
            <Route path="/portal/ledger" element={
              <RoleGuard allow={['admin', 'dispatcher']}><JobLedgerPage /></RoleGuard>
            } />
            <Route path="/portal/pipeline" element={
              <RoleGuard allow={['admin', 'dispatcher']}><PipelinePage /></RoleGuard>
            } />
            {/* Roster is available to every signed-in role; operatives see their shift view. */}
            <Route path="/portal/roster" element={
              <RoleGuard allow={['admin', 'dispatcher', 'operative']}><LaborRosterPage /></RoleGuard>
            } />
            <Route path="/portal/audit" element={
              <RoleGuard allow={['admin']}><AuditLogPage /></RoleGuard>
            } />
            
            {/* Fallback internal routes — send operatives to their calendar. */}
            <Route path="/portal/*" element={<RoleAwareFallback />} />
          </Route>

          {/* Global Fallback to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PortalProvider>
  );
}

const RoleAwareFallback: React.FC = () => {
  const { role } = usePortal();
  const target = role === 'operative' ? '/portal/roster?view=calendar' : '/portal/dashboard';
  return <Navigate to={target} replace />;
};
