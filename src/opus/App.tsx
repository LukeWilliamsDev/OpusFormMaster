import React, { lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import {
  PortalProvider,
  usePortal,
  AppRole,
  ASSIGNED_SHIFT_ROLES,
  ALL_ROLES,
  MANAGEMENT_ROLES,
  FIELD_ROLES,
  INTERNAL_ROLES,
} from "./context/PortalContext";
import { PortalLayout } from "./layouts/PortalLayout";
const LandingPage = lazy(() =>
  import("./components/LandingPage").then((module) => ({ default: module.LandingPage })),
);
const PortalAuthPage = lazy(() =>
  import("./pages/PortalAuth").then((module) => ({ default: module.PortalAuthPage })),
);
const DashboardPage = lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.DashboardPage })),
);
const LaborRosterPage = lazy(() =>
  import("./pages/LaborRoster").then((module) => ({ default: module.LaborRosterPage })),
);
const CalendarPage = lazy(() =>
  import("./pages/CalendarPage").then((module) => ({ default: module.CalendarPage })),
);
const MyShiftsPage = lazy(() =>
  import("./pages/MyShiftsPage").then((module) => ({ default: module.MyShiftsPage })),
);
const ThirdPartyPortalPage = lazy(() =>
  import("./pages/ThirdPartyPortalPage").then((module) => ({
    default: module.ThirdPartyPortalPage,
  })),
);
const ThirdPartyApprovalsPage = lazy(() =>
  import("./pages/ThirdPartyApprovalsPage").then((module) => ({
    default: module.ThirdPartyApprovalsPage,
  })),
);
const ThirdPartyDashboardPage = lazy(() =>
  import("./pages/ThirdPartyDashboardPage").then((module) => ({
    default: module.ThirdPartyDashboardPage,
  })),
);
const ThirdPartyJobsPage = lazy(() =>
  import("./pages/ThirdPartyJobsPage").then((module) => ({ default: module.ThirdPartyJobsPage })),
);
const ThirdPartySitePage = lazy(() =>
  import("./pages/ThirdPartySitePage").then((module) => ({ default: module.ThirdPartySitePage })),
);
const JobLedgerPage = lazy(() =>
  import("./pages/JobLedger").then((module) => ({ default: module.JobLedgerPage })),
);
const PipelinePage = lazy(() =>
  import("./pages/Pipeline").then((module) => ({ default: module.PipelinePage })),
);
const AuditLogPage = lazy(() =>
  import("./pages/AuditLog").then((module) => ({ default: module.AuditLogPage })),
);
const AdminPolicies = lazy(() =>
  import("./pages/AdminPolicies").then((module) => ({ default: module.AdminPolicies })),
);
const AdminUsers = lazy(() =>
  import("./pages/AdminUsers").then((module) => ({ default: module.AdminUsers })),
);
const SubmitCredentialsPage = lazy(() =>
  import("./pages/SubmitCredentials").then((module) => ({ default: module.SubmitCredentialsPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/Settings").then((module) => ({ default: module.SettingsPage })),
);
const JobUploadPortalPage = lazy(() =>
  import("./pages/JobUploadPortal").then((module) => ({ default: module.JobUploadPortalPage })),
);
const PrivacyNoticePage = lazy(() =>
  import("./pages/PrivacyNotice").then((module) => ({ default: module.PrivacyNoticePage })),
);
const TermsOfServicePage = lazy(() =>
  import("./pages/TermsOfService").then((module) => ({ default: module.TermsOfServicePage })),
);
const AcceptableUsePolicyPage = lazy(() =>
  import("./pages/AcceptableUsePolicy").then((module) => ({
    default: module.AcceptableUsePolicyPage,
  })),
);
const CookieStatementPage = lazy(() =>
  import("./pages/CookieStatement").then((module) => ({ default: module.CookieStatementPage })),
);
const ModernSlaveryStatementPage = lazy(() =>
  import("./pages/ModernSlaveryStatement").then((module) => ({
    default: module.ModernSlaveryStatementPage,
  })),
);
const LegalHubPage = lazy(() =>
  import("./pages/LegalHub").then((module) => ({ default: module.LegalHubPage })),
);
const CertificateCheckerPage = lazy(() =>
  import("./pages/CertificateCheckerPage").then((module) => ({
    default: module.CertificateCheckerPage,
  })),
);
const RightToWorkPolicyPage = lazy(() =>
  import("./pages/RightToWorkPolicy").then((module) => ({ default: module.RightToWorkPolicyPage })),
);

// Immediate recovery URL redirection for HashRouter before React Router initialises and strips the hash
(() => {
  const hash = window.location.hash;
  const search = window.location.search;
  const isRecovery =
    hash.includes("type=recovery") ||
    search.includes("type=recovery") ||
    hash.includes("type=invite") ||
    search.includes("type=invite");
  if (isRecovery && !hash.startsWith("#/portal")) {
    const params = hash.startsWith("#") ? hash.substring(1) : hash;
    window.location.replace(
      window.location.origin + window.location.pathname + "#/portal?" + params,
    );
  }
})();

const RouteFallback: React.FC = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-background p-6"
    role="status"
    aria-live="polite"
  >
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
      aria-label="Loading page"
    />
  </div>
);

// Session gate — any /portal/* view requires a valid Supabase session.
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, authLoading, profile } = usePortal();
  if (authLoading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!isAuthenticated) return <Navigate to="/portal" replace />;
  // A must-change-password account has no business in the app until it changes it —
  // send it back to the auth page, which forces the reset form for this state.
  if (profile?.must_change_password) return <Navigate to="/portal" replace />;
  return <PortalLayout />;
};

