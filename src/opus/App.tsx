// @ts-nocheck
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { PortalProvider, usePortal } from './context/PortalContext';
import { PortalLayout } from './layouts/PortalLayout';
import { LandingPage } from './components/LandingPage';
import { PortalAuthPage } from './pages/PortalAuth';
import { DashboardPage } from './pages/Dashboard';
import { LaborRosterPage } from './pages/LaborRoster';
import { JobLedgerPage } from './pages/JobLedger';
import { PipelinePage } from './pages/Pipeline';
import { AuditLogPage } from './pages/AuditLog';
import { SubmitCredentialsPage } from './pages/SubmitCredentials';
import { SettingsPage } from './pages/Settings';
import { JobUploadPortalPage } from './pages/JobUploadPortal';
import { PrivacyNoticePage } from './pages/PrivacyNotice';
import { TermsOfServicePage } from './pages/TermsOfService';
import { AcceptableUsePolicyPage } from './pages/AcceptableUsePolicy';
import { CookieStatementPage } from './pages/CookieStatement';

// Global listener to redirect password reset recovery URLs to /portal when using HashRouter
const AuthRedirectListener: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const isRecovery = hash.includes('type=recovery') || search.includes('type=recovery');

    if (isRecovery && location.pathname !== '/portal') {
      navigate('/portal' + search + hash, { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};

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
  const { role, user, authLoading } = usePortal();
  if (authLoading || role === null) {
    return <div className="min-h-screen bg-[#1A1B1E]" />;
  }
  // admin@opusform.co.uk can ONLY see the audit trail
  if (user?.email === 'admin@opusform.co.uk') {
    return <Navigate to="/portal/audit" replace />;
  }
  if (!allow.includes(role)) {
    const fallback = role === 'operative' ? '/portal/roster?view=calendar' : '/portal/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

// Audit Log Gate - restricts the audit trail to only the specific admin email
const AuditLogGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, user, authLoading } = usePortal();
  if (authLoading || role === null) {
    return <div className="min-h-screen bg-[#1A1B1E]" />;
  }
  if (role !== 'admin' || user?.email !== 'admin@opusform.co.uk') {
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
      <HashRouter>
        <AuthRedirectListener />
        <Routes>
          {/* Public Views */}
          <Route path="/" element={<LandingPageWrapper />} />
          <Route path="/portal" element={<PortalAuthPage />} />
          <Route path="/submit-credentials" element={<SubmitCredentialsPage />} />
          <Route path="/job-upload/:token" element={<JobUploadPortalPage />} />
          <Route path="/privacy" element={<PrivacyNoticePage />} />
          <Route path="/cookies" element={<CookieStatementPage />} />

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
              <AuditLogGuard><AuditLogPage /></AuditLogGuard>
            } />
            <Route path="/portal/settings" element={
              <RoleGuard allow={['admin', 'dispatcher', 'operative']}><SettingsPage /></RoleGuard>
            } />
            <Route path="/portal/terms" element={
              <RoleGuard allow={['admin', 'dispatcher', 'operative']}><TermsOfServicePage /></RoleGuard>
            } />
            <Route path="/portal/acceptable-use" element={
              <RoleGuard allow={['admin', 'dispatcher', 'operative']}><AcceptableUsePolicyPage /></RoleGuard>
            } />
            <Route path="/portal/privacy" element={
              <RoleGuard allow={['admin', 'dispatcher', 'operative']}><PrivacyNoticePage /></RoleGuard>
            } />
            <Route path="/portal/cookies" element={
              <RoleGuard allow={['admin', 'dispatcher', 'operative']}><CookieStatementPage /></RoleGuard>
            } />
            
            {/* Fallback internal routes — send operatives to their calendar. */}
            <Route path="/portal/*" element={<RoleAwareFallback />} />
          </Route>

          {/* Global Fallback to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </PortalProvider>
  );
}

const RoleAwareFallback: React.FC = () => {
  const { role, user } = usePortal();
  if (user?.email === 'admin@opusform.co.uk') {
    return <Navigate to="/portal/audit" replace />;
  }
  const target = role === 'operative' ? '/portal/roster?view=calendar' : '/portal/dashboard';
  return <Navigate to={target} replace />;
};
