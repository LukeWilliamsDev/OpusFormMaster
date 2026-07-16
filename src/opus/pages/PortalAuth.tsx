// @ts-nocheck
import React, { useState, useEffect } from "react";
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
  const { isAuthenticated, signIn, resetPassword, updatePassword } = usePortal();
  const navigate = useNavigate();

  const [formMode, setFormMode] = useState<"login" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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

  // Redirect if already authenticated and not resetting password or showing success modal
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const isRecovery = hash.includes("type=recovery") || search.includes("type=recovery");

    if (isAuthenticated && !isRecovery && formMode !== "reset" && !notification) {
      navigate("/portal/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate, formMode, notification]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError("Please enter both email and password.");
      return;
    }
    setIsSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setIsSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }
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
      // Check if user is registered in the profiles table via RPC helper (to bypass RLS for anonymous guests)
      const { data: isRegistered, error: queryError } = await supabase.rpc(
        "check_email_registered",
        { _email: target },
      );

      if (queryError) throw queryError;

      if (!isRegistered) {
        setIsSubmitting(false);
        setNotification({
          type: "error",
          title: "EMAIL NOT REGISTERED",
          message:
            "The email address entered is not registered for portal access. Please contact your administrator.",
        });
        return;
      }

      // Proceed to reset password since email is verified
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
          "A secure password restoration link has been dispatched to your email address. Please check your inbox.",
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
    <div className="min-h-screen bg-[#111114] text-[#E4E4E7] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Subtle concrete-texture grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 0 L 60 0 L 60 60' fill='none' stroke='%23ffffff' stroke-width='0.4'/%3E%3C/svg%3E")`,
          opacity: 0.025,
        }}
      />

      <div className="max-w-md w-full z-10 flex flex-col items-center">
        {/* Logo — transparent recreation matching brand exactly, animates in */}
        <div className="text-center mb-10 sm:mb-12 w-full flex flex-col items-center">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="focus:outline-none cursor-pointer"
            title="Return to Landing Page"
          >
            <img
              src="/opus-form-primary-dark.svg"
              alt="Opus Form"
              style={{ height: "40px", width: "auto" }}
            />
          </button>
        </div>

        {/* Form container */}
        <div className="w-full">
          <div className="w-full bg-[#16161a] border border-[#2a2a30] rounded-lg overflow-hidden shadow-lg">
            {formMode === "login" && (
              <div className="p-6 sm:p-8">
                {formError && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[12px] font-semibold text-[#888] uppercase tracking-wider block mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#555]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dispatcher@opusform.co.uk"
                        className="w-full pl-12 pr-4 py-3 rounded-md border border-[#2a2a30] bg-[#1a1a1e] text-[#e4e4e7] focus:border-primary transition-colors placeholder:text-[#555] font-medium text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[12px] font-semibold text-[#888] uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormMode("forgot")}
                        className="text-[12px] font-semibold text-[#666] hover:text-[#888] transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#555]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••"
                        className="w-full pl-12 pr-12 py-3 rounded-md border border-[#2a2a30] bg-[#1a1a1e] text-[#e4e4e7] focus:border-primary transition-colors placeholder:text-[#555] font-medium text-sm outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-md text-[14px] font-bold transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                  className="flex items-center text-[9px] font-bold text-[#555] hover:text-[#b0b8c4] mb-8 transition-colors uppercase tracking-widest gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Return to Login
                </button>

                <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0] mb-4">
                  <div className="w-[3px] h-4 bg-[#b0b8c4] rounded-[2px]" />
                  Password Recovery
                </div>
                <p className="text-[10px] text-[#555] mb-8 font-bold leading-relaxed uppercase tracking-widest">
                  Enter your authorized email to receive a secure restoration link.
                </p>

                <form onSubmit={handleForgot} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#555] uppercase tracking-widest block ml-1 mb-2">
                      Email Identifier
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#555]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="name@opusform.co.uk"
                        className="w-full pl-12 pr-4 py-3 rounded-md border border-[#2e2e2e] bg-[#1A1B1E] text-[#e0e0e0] focus:border-primary transition-colors placeholder:text-[#444] font-medium text-sm outline-none"
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
                <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0] mb-8">
                  <div className="w-[3px] h-4 bg-[#b0b8c4] rounded-[2px]" />
                  Set New Password
                </div>

                {formError && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#555] uppercase tracking-widest block ml-1 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#555]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 rounded-md border border-[#2e2e2e] bg-[#1A1B1E] text-[#e0e0e0] focus:border-primary transition-colors placeholder:text-[#444] font-medium text-sm outline-none tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#555] hover:text-[#b0b8c4] transition-colors cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {password.length > 0 && (
                      <div className="p-3 bg-[#1A1B1E] border border-[#2e2e2e] rounded-md space-y-2">
                        <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest mb-1">
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
                              className={`w-1.5 h-1.5 rounded-full ${rule.met ? "bg-primary animate-pulse" : "bg-[#333]"}`}
                            />
                            <span className={rule.met ? "text-[#859bb0]" : "text-[#444]"}>
                              {rule.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#555] uppercase tracking-widest block ml-1 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#555]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 rounded-md border border-[#2e2e2e] bg-[#1A1B1E] text-[#e0e0e0] focus:border-primary transition-colors placeholder:text-[#444] font-medium text-sm outline-none tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#555] hover:text-[#b0b8c4] transition-colors cursor-pointer"
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
          <div className="text-center mt-12 text-[9px] text-[#555] font-bold uppercase tracking-[0.25em]">
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