// Role gate — restricts a subtree to a role allowlist. Blocked users go to the
// first surface their role can see.
const RoleGuard: React.FC<{
  allow: Array<AppRole>;
  children: React.ReactNode;
}> = ({ allow, children }) => {
  const { role, authLoading } = usePortal();
  if (authLoading || role === null) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!allow.includes(role)) {
    const fallback =
      role === "third_party"
        ? "/portal/third-party"
        : FIELD_ROLES.includes(role)
          ? "/portal/roster?view=calendar"
          : "/portal/dashboard";
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

// Audit Log Gate - the full tenant audit trail is intentionally restricted to
// one designated compliance account, not every admin. Job-level history (a
// narrower view) is available to all ops roles via JobDetails' History tab,
// backed by a separate job-scoped audit_logs RLS policy.
const AuditLogGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, user, authLoading } = usePortal();
  if (authLoading || role === null) {
    return <div className="min-h-screen bg-background" />;
  }
  if (role !== "admin" || user?.email !== "admin@opusform.co.uk") {
    const fallback =
      role === "third_party"
        ? "/portal/third-party"
        : FIELD_ROLES.includes(role)
          ? "/portal/roster?view=calendar"
          : "/portal/dashboard";
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

// Sub-component to wire navigation on the Landing Page
const LandingPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <LandingPage onNavigateToPortal={() => navigate("/portal")} />;
};

