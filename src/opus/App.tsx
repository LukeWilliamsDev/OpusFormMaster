import React, { lazy, Suspense } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  PortalProvider,
  usePortal,
  AppRole,
  ASSIGNED_SHIFT_ROLES,
  MANAGEMENT_ROLES,
  FIELD_ROLES,
  PORTAL_ACCESS_ROLES,
} from "./context/PortalContext";
import { PortalLayout } from "./layouts/PortalLayout";
const lazyRoute = <T extends React.ComponentType<any>>(
  load: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> =>
  lazy(async () => {
    try {
      const module = await load();
      if (typeof window !== "undefined") sessionStorage.removeItem("portal-route-chunk-retry");
      return module;
    } catch (error) {
      if (typeof window !== "undefined" && !sessionStorage.getItem("portal-route-chunk-retry")) {
        sessionStorage.setItem("portal-route-chunk-retry", "1");
        const retryUrl = new URL(window.location.href);
        retryUrl.searchParams.set("route-retry", String(Date.now()));
        window.location.replace(retryUrl.toString());
        return new Promise<never>(() => undefined);
      }
      throw error;
    }
  }) as React.LazyExoticComponent<T>;

const LegacyThirdPartyJobsRedirect: React.FC = () => {
  const { jobId } = useParams();
  return (
    <Navigate
      to={jobId ? `/portal/third-party/sites/${jobId}` : "/portal/third-party/sites"}
      replace
    />
  );
};

const LandingPage = lazyRoute(() =>
  import("./components/LandingPage").then((module) => ({ default: module.LandingPage })),
);
const PortalAuthPage = lazyRoute(() =>
  import("./pages/PortalAuth").then((module) => ({ default: module.PortalAuthPage })),
);
const DashboardPage = lazyRoute(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.DashboardPage })),
);
const LaborRosterPage = lazyRoute(() =>
  import("./pages/LaborRoster").then((module) => ({ default: module.LaborRosterPage })),
);
const CalendarPage = lazyRoute(() =>
  import("./pages/CalendarPage").then((module) => ({ default: module.CalendarPage })),
);
const MyShiftsPage = lazyRoute(() =>
  import("./pages/MyShiftsPage").then((module) => ({ default: module.MyShiftsPage })),
);
const ThirdPartyPortalPage = lazyRoute(() =>
  import("./pages/ThirdPartyPortalPage").then((module) => ({
    default: module.ThirdPartyPortalPage,
  })),
);
const ThirdPartyApprovalsPage = lazyRoute(() =>
  import("./pages/ThirdPartyApprovalsPage").then((module) => ({
    default: module.ThirdPartyApprovalsPage,
  })),
);
const ThirdPartyDashboardPage = lazyRoute(() =>
  import("./pages/ThirdPartyDashboardPage").then((module) => ({
    default: module.ThirdPartyDashboardPage,
  })),
);
const ThirdPartyJobsPage = lazyRoute(() =>
  import("./pages/ThirdPartyJobsPage").then((module) => ({ default: module.ThirdPartyJobsPage })),
);
const ThirdPartySitePage = lazyRoute(() =>
  import("./pages/ThirdPartySitePage").then((module) => ({ default: module.ThirdPartySitePage })),
);
const JobLedgerPage = lazyRoute(() =>
  import("./pages/JobLedger").then((module) => ({ default: module.JobLedgerPage })),
);
const PipelinePage = lazyRoute(() =>
  import("./pages/Pipeline").then((module) => ({ default: module.PipelinePage })),
);
const AuditLogPage = lazyRoute(() =>
  import("./pages/AuditLog").then((module) => ({ default: module.AuditLogPage })),
);
const AdminPolicies = lazyRoute(() =>
  import("./pages/AdminPolicies").then((module) => ({ default: module.AdminPolicies })),
);
const AdminUsers = lazyRoute(() =>
  import("./pages/AdminUsers").then((module) => ({ default: module.AdminUsers })),
);
const SubmitCredentialsPage = lazyRoute(() =>
  import("./pages/SubmitCredentials").then((module) => ({ default: module.SubmitCredentialsPage })),
);
const SettingsPage = lazyRoute(() =>
  import("./pages/Settings").then((module) => ({ default: module.SettingsPage })),
);
const JobUploadPortalPage = lazyRoute(() =>
  import("./pages/JobUploadPortal").then((module) => ({ default: module.JobUploadPortalPage })),
);
const PrivacyNoticePage = lazyRoute(() =>
  import("./pages/PrivacyNotice").then((module) => ({ default: module.PrivacyNoticePage })),
);
const TermsOfServicePage = lazyRoute(() =>
  import("./pages/TermsOfService").then((module) => ({ default: module.TermsOfServicePage })),
);
const AcceptableUsePolicyPage = lazyRoute(() =>
  import("./pages/AcceptableUsePolicy").then((module) => ({
    default: module.AcceptableUsePolicyPage,
  })),
);
const CookieStatementPage = lazyRoute(() =>
  import("./pages/CookieStatement").then((module) => ({ default: module.CookieStatementPage })),
);
const ModernSlaveryStatementPage = lazyRoute(() =>
  import("./pages/ModernSlaveryStatement").then((module) => ({
    default: module.ModernSlaveryStatementPage,
  })),
);
const LegalHubPage = lazyRoute(() =>
  import("./pages/LegalHub").then((module) => ({ default: module.LegalHubPage })),
);
const CertificateCheckerPage = lazyRoute(() =>
  import("./pages/CertificateCheckerPage").then((module) => ({
    default: module.CertificateCheckerPage,
  })),
);
const RightToWorkPolicyPage = lazyRoute(() =>
  import("./pages/RightToWorkPolicy").then((module) => ({ default: module.RightToWorkPolicyPage })),
);
const PortalHelpPage = lazyRoute(() =>
  import("./pages/PortalHelp").then((module) => ({ default: module.PortalHelpPage })),
);
const PortalContactPage = lazyRoute(() =>
  import("./pages/PortalContact").then((module) => ({ default: module.PortalContactPage })),
);
const CompanyPolicyPage = lazyRoute(() =>
  import("./pages/CompanyPolicyPage").then((module) => ({ default: module.CompanyPolicyPage })),
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

const NoPortalAccess: React.FC = () => {
  const { signOut } = usePortal();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-black">Portal access is not enabled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account has not been assigned access to any Opus Form portal pages.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

class RouteErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Portal route failed to load", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6" role="alert">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-black">This page could not load</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page may have changed while it was opening. Try loading it again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

// Session gate — any /portal/* view requires a valid Supabase session.
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, authLoading, profile, role } = usePortal();
  const location = useLocation();
  if (authLoading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!isAuthenticated) return <Navigate to="/portal" replace />;
  // A must-change-password account has no business in the app until it changes it —
  // send it back to the auth page, which forces the reset form for this state.
  if (profile?.must_change_password) return <Navigate to="/portal" replace />;
  // Users without portal access should see the standalone explanation rather
  // than a shell full of links that their role cannot open.
  if (location.pathname === "/portal/no-access" || (role && FIELD_ROLES.includes(role))) {
    return <Outlet />;
  }
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
          ? "/portal/no-access"
          : "/portal/dashboard";
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

// Audit Log Gate - the full tenant audit trail is available to management
// accounts. The database policy remains the source of truth for tenant scope;
// the route gate keeps the navigation and fallback behavior aligned with it.
const AuditLogGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, authLoading } = usePortal();
  if (authLoading || role === null) {
    return <div className="min-h-screen bg-background" />;
  }
  if (role !== "admin" && role !== "director") {
    const fallback =
      role === "third_party"
        ? "/portal/third-party"
        : FIELD_ROLES.includes(role)
          ? "/portal/no-access"
          : "/portal/dashboard";
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

const UserAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, authLoading } = usePortal();
  if (authLoading || role === null) {
    return <div className="min-h-screen bg-background" />;
  }
  if (role !== "admin" && role !== "director") {
    const fallback =
      role === "third_party"
        ? "/portal/third-party"
        : FIELD_ROLES.includes(role)
          ? "/portal/no-access"
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
        <RouteErrorBoundary>
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
                    <RoleGuard allow={MANAGEMENT_ROLES}>
                      <LaborRosterPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/calendar"
                  element={
                    <RoleGuard allow={MANAGEMENT_ROLES}>
                      <CalendarPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/certificate-checker"
                  element={
                    <RoleGuard allow={MANAGEMENT_ROLES}>
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
                      <LegacyThirdPartyJobsRedirect />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/third-party/jobs/:jobId"
                  element={
                    <RoleGuard allow={["third_party"]}>
                      <LegacyThirdPartyJobsRedirect />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/no-access"
                  element={
                    <RoleGuard allow={FIELD_ROLES}>
                      <NoPortalAccess />
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
                    <UserAdminGuard>
                      <AdminUsers />
                    </UserAdminGuard>
                  }
                />
                <Route
                  path="/portal/settings"
                  element={
                    <RoleGuard allow={PORTAL_ACCESS_ROLES}>
                      <SettingsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/legal"
                  element={
                    <RoleGuard allow={PORTAL_ACCESS_ROLES}>
                      <LegalHubPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/help"
                  element={
                    <RoleGuard allow={PORTAL_ACCESS_ROLES}>
                      <PortalHelpPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/contact"
                  element={
                    <RoleGuard allow={PORTAL_ACCESS_ROLES}>
                      <PortalContactPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/policies/:policySlug"
                  element={
                    <RoleGuard allow={PORTAL_ACCESS_ROLES}>
                      <CompanyPolicyPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/terms"
                  element={
                    <RoleGuard allow={PORTAL_ACCESS_ROLES}>
                      <TermsOfServicePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/acceptable-use"
                  element={
                    <RoleGuard allow={PORTAL_ACCESS_ROLES}>
                      <AcceptableUsePolicyPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/privacy"
                  element={
                    <RoleGuard allow={PORTAL_ACCESS_ROLES}>
                      <PrivacyNoticePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/cookies"
                  element={
                    <RoleGuard allow={PORTAL_ACCESS_ROLES}>
                      <CookieStatementPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/modern-slavery"
                  element={
                    <RoleGuard allow={PORTAL_ACCESS_ROLES}>
                      <ModernSlaveryStatementPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/portal/right-to-work"
                  element={
                    <RoleGuard allow={PORTAL_ACCESS_ROLES}>
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
        </RouteErrorBoundary>
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
        ? "/portal/no-access"
        : role === "logistics_assistant"
          ? "/portal/roster?view=calendar"
          : "/portal/dashboard";
  return <Navigate to={target} replace />;
};
