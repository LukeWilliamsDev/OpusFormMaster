import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';

export const PortalAuthPage: React.FC = () => {
  const { isAuthenticated, login } = usePortal();
  const navigate = useNavigate();

  const [formMode, setFormMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Staggered entrance animation state
  const [logoVisible, setLogoVisible] = useState(false);
  const [ruleVisible, setRuleVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/portal/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Re-trigger animation whenever the login/forgot view mounts
  useEffect(() => {
    setLogoVisible(false);
    setRuleVisible(false);
    setFormVisible(false);
    const t1 = setTimeout(() => setLogoVisible(true), 100);
    const t2 = setTimeout(() => setRuleVisible(true), 550);
    const t3 = setTimeout(() => setFormVisible(true), 850);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [formMode]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError('Please enter both email and password.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      login();
      navigate('/portal/dashboard');
    }, 1000);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setFormMode('login');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#1A1B1E] text-[#e0e0e0] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
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
            onClick={() => navigate('/')}
            className="focus:outline-none cursor-pointer"
            title="Return to Landing Page"
            style={{
              opacity: logoVisible ? 1 : 0,
              transform: logoVisible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 600ms ease-out, transform 600ms ease-out',
            }}
          >
            <span
              style={{
                display: 'block',
                fontFamily: "'Inter', 'Arial Black', sans-serif",
                fontWeight: 800,
                fontSize: '2.25rem',
                letterSpacing: '0.18em',
                color: '#F4F4F0',
                textTransform: 'uppercase',
                lineHeight: 1,
                paddingBottom: '0.5rem',
              }}
            >
              OPUS FORM
            </span>
          </button>

          {/* Rule — wipes in from centre, matches brand blue-grey */}
          <div style={{ width: '260px', maxWidth: '100%' }}>
            <div
              style={{
                height: '3px',
                backgroundColor: '#526E8C',
                transform: ruleVisible ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'center',
                transition: 'transform 550ms ease-out',
                borderRadius: '2px',
              }}
            />
          </div>
        </div>

        {/* Form container — fades up */}
        <div
          className="w-full"
          style={{
            opacity: formVisible ? 1 : 0,
            transform: formVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 500ms ease-out, transform 500ms ease-out',
          }}
        >
          <div className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl">
            {formMode === 'login' && (
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0] mb-8">
                  <div className="w-[3px] h-4 bg-[#b0b8c4] rounded-[2px]" />
                  Portal Access
                </div>

                {formError && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#555] uppercase tracking-widest block ml-1 mb-2">Email Identifier</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#555]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@opusform.co.uk"
                        className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[#2e2e2e] bg-[#1A1B1E] text-[#e0e0e0] focus:border-[#5C7285] transition-colors placeholder:text-[#444] font-medium text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1 mb-2">
                      <label className="text-[10px] font-bold text-[#555] uppercase tracking-widest">Security Key</label>
                      <button
                        type="button"
                        onClick={() => setFormMode('forgot')}
                        className="text-[10px] font-bold text-[#555] hover:text-[#b0b8c4] transition-colors uppercase tracking-widest cursor-pointer"
                      >
                        Recovery
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
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3.5 rounded-lg border border-[#2e2e2e] bg-[#1A1B1E] text-[#e0e0e0] focus:border-[#5C7285] transition-colors placeholder:text-[#444] font-medium text-sm outline-none tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#555] hover:text-[#b0b8c4] transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-[#5C7285] hover:bg-[#6c8295] disabled:bg-[#5C7285]/50 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-extrabold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Authorize Session</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>


              </div>
            )}

            {formMode === 'forgot' && (
              <div className="p-6 sm:p-8">
                <button
                  onClick={() => setFormMode('login')}
                  className="flex items-center text-[9px] font-bold text-[#555] hover:text-[#b0b8c4] mb-8 transition-colors uppercase tracking-widest gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Return to Login
                </button>

                <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0] mb-4">
                  <div className="w-[3px] h-4 bg-[#b0b8c4] rounded-[2px]" />
                  Key Recovery
                </div>
                <p className="text-[10px] text-[#555] mb-8 font-bold leading-relaxed uppercase tracking-widest">Enter your authorized email to receive a secure restoration link.</p>

                <form onSubmit={handleForgot} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#555] uppercase tracking-widest block ml-1 mb-2">Email Identifier</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#555]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="name@opusform.co.uk"
                        className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[#2e2e2e] bg-[#1A1B1E] text-[#e0e0e0] focus:border-[#5C7285] transition-colors placeholder:text-[#444] font-medium text-sm outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-[#5C7285] hover:bg-[#6c8295] disabled:bg-[#5C7285]/50 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-extrabold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
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
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-[9px] text-[#555] font-bold uppercase tracking-[0.25em]">
            OPUS FORM · {new Date().getFullYear()}
          </div>
        </div>

      </div>
    </div>
  );
};
