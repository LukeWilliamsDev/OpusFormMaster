# Design Audit: PortalAuth.tsx

**Component:** `src/opus/pages/PortalAuth.tsx`  
**Type:** Page component — Portal authentication (login, password recovery, reset)  
**Audit Date:** 2026-07-29  
**Status:** ORIGINAL/EDITOR/CRITIC analysis complete — ready for application

---

## ORIGINAL — Current Design Patterns

### 1. **Page Layout — Centered Card with Blueprint Grid**
```tsx
<div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
  {/* Static blueprint-style grid overlay */}
  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,...")`, opacity: theme === "light" ? 0.18 : 0.1 }} />
  
  <div className="max-w-md w-full z-10 flex flex-col items-center">
    {/* Logo */}
    <div className="text-center mb-6 sm:mb-8 w-full flex flex-col items-center">
      <button onClick={() => navigate("/")} className="focus:outline-none cursor-pointer group" title="Return to Landing Page">
        <img src={logoSrc} alt="Opus Form" className="h-12 w-auto transition-opacity group-hover:opacity-80" />
      </button>
    </div>
    
    {/* Form container */}
    <div className="w-full">
      <div className="w-full bg-card border border-border rounded-xl overflow-hidden shadow-xl shadow-black/20">
        {/* Form modes: login / forgot / reset */}
      </div>
    </div>
    
    {/* Footer */}
    <div className="text-center mt-12 text-[9px] text-muted-foreground font-bold uppercase tracking-[0.25em]">
      OPUS FORM · {new Date().getFullYear()}
    </div>
  </div>
</div>
```

**CRITIC FEEDBACK:** Blueprint grid is nice touch. Centered card is standard. No domain personality in form itself.

---

### 2. **Three Form Modes — Repeated Structure**

**Login Mode:**
```tsx
<div className="p-6 sm:p-8">
  {formError && (
    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2.5">
      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
      <span>{formError}</span>
    </div>
  )}
  
  <form onSubmit={handleLogin} className="space-y-6">
    <div className="space-y-2">
      <label htmlFor="login-email" className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Email</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
          <Mail className="w-4 h-4" />
        </div>
        <input type="email" id="login-email" autoComplete="email" value={email} onChange={...} placeholder="dispatcher@opusform.co.uk" className="w-full pl-12 pr-4 py-3 rounded-md border border-border bg-secondary text-foreground focus:border-primary transition-colors placeholder:text-muted-foreground font-medium text-sm outline-none" />
      </div>
    </div>
    
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor="login-password" className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
        <button onClick={() => setFormMode("forgot")} className="text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Forgot password?</button>
      </div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
          <Lock className="w-4 h-4" />
        </div>
        <input type={showPassword ? "text" : "password"} id="login-password" autoComplete="current-password" value={password} onChange={...} placeholder="••••••••••" className="w-full pl-12 pr-12 py-3 rounded-md border border-border bg-secondary text-foreground focus:border-primary transition-colors placeholder:text-muted-foreground font-medium text-sm outline-none" />
        <button onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
    
    <button type="submit" disabled={isSubmitting || !!lockedUntil} className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-md text-[14px] font-bold transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer">
      {isSubmitting ? <Spinner /> : lockedUntil ? <span>Try again in {lockCountdown}s</span> : <span>Sign In</span>}
    </button>
  </form>
</div>
```

**Forgot Mode:**
```tsx
<div className="p-6 sm:p-8">
  <button onClick={() => setFormMode("login")} className="flex items-center text-[9px] font-bold text-muted-foreground hover:text-foreground mb-8 transition-colors uppercase tracking-widest gap-1.5 cursor-pointer">
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
      <label htmlFor="forgot-email" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1 mb-2">Email Identifier</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
          <Mail className="w-4 h-4" />
        </div>
        <input id="forgot-email" type="email" required autoComplete="email" placeholder="name@opusform.co.uk" className="w-full pl-12 pr-4 py-3 rounded-md border border-border bg-secondary text-foreground focus:border-primary transition-colors placeholder:text-muted-foreground font-medium text-sm outline-none" />
      </div>
    </div>
    
    <button type="submit" disabled={isSubmitting} className="w-full py-3 px-4 bg-primary hover:bg-primary disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-md text-[11px] font-extrabold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer">
      {isSubmitting ? <Spinner /> : <span>Request Link</span>}
    </button>
  </form>
