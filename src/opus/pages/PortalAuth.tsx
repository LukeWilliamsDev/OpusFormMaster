// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { usePortal } from "../context/PortalContext";
import { supabase } from "@/integrations/supabase/client";
import { NoticeModal } from "@/components/ui/notice-modal";

export const PortalAuthPage: React.FC = () => {
  const { isAuthenticated, signIn, signOut, resetPassword, updatePassword, theme } = usePortal();
  const logoSrc =
    theme === "light" ? "/opus-form-primary-light.svg" : "/opus-form-primary-dark.svg";
  const navigate = useNavigate();

  const [formMode, setFormMode] = useState<"login" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const handleDismissNotification = () => {
    setNotification(null);
    if (formMode === "reset") {
      navigate("/portal/dashboard");
    }
  };

  // Check for recovery token/type in URL on mount, or listen for PASSWORD_RESET event
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes("type=recovery") || search.includes("type=recovery")) {
      setFormMode("reset");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RESET") {
        setFormMode("reset");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // A recovery link authenticates the browser the moment it loads, before the password is
  // actually changed. If the link leaks (forwarded email, shared inbox, link-preview crawler)
  // or the user abandons the flow, sign the recovery session back out rather than leaving it live.
  const resetCompletedRef = useRef(false);
  useEffect(() => {
    if (formMode !== "reset") return;
    resetCompletedRef.current = false;

    const signOutIfAbandoned = () => {
      if (!resetCompletedRef.current) {
        signOut();
      }
    };
    window.addEventListener("beforeunload", signOutIfAbandoned);
    return () => {
      window.removeEventListener("beforeunload", signOutIfAbandoned);
      signOutIfAbandoned();
    };
  }, [formMode, signOut]);

  // Redirect if already authenticated and not resetting password or showing success modal
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const isRecovery = hash.includes("type=recovery") || search.includes("type=recovery");

    if (isAuthenticated && !isRecovery && formMode !== "reset" && !notification) {
      navigate("/portal/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate, formMode, notification]);

  // After repeated failed attempts, tick a countdown that keeps the form locked as defense-in-depth
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
        clearInterval(interval);
      } else {
        setLockCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (lockedUntil && Date.now() < lockedUntil) {
      return;
    }
    if (!email || !password) {
      setFormError("Please enter both email and password.");
      return;
    }
    setIsSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setIsSubmitting(false);
    if (error) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= 5) {
        const lockMs = 30_000;
        setLockedUntil(Date.now() + lockMs);
        setLockCountdown(Math.ceil(lockMs / 1000));
        setFormError(
          `Too many failed attempts. Please wait ${Math.ceil(lockMs / 1000)}s before trying again.`,
        );
      } else {
        setFormError(error);
      }
      return;
    }
    setFailedAttempts(0);
    navigate("/portal/dashboard");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const emailInput = form.querySelector<HTMLInputElement>('input[type="email"]');
    const target = emailInput?.value?.trim();
    if (!target) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const { error } = await resetPassword(target);
      setIsSubmitting(false);
      if (error) {
        setFormError(error);
        return;
      }
      setFormError(null);
      setNotification({
        type: "success",
        title: "RECOVERY LINK SENT",
        message:
          "If that email address is registered for portal access, a secure password restoration link has been dispatched. Please check your inbox.",
      });
      setFormMode("login");
    } catch (err) {
      setIsSubmitting(false);
      console.error("Recovery request error:", err);
      setFormError(err.message || "An unexpected error occurred during password recovery.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!password || !confirmPassword) {
      setFormError("Please fill in both password fields.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setFormError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[a-z]/.test(password)) {
      setFormError("Password must contain at least one lowercase letter.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setFormError("Password must contain at least one number.");
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setFormError("Password must contain at least one special symbol.");
      return;
    }
    setIsSubmitting(true);
    const { error } = await updatePassword(password);
    setIsSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    resetCompletedRef.current = true;
    setNotification({
      type: "success",
      title: "PASSWORD UPDATED",
      message:
        "Your password has been reset successfully. You will now be redirected to the portal.",
    });
    setTimeout(() => {
      navigate("/portal/dashboard");
    }, 3000);
  };
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Static blueprint-style grid overlay, matching the landing page */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 80 0 L 0 0 L 0 80' fill='none' stroke='%23${
            theme === "light" ? "2B2F33" : "EDEBE6"
          }' stroke-width='0.5'/%3E%3Ccircle cx='0' cy='0' r='1.3' fill='%23B5651D'/%3E%3C/svg%3E")`,
          opacity: theme === "light" ? 0.18 : 0.1,
        }}
      />

      <div className="max-w-md w-full z-10 flex flex-col items-center">
        {/* Logo — transparent recreation matching brand exactly, animates in */}
        <div className="text-center mb-6 sm:mb-8 w-full flex flex-col items-center">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="focus:outline-none cursor-pointer group"
            title="Return to Landing Page"
          >
            <img
              src={logoSrc}
              alt="Opus Form"
              className="h-12 w-auto transition-opacity group-hover:opacity-80"
            />
          </button>
        </div>

        {/* Form container */}
        <div className="w-full">
          <div className="w-full bg-card border border-border rounded-xl overflow-hidden shadow-xl shadow-black/20">
            {formMode === "login" && (
              <div className="p-6 sm:p-8">
                {formError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="login-email"
                      className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2"
                    >
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dispatcher@opusform.co.uk"
                        className="w-full pl-12 pr-4 py-3 rounded-md border border-border bg-secondary text-foreground focus:border-primary transition-colors placeholder:text-muted-foreground font-medium text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <label
                        htmlFor="login-password"
                        className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormMode("forgot")}
                        className="text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••"
                        className="w-full pl-12 pr-12 py-3 rounded-md border border-border bg-secondary text-foreground focus:border-primary transition-colors placeholder:text-muted-foreground font-medium text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !!lockedUntil}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-md text-[14px] font-bold transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : lockedUntil ? (
                      <span>Try again in {lockCountdown}s</span>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>
                </form>
              </div>
            )}

            {formMode === "forgot" && (
              <div className="p-6 sm:p-8">
                <button
                  onClick={() => setFormMode("login")}
                  className="flex items-center text-[9px] font-bold text-muted-foreground hover:text-foreground mb-8 transition-colors uppercase tracking-widest gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Return to Login
                </button>

                <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-foreground mb-4">
                  <div className="w-[3px] h-4 bg-foreground rounded-[2px]" />
                  Password Recovery
                </div>
                <p className="text-[10px] text-muted-foreground mb-8 font-bold leading-relaxed uppercase tracking-widest">
                  Enter your authorized email to receive a secure restoration link.
                </p>

                <form onSubmit={handleForgot} className="space-y-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="forgot-email"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1 mb-2"
                    >
                      Email Identifier
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="forgot-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="name@opusform.co.uk"
                        className="w-full pl-12 pr-4 py-3 rounded-md border border-border bg-secondary text-foreground focus:border-primary transition-colors placeholder:text-muted-foreground font-medium text-sm outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-md text-[11px] font-extrabold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Request Link</span>
                    )}
                  </button>
                </form>
              </div>
            )}

            {formMode === "reset" && (
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-foreground mb-8">
                  <div className="w-[3px] h-4 bg-foreground rounded-[2px]" />
                  Set New Password
                </div>

                {formError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="reset-new-password"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1 mb-2"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="reset-new-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 rounded-md border border-border bg-secondary text-foreground focus:border-primary transition-colors placeholder:text-muted-foreground font-medium text-sm outline-none tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {password.length > 0 && (
                      <div className="p-3 bg-secondary border border-border rounded-md space-y-2">
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                          Strength Criteria:
                        </div>
                        {[
                          { label: "Minimum 8 characters", met: password.length >= 8 },
                          { label: "One uppercase letter", met: /[A-Z]/.test(password) },
                          { label: "One lowercase letter", met: /[a-z]/.test(password) },
                          { label: "One number (0-9)", met: /[0-9]/.test(password) },
                          { label: "One symbol (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(password) },
                        ].map((rule, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-[9px] uppercase tracking-wider font-bold"
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${rule.met ? "bg-primary animate-pulse" : "bg-border"}`}
                            />
                            <span
                              className={rule.met ? "text-foreground" : "text-muted-foreground"}
                            >
                              {rule.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="reset-confirm-password"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1 mb-2"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="reset-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 rounded-md border border-border bg-secondary text-foreground focus:border-primary transition-colors placeholder:text-muted-foreground font-medium text-sm outline-none tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-md text-[11px] font-extrabold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-[9px] text-muted-foreground font-bold uppercase tracking-[0.25em]">
            OPUS FORM · {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Custom Notification Toast/Modal */}
      <NoticeModal
        open={!!notification}
        onOpenChange={(open) => {
          if (!open) handleDismissNotification();
        }}
        tone={
          notification?.type === "success"
            ? "success"
            : notification?.type === "error"
              ? "error"
              : "info"
        }
        title={notification?.title ?? ""}
        message={notification?.message}
      />
    </div>
  );
};