export default function App() {
  return (
    <PortalProvider>
      <HashRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public Views */}
            <Route path="/" element={<LandingPageWrapper />} />
            <Route path="/portal" element={<PortalAuthPage />} />
            <Route path="/submit-credentials" element={<SubmitCredentialsPage />} />
            <Route path="/job-upload/:token" element={<JobUploadPortalPage />} />
            <Route path="/privacy" element={<PrivacyNoticePage />} />
            <Route path="/cookies" element={<CookieStatementPage />} />
            <Route path="/modern-slavery" element={<ModernSlaveryStatementPage />} />
            <Route path="/right-to-work" element={<RightToWorkPolicyPage />} />

            {/* Secure Portal Application Views */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="/portal/dashboard"
                element={
                  <RoleGuard allow={MANAGEMENT_ROLES}>
                    <DashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/ledger"
                element={
                  <RoleGuard allow={MANAGEMENT_ROLES}>
                    <JobLedgerPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/pipeline"
                element={
                  <RoleGuard allow={MANAGEMENT_ROLES}>
                    <PipelinePage />
                  </RoleGuard>
                }
              />
              {/* Roster is available to every signed-in role; operatives see their shift view. */}
              <Route
                path="/portal/roster"
                element={
                  <RoleGuard allow={ALL_ROLES}>
                    <LaborRosterPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/calendar"
                element={
                  <RoleGuard allow={ALL_ROLES}>
                    <CalendarPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/certificate-checker"
                element={
                  <RoleGuard allow={INTERNAL_ROLES}>
                    <CertificateCheckerPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/my-shifts"
                element={
                  <RoleGuard allow={ASSIGNED_SHIFT_ROLES}>
                    <MyShiftsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/third-party"
                element={
                  <RoleGuard allow={["third_party"]}>
                    <ThirdPartyDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/third-party/staff"
                element={
                  <RoleGuard allow={["third_party"]}>
                    <ThirdPartyPortalPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/third-party/staff/new"
                element={
                  <RoleGuard allow={["third_party"]}>
                    <ThirdPartyPortalPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/third-party/staff/:staffId"
                element={
                  <RoleGuard allow={["third_party"]}>
                    <ThirdPartyPortalPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/third-party/sites"
                element={
                  <RoleGuard allow={["third_party"]}>
                    <ThirdPartyJobsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/third-party/sites/:jobId"
                element={
                  <RoleGuard allow={["third_party"]}>
                    <ThirdPartySitePage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/third-party/jobs"
                element={
                  <RoleGuard allow={["third_party"]}>
                    <ThirdPartyJobsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/third-party/jobs/:jobId"
                element={
                  <RoleGuard allow={["third_party"]}>
                    <ThirdPartySitePage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/third-party-approvals"
                element={
                  <RoleGuard allow={MANAGEMENT_ROLES}>
                    <ThirdPartyApprovalsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/audit"
                element={
                  <AuditLogGuard>
                    <AuditLogPage />
                  </AuditLogGuard>
                }
              />
              <Route
                path="/portal/policies"
                element={
                  <AuditLogGuard>
                    <AdminPolicies />
                  </AuditLogGuard>
                }
              />
              <Route
                path="/portal/users"
                element={
                  <AuditLogGuard>
                    <AdminUsers />
                  </AuditLogGuard>
                }
              />
              <Route
                path="/portal/settings"
                element={
                  <RoleGuard allow={ALL_ROLES}>
                    <SettingsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/legal"
                element={
                  <RoleGuard allow={ALL_ROLES}>
                    <LegalHubPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/terms"
                element={
                  <RoleGuard allow={ALL_ROLES}>
                    <TermsOfServicePage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/acceptable-use"
                element={
                  <RoleGuard allow={ALL_ROLES}>
                    <AcceptableUsePolicyPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/privacy"
                element={
                  <RoleGuard allow={ALL_ROLES}>
                    <PrivacyNoticePage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/cookies"
                element={
                  <RoleGuard allow={ALL_ROLES}>
                    <CookieStatementPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/modern-slavery"
                element={
                  <RoleGuard allow={ALL_ROLES}>
                    <ModernSlaveryStatementPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/portal/right-to-work"
                element={
                  <RoleGuard allow={ALL_ROLES}>
                    <RightToWorkPolicyPage />
                  </RoleGuard>
                }
              />

              {/* Fallback internal routes — send operatives to their calendar. */}
              <Route path="/portal/*" element={<RoleAwareFallback />} />
            </Route>

            {/* Global Fallback to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </PortalProvider>
  );
}

const RoleAwareFallback: React.FC = () => {
  const { role } = usePortal();
  const target =
    role === "third_party"
      ? "/portal/third-party"
      : role && ASSIGNED_SHIFT_ROLES.includes(role)
        ? "/portal/my-shifts"
        : role === "logistics_assistant"
          ? "/portal/roster?view=calendar"
          : "/portal/dashboard";
  return <Navigate to={target} replace />;
};
