import React, { useState } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';

type FormMode = 'login' | 'forgot' | 'authenticated';

export default function App() {
  const [formMode, setFormMode] = useState<FormMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      setFormMode('authenticated');
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

  if (formMode === 'authenticated') {
    return <Dashboard onLogout={() => setFormMode('login')} />;
  }

  return (
    <div className="min-h-screen bg-[#1A1B1E] text-[#e0e0e0] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Subtle texture overlay for 'concrete' feel */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-screen"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      ></div>

      <div className="max-w-md w-full z-10 flex flex-col items-center">
        {/* Brand Header - Concrete Style */}
        <div className="text-center mb-10 sm:mb-12 w-full">
          <div className="inline-block">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-widest uppercase text-[#e0e0e0] leading-none font-archivo">
              OPUS FORM
            </h1>
            <div className="h-[3px] w-12 bg-[#5C7285] mx-auto mt-3 rounded-[2px]"></div>
          </div>
        </div>

        {/* Form Container - Match Ledger / Pipeline Estimates Style */}
        <div className="w-full bg-[#242424] border border-[#333] rounded-xl overflow-hidden shadow-2xl">
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
                      className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[#333] bg-[#1e1e1e] text-[#e0e0e0] focus:border-[#5C7285] transition-colors placeholder:text-[#444] font-medium text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1 mb-2">
                    <label className="text-[10px] font-bold text-[#555] uppercase tracking-widest">Security Key</label>
                    <button 
                      type="button"
                      onClick={() => setFormMode('forgot')}
                      className="text-[10px] font-bold text-[#555] hover:text-[#b0b8c4] transition-colors uppercase tracking-widest"
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
                      className="w-full pl-12 pr-12 py-3.5 rounded-lg border border-[#333] bg-[#1e1e1e] text-[#e0e0e0] focus:border-[#5C7285] transition-colors placeholder:text-[#444] font-medium text-sm outline-none tracking-widest"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#555] hover:text-[#b0b8c4] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-[#5C7285] hover:bg-[#6c8295] disabled:bg-[#5C7285]/50 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-extrabold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
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

              {/* Try a Demo Role Divider */}
              <div className="relative flex py-6 items-center">
                <div className="flex-grow border-t border-[#333]"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-[#555] uppercase tracking-widest">Try a Demo Role</span>
                <div className="flex-grow border-t border-[#333]"></div>
              </div>

              {/* Demo Role Card */}
              <button
                type="button"
                onClick={() => {
                  setEmail('toby.green@opusform.co.uk');
                  setPassword('••••••••');
                  setIsSubmitting(true);
                  setTimeout(() => {
                    setIsSubmitting(false);
                    setFormMode('authenticated');
                  }, 800);
                }}
                className="w-full bg-[#1e1e1e]/60 hover:bg-[#1e1e1e] border border-[#333] hover:border-[#444] rounded-lg p-3.5 flex items-center justify-between transition-all duration-200 cursor-pointer text-left group focus:outline-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className="px-2.5 py-1 rounded-[6px] bg-[#f59e0b] text-[8px] font-black text-[#111] uppercase tracking-widest shrink-0">
                    OWNER
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold text-white uppercase tracking-wider group-hover:text-[#f59e0b] transition-colors">
                      Toby Green
                    </div>
                    <div className="text-[8px] font-bold text-[#555] uppercase tracking-widest mt-0.5">
                      OWNER / DIRECTOR
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#555] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          )}

          {formMode === 'forgot' && (
            <div className="p-6 sm:p-8">
              <button 
                onClick={() => setFormMode('login')}
                className="flex items-center text-[9px] font-bold text-[#555] hover:text-[#b0b8c4] mb-8 transition-colors uppercase tracking-widest gap-1.5"
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
                      className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[#333] bg-[#1e1e1e] text-[#e0e0e0] focus:border-[#5C7285] transition-colors placeholder:text-[#444] font-medium text-sm outline-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-[#5C7285] hover:bg-[#6c8295] disabled:bg-[#5C7285]/50 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-extrabold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
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
          OPUS FORM &bull; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