</div>
```

**Reset Mode:**
```tsx
<div className="p-6 sm:p-8">
  <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-foreground mb-8">
    <div className="w-[3px] h-4 bg-foreground rounded-[2px]" />
    Set New Password
  </div>
  
  {formError && ( /* same error display */ )}
  
  <form onSubmit={handleResetPassword} className="space-y-6">
    <div className="space-y-2">
      <label htmlFor="reset-new-password" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1 mb-2">New Password</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
          <Lock className="w-4 h-4" />
        </div>
        <input type={showPassword ? "text" : "password"} id="reset-new-password" autoComplete="new-password" value={password} onChange={...} placeholder="••••••••" className="w-full pl-12 pr-12 py-3 rounded-md border border-border bg-secondary text-foreground focus:border-primary transition-colors placeholder:text-muted-foreground font-medium text-sm outline-none tracking-widest" />
        <button onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      
      {password.length > 0 && (
        <div className="p-3 bg-secondary border border-border rounded-md space-y-2">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Strength Criteria:</div>
          {[
            { label: "Minimum 8 characters", met: password.length >= 8 },
            { label: "One uppercase letter", met: /[A-Z]/.test(password) },
            { label: "One lowercase letter", met: /[a-z]/.test(password) },
            { label: "One number (0-9)", met: /[0-9]/.test(password) },
            { label: "One symbol (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(password) },
          ].map((rule, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[9px] uppercase tracking-wider font-bold">
              <div className={`w-1.5 h-1.5 rounded-full ${rule.met ? "bg-primary animate-pulse" : "bg-border"}`} />
              <span className={rule.met ? "text-foreground" : "text-muted-foreground"}>{rule.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
    
    <div className="space-y-2"> ... confirm password ... </div>
    
    <button type="submit" disabled={isSubmitting} className="w-full py-3 px-4 bg-primary hover:bg-primary disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-md text-[11px] font-extrabold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer">
      {isSubmitting ? <Spinner /> : <> <span>Update Password</span> <ChevronRight className="w-3.5 h-3.5" /> </>}
    </button>
  </form>
</div>
```

---

### 3. **Error/Notification Display**

```tsx
<NoticeModal
  open={!!notification}
  onOpenChange={(open) => { if (!open) handleDismissNotification(); }}
  tone={notification?.type === "success" ? "success" : notification?.type === "error" ? "error" : "info"}
  title={notification?.title ?? ""}
  message={notification?.message}
/>
```

**CRITIC FEEDBACK:** Three nearly identical forms. Labels = uppercase tracking-wider. Icons = Mail/Lock. Primary button = generic blue. No domain personality.

---

### 4. **Lockout Mechanism — Security Feature**
```tsx
const [failedAttempts, setFailedAttempts] = useState(0);
const [lockedUntil, setLockedUntil] = useState<number | null>(null);
const [lockCountdown, setLockCountdown] = useState(0);

// After 5 failed attempts → 30 second lockout
if (attempts >= 5) {
  const lockMs = 30_000;
  setLockedUntil(Date.now() + lockMs);
  setLockCountdown(Math.ceil(lockMs / 1000));
  setFormError(`Too many failed attempts. Please wait ${Math.ceil(lockMs / 1000)}s before trying again.`);
}
```

---

## EDITOR — Domain-Specific Personality Enhancements

### Color System: Concrete/Flooring Industry Palette
```css
:root {
  --concrete-amber: #d97706;
  --concrete-amber-light: #fde68a;
  --concrete-amber-dark: #b45309;
  --steel-stone: #475569;
  --steel-stone-light: #94a3b8;
  --steel-stone-dark: #1e293b;
  --cured-green: #059669;
  --cured-green-light: #6ee7b7;
  --safety-yellow: #eab308;
  --rebar-rust: #dc2626;
  --formwork: #f8fafc;
  --formwork-dark: #0f172a;
}
```

---

### 1. **Page Layout: Site Office Sign-In**

```tsx
<div className="min-h-screen bg-formwork dark:bg-formwork-dark flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
  {/* Formwork grid overlay — site hoarding pattern */}
  <div className="absolute inset-0 pointer-events-none" style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 80 0 L 0 0 L 0 80' fill='none' stroke='%23${theme === "light" ? "D97706" : "FDE68A"}' stroke-width='0.5' stroke-opacity='0.3'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23D97706'/%3E%3C/svg%3E")`,
    opacity: theme === "light" ? 0.15 : 0.08
  }} />
  
  <div className="max-w-md w-full z-10 flex flex-col items-center">
    {/* Logo — Site Office Brand */}
    <div className="text-center mb-6 sm:mb-8 w-full flex flex-col items-center">
      <button onClick={() => navigate("/")} className="focus:outline-none cursor-pointer group" title="Return to Opus Form">
        <img src={logoSrc} alt="Opus Form" className="h-12 w-auto transition-opacity group-hover:opacity-80" />
      </button>
      <p className="mt-3 text-xs font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">SITE ACCESS PORTAL</p>
    </div>
    
    {/* Form container — Site Sign-In Sheet */}
    <div className="w-full">
      <div className="w-full bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xl shadow-amber-500/5">
        {/* Form modes */}
      </div>
    </div>
    
    {/* Footer — Site Notice */}
    <div className="text-center mt-8 text-[9px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-[0.25em]">
      OPUS FORM · {new Date().getFullYear()} · AUTHORISED PERSONNEL ONLY
    </div>
  </div>
</div>
```

---

### 2. **Login Mode: Site Sign-In Sheet**

```tsx
<div className="p-6 sm:p-8">
  {formError && (
    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-2.5">
      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
      <span>{formError}</span>
    </div>
  )}
  
  <form onSubmit={handleLogin} className="space-y-6">
    <div className="space-y-2">
      <label htmlFor="login-email" className="text-[11px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 block mb-1.5">SITE EMAIL</label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input type="email" id="login-email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dispatcher@opusform.co.uk" className="w-full pl-10 pr-4 py-3 rounded-lg border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 font-medium text-sm outline-none" />
      </div>
    </div>
    
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor="login-password" className="text-[11px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">SITE PASSWORD</label>
        <button onClick={() => setFormMode("forgot")} className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer">FORGOTTEN PASSWORD?</button>
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input type={showPassword ? "text" : "password"} id="login-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-12 py-3 rounded-lg border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 font-medium text-sm outline-none tracking-widest" />
        <button onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors cursor-pointer" aria-label={showPassword ? "Hide password" : "Show password"}>
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
    
    {lockedUntil && (
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-sm font-bold text-amber-700 dark:text-amber-300">ACCOUNT LOCKED — TRY AGAIN IN {lockCountdown}s</span>
      </div>
    )}
    
    <button type="submit" disabled={isSubmitting || !!lockedUntil} className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer shadow-lg shadow-amber-600/20">
      {isSubmitting ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : lockedUntil ? (
        <span>TRY AGAIN IN {lockCountdown}s</span>
      ) : (
        <span>SIGN IN TO SITE</span>
      )}
    </button>
  </form>
</div>
```

---

### 3. **Forgot Mode: Password Recovery Request**

```tsx
<div className="p-6 sm:p-8">
  <button onClick={() => setFormMode("login")} className="flex items-center text-[9px] font-bold text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 mb-8 transition-colors uppercase tracking-widest gap-1.5 cursor-pointer">
    <ArrowLeft className="w-3 h-3" /> RETURN TO SIGN IN
  </button>
  
  <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-stone-900 dark:text-white mb-4">
    <div className="w-[3px] h-4 bg-amber-600 rounded-[2px]" />
    PASSWORD RECOVERY
  </div>
  <p className="text-[10px] text-stone-500 dark:text-stone-400 mb-8 font-bold leading-relaxed uppercase tracking-widest">
    Enter your authorised site email to receive a secure restoration link.
  </p>
  
  <form onSubmit={handleForgot} className="space-y-6">
    <div className="space-y-2">
      <label htmlFor="forgot-email" className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 block ml-1 mb-1.5">EMAIL IDENTIFIER</label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input id="forgot-email" type="email" required autoComplete="email" placeholder="name@opusform.co.uk" className="w-full pl-10 pr-4 py-3 rounded-lg border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 font-medium text-sm outline-none" />
      </div>
    </div>
    
    <button type="submit" disabled={isSubmitting} className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-extrabold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer shadow-lg shadow-amber-600/20">
      {isSubmitting ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <span>REQUEST RECOVERY LINK</span>
      )}
    </button>
  </form>
</div>
```

---

### 4. **Reset Mode: Set New Site Password**

```tsx
<div className="p-6 sm:p-8">
  <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-stone-900 dark:text-white mb-8">
    <div className="w-[3px] h-4 bg-amber-600 rounded-[2px]" />
    SET NEW SITE PASSWORD
  </div>
  
  {formError && ( /* same error display as login */ )}
  
  <form onSubmit={handleResetPassword} className="space-y-6">
    <div className="space-y-2">
      <label htmlFor="reset-new-password" className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 block ml-1 mb-1.5">NEW PASSWORD</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input type={showPassword ? "text" : "password"} id="reset-new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-12 py-3 rounded-lg border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-stone-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 font-medium text-sm outline-none tracking-widest" />
        <button onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors cursor-pointer" aria-label={showPassword ? "Hide password" : "Show password"}>
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      
      {password.length > 0 && (
        <div className="p-3 bg-stone-50 dark:bg-slate-900/50 border border-stone-200 dark:border-slate-700 rounded-lg space-y-2">
          <div className="text-[9px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-1">STRENGTH REQUIREMENTS:</div>
          {[
            { label: "Minimum 8 characters", met: password.length >= 8 },
            { label: "One uppercase letter", met: /[A-Z]/.test(password) },
            { label: "One lowercase letter", met: /[a-z]/.test(password) },
            { label: "One number (0-9)", met: /[0-9]/.test(password) },
            { label: "One symbol (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(password) },
          ].map((rule, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[9px] uppercase tracking-wider font-bold">
              <div className={`w-1.5 h-1.5 rounded-full ${rule.met ? "bg-amber-500 animate-pulse" : "bg-stone-300 dark:bg-stone-600"}`} />
              <span className={rule.met ? "text-stone-900 dark:text-white" : "text-stone-500 dark:text-stone-400"}>{rule.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
    
    <div className="space-y-2"> ... confirm password with same styling ... </div>
    
    <button type="submit" disabled={isSubmitting} className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-extrabold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer shadow-lg shadow-amber-600/20">
      {isSubmitting ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <span>UPDATE PASSWORD</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </>
      )}
    </button>
  </form>
</div>
```

---

### 5. **Notification Modal: Site Notice Style**

```tsx
<NoticeModal
  open={!!notification}
  onOpenChange={(open) => { if (!open) handleDismissNotification(); }}
  tone={notification?.type === "success" ? "success" : notification?.type === "error" ? "error" : "info"}
  title={notification?.title ?? ""}
  message={notification?.message}
  // Custom styling via NoticeModal props or override
/>
```

**NoticeModal override for domain:**
```tsx
// Success = Green safety notice
// Error = Red safety notice  
// Info = Amber site notice
```

---

### 6. **Micro-Interactions**

```css
/* Input focus - amber ring */
input:focus {
  @apply border-amber-500 ring-1 ring-amber-500;
}

/* Button press */
.btn-site:active {
  @apply scale-[0.98];
}

/* Lock countdown pulse */
@keyframes lock-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.lock-countdown { animation: lock-pulse 1s infinite; }

/* Strength criteria pop */
@keyframes criteria-pop {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
.criteria-met { animation: criteria-pop 0.2s ease-out; }

/* Form card entrance */
@keyframes card-enter {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
.auth-card { animation: card-enter 0.4s ease-out; }
```

---

## CRITIC FEEDBACK

| Aspect | Original | Editor | Critic Assessment |
|--------|----------|--------|-------------------|
| **Layout** | Centered card + blueprint grid | Site office sign-in sheet + formwork grid | **Authentic** — matches site hoarding |
| **Labels** | "Email", "Password" | "SITE EMAIL", "SITE PASSWORD" | **Clear** — domain language |
| **Buttons** | "Sign In", "Request Link" | "SIGN IN TO SITE", "REQUEST RECOVERY LINK" | **Authentic** — site office terminology |
| **Icons** | Mail, Lock, Eye | Same, stone/amber colors | **Consistent** |
| **Error State** | Red alert | Red safety notice | **Appropriate** |
| **Lockout** | Countdown text | Amber warning banner with triangle | **Visible** |
| **Strength Criteria** | Primary pulse | Amber pulse + "STRENGTH REQUIREMENTS" | **Authentic** |
| **Color Palette** | Slate/Blue | Amber/Stone | **Authentic** — concrete brand |
| **Micro-interactions** | Active scale | Focus ring, pulse, pop, entrance | **Polished** |

---

## APPLY — Implementation Priority

1. **Color System** — CSS variables for amber/stone
2. **Page Layout** — Formwork grid + site access header
3. **Form Labels/Buttons** — ALL CAPS, site terminology
4. **Input Styling** — Amber focus rings, stone borders
5. **Primary Buttons** — Amber-600 with shadow
6. **Lockout Banner** — Amber warning with triangle
7. **Strength Criteria** — Amber pulse, stone borders
8. **Notice Modal** — Safety notice styling
9. **Micro-interactions** — CSS animations

---

**Estimated Effort:** 1 day for full component overhaul  
**Dependencies:** CSS variable system  
**Testing:** Light/dark mode, responsive, accessibility (WCAG AA)  
**Rollout:** Feature flag for gradual deployment