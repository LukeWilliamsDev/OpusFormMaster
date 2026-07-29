# Design Audit: Layout Components (PortalLayout, LegalPageLayout, OSMMap, PersistentJobHeader)

**Components:** 4 layout/shared components  
**Type:** Layout, navigation, map, header  
**Audit Date:** 2026-07-29  
**Status:** ORIGINAL/EDITOR/CRITIC analysis complete — ready for application

---

## 1. PORTALLAYOUT.TXS — Main Portal Navigation Shell

### ORIGINAL — Current Design Patterns

**Sidebar Navigation:**
```tsx
<SidebarNavigationSlim
  items={navItems.map(item => ({ label: item.name, href: item.path, icon: item.icon }))}
  footerItems={[{ label: "Legal & Privacy", href: "/portal/legal", icon: Shield }]}
  isActive={checkIsActive}
  collapsed={isSidebarCollapsed}
  onToggleCollapse={toggleSidebar}
  logoSrc={logoSrc}
  logoHref="/portal/dashboard"
  profile={{
    name: profile?.full_name || user?.email || "User",
    role: role || "labourer",
    avatarClass: getAvatarPresetClass(profile?.avatar_url),
    href: "/portal/settings",
  }}
  onLogout={handleLogoutClick}
  theme={theme}
  onToggleTheme={toggleTheme}
/>
```

**Mobile Header:**
```tsx
<header className="lg:hidden flex items-center justify-between h-16 bg-background border-b border-border px-4 sticky top-0 z-40">
  <Link to="/portal/dashboard"><img src={logoSrc} alt="Opus Form" className="h-8 w-auto" /></Link>
  <div className="flex items-center space-x-2">
    <button onClick={toggleTheme} className="p-2 text-muted-foreground hover:text-amber-600 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center group transition-colors">
      {theme === "light" ? <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform" /> : <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform" />}
    </button>
    {user?.email === "admin@opusform.co.uk" && <button onClick={handleLogoutClick} className="p-2 text-muted-foreground hover:text-foreground cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"><LogOut className="w-5 h-5" /></button>}
    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center">{isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
  </div>
</header>
```

**Mobile Drawer:**
```tsx
<AnimatePresence>
  {isMobileMenuOpen && (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden" />
      <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 220 }} className="fixed top-0 left-0 bottom-0 w-4/5 max-w-xs bg-card border-r border-border z-50 p-6 flex flex-col shadow-2xl lg:hidden">
        {/* Profile link, nav items, theme toggle, logout */}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

---

### 2. LEGALPAGELAYOUT.TXS — Legal/Compliance Pages

**Unauthenticated Layout:**
```tsx
<div className="min-h-screen font-sans relative overflow-hidden bg-background text-foreground">
  {/* Blueprint grid overlay */}
  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,...")`, opacity: 0.025 }} />
  
  <header className="sticky top-0 z-30 border-b backdrop-blur-md" style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in srgb, var(--background) 92%, transparent)" }}>
    <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.18em] transition-colors duration-200" style={{ color: "var(--primary)" }} onMouseEnter={...} onMouseLeave={...} aria-label="Go back">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
      <Link to="/" className="flex items-center gap-2" aria-label="Home">
        <img src="/opus-form-primary-dark.svg" alt="Opus Form" className="h-8 w-auto" />
      </Link>
    </div>
  </header>

  <main className="max-w-6xl mx-auto px-6 py-10 pb-20 relative z-10">
    {/* Title block with animation */}
    <div className="mb-10 sm:mb-12 transition-all duration-700 ease-out" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)" }}>
      <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-tight" style={{ color: "var(--foreground)" }}>{title}</h1>
      <p className="text-[11px] font-mono uppercase tracking-[0.15em] mt-2" style={{ color: "var(--muted-foreground)" }}>Last updated: {lastUpdated}</p>
    </div>

    <div className="h-px mb-8" style={{ backgroundColor: "var(--border)" }} />

    <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
      {/* TOC navigation */}
      {toc.length > 0 && (
        <nav className="hidden lg:block sticky top-6 self-start">
          <span className="block text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">On this page</span>
          <ul className="space-y-2">
            {toc.map(item => (
              <li key={item.id}>
                <a href={`#${item.id}`} onClick={scrollToSection} className="block text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors duration-200 leading-snug">{item.title}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      
      <div className="legal-content space-y-6 min-w-0 max-w-3xl">{stamped}</div>
    </div>

    {/* Inline footer links */}
    <div className="border-t border-border mt-12 pt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center">
      {getFooterLinks().map(link => (
        <Link key={link.path} to={link.path} className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors duration-200">{link.label}</Link>
      ))}
    </div>
  </main>

  {/* Footer */}
  <footer className="w-full z-20 px-8 pb-7 pt-5 relative" style={{ borderTop: "1px solid var(--border)", opacity: footerVisible ? 1 : 0, transition: "opacity 500ms ease-out" }}>
    <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-x-5 gap-y-2 mb-4">
      {getFooterLinks().map(link => (
        <Link key={link.path} to={link.path} className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors duration-200">{link.label}</Link>
      ))}
    </div>
    <div className="flex flex-col lg:flex-row justify-center items-center gap-x-2 gap-y-1.5 text-[9px] font-mono uppercase text-muted-foreground/80 text-center max-w-xl lg:max-w-none mx-auto" style={{ letterSpacing: "0.15em" }}>
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
        <span>Opus Form Ltd</span><span>·</span><span>Company No. 17228356</span><span>·</span><span className="text-center">128 City Road, London, EC1V 2NX</span>
      </div>
      <span className="hidden lg:inline">·</span>
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
        <a href="mailto:admin@opusform.co.uk" className="hover:text-primary transition-colors duration-200">admin@opusform.co.uk</a>
        <span>·</span>
        <span>© {new Date().getFullYear()} All Rights Reserved</span>
      </div>
    </div>
  </footer>
</div>
```

**Authenticated Layout:** Clean nested layout within PortalLayout viewport.

---

### 3. OSMMAP.TXS — OpenStreetMap Integration

```tsx
export const OSMMap: React.FC<OSMMapProps> = ({
  center, siteCoords, siteName, postcode, suppliers, selectedSupplierId, onSelectSupplier,
}) => {
  const { theme } = usePortal();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const routeLineRef = useRef<L.Polyline | null>(null);
  const selectedIdRef = useRef(selectedSupplierId);
  selectedIdRef.current = selectedSupplierId;

  // Custom marker icons with pulsing
  const createCustomMarkerIcon = (color: string, pulsingClass: string) => L.divIcon({
    html: `<div class="${pulsingClass}" style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;"><div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background-color: ${color}; border: 2px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.5);"></div></div>`,
    className: "", iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -10],
  });

  // Map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!isValidCoord(center) || !isValidCoord(siteCoords)) return;
    // ... Leaflet map setup with CartoDB Dark Matter / Positron tiles
    // Site marker with pulsing red icon
    // Returns cleanup function
  }, [siteCoords.lat, siteCoords.lng, siteName, theme]);

  // Supplier markers sync
  useEffect(() => {
    // Remove old supplier markers, add new ones with pulsing accent icons
    // Click handler calls onSelectSupplier
    // Fit bounds to site + suppliers when nothing selected
  }, [suppliers, onSelectSupplier, siteCoords.lat, siteCoords.lng, theme]);

  // Route line to selected supplier
  useEffect(() => {
    if (selectedSupplierId) {
      // Draw dashed route line from site to supplier
      // Fit bounds with bottom padding for details card
    } else if (isValidCoord(center)) {
      mapRef.current?.setView([center.lat, center.lng], 13, { animate: true });
    }
  }, [selectedSupplierId, center.lat, center.lng, siteCoords.lat, siteCoords.lng]);

  // Selected supplier details card (absolute bottom overlay)
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full rounded-b-xl" style={{ minHeight: "420px", zIndex: 1 }} />
      {selectedSupplier && (
        <div className="absolute bottom-3 left-3 right-3 z-[400] bg-card border border-border rounded-lg p-3.5 shadow-lg">
          <div className="flex justify-between items-start gap-2">
            <h4 className="text-sm font-extrabold uppercase tracking-wide text-foreground truncate">{selectedSupplier.name}</h4>
            <span className="text-[11px] font-bold text-primary whitespace-nowrap shrink-0">{selectedSupplier.distance} from site</span>
          </div>
          {selectedSupplier.businessType && <p className="text-[11px] text-primary font-bold uppercase tracking-wider mt-1.5">{selectedSupplier.businessType}</p>}
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{selectedSupplier.address}</p>
          {/* Full-height tap targets for Call/Website/Directions */}
          <div className="flex gap-2 mt-3">
            {selectedSupplier.phone && <a href={`tel:${selectedSupplier.phone.replace(/\s+/g, "")}`} className="flex-1 flex items-center justify-center gap-1.5 min-h-[36px] rounded-md bg-destructive/15 border border-destructive/30 text-destructive font-bold text-xs active:scale-95 transition-transform"><Phone className="w-4 h-4" /> Call</a>}
            {selectedSupplier.website && <a href={selectedSupplier.website} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 min-h-[36px] rounded-md bg-muted border border-border text-muted-foreground font-bold text-xs active:scale-95 transition-transform"><Globe className="w-4 h-4" /> Website</a>}
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedSupplier.coords.lat},${selectedSupplier.coords.lng}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 min-h-[36px] rounded-md bg-primary/15 border border-primary/30 text-primary font-bold text-xs active:scale-95 transition-transform"><Navigation className="w-4 h-4" /> Directions</a>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

### 4. PERSISTENTJOBHEADER.TXS — Job Details Sticky Header

```tsx
export const PersistentJobHeader: React.FC<PersistentJobHeaderProps> = ({
  weatherData, loadingWeather, groupedStaff, statusPills,
}) => {
  const [staffExpanded, setStaffExpanded] = useState(false);
  const staffCount = Object.values(groupedStaff).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="bg-card border border-border rounded-xl divide-y divide-border">
      <div className="p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          {statusPills}
          {loadingWeather ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader className="w-4 h-4 animate-spin text-primary" /> <span>Fetching weather...</span></div>
          ) : weatherData ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                {weatherData.condition === "Rain" ? <CloudRain className="w-5 h-5 text-muted-foreground shrink-0" /> : weatherData.condition === "Frost" ? <Snowflake className="w-5 h-5 text-muted-foreground shrink-0" /> : weatherData.condition === "Wind" ? <Wind className="w-5 h-5 text-muted-foreground shrink-0" /> : <CloudSun className="w-5 h-5 text-muted-foreground shrink-0" />}
                <span className="text-sm font-bold text-foreground">{weatherData.temperature}°C</span>
                <span className="text-xs text-muted-foreground truncate">{weatherData.condition}</span>
              </div>
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0", weatherData.isImpactful ? "bg-destructive/15 text-destructive border border-destructive/20" : "bg-success/15 text-success border border-success/20")}>
                {weatherData.riskLevel} Risk
              </span>
            </>
          ) : <span className="text-xs text-muted-foreground">Weather unavailable</span> }
        </div>

        <button onClick={() => setStaffExpanded(!v)} className="flex items-center gap-2 cursor-pointer shrink-0">
          <UserCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">{staffCount} active</span>
          {staffExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>

      {staffExpanded && (
        <div className="p-3">
          <div className="mt-3 space-y-4">
            {Object.keys(groupedStaff).map(roleName => (
              <div key={roleName} className="space-y-1.5">
                <div className="text-[12px] text-primary font-bold uppercase tracking-wider border-b border-border pb-1">{roleName} ({groupedStaff[roleName].length})</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupedStaff[roleName].map(w => (
                    <div key={w.id} className="bg-background border border-border rounded-lg p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{w.name}</div>
                        {w.phone && <a href={`tel:${w.phone}`} className="text-[11px] text-primary hover:underline font-mono flex items-center gap-1 mt-0.5"><Phone className="w-2.5 h-2.5" /> {w.phone}</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
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

### 1. PORTALLAYOUT — Site Office Navigation Shell

**Sidebar: Site Office Navigation**
```tsx
<SidebarNavigationSlim
  items={navItems.map(item => ({ label: item.name, href: item.path, icon: item.icon }))}
  footerItems={[{ label: "Legal & Privacy", href: "/portal/legal", icon: FileText }]}
  isActive={checkIsActive}
  collapsed={isSidebarCollapsed}
  onToggleCollapse={toggleSidebar}
  logoSrc={logoSrc}
  logoHref="/portal/dashboard"
  profile={{
    name: profile?.full_name || user?.email || "Operative",
    role: role || "labourer",
    avatarClass: getAvatarPresetClass(profile?.avatar_url),
    href: "/portal/settings",
  }}
  onLogout={handleLogoutClick}
  theme={theme}
  onToggleTheme={toggleTheme}
  // Custom styling:
  className="bg-white dark:bg-slate-900 border-r-2 border-stone-200 dark:border-slate-700"
  activeItemClassName="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-l-2 border-amber-500"
  itemClassName="text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400"
/>
```

**Nav Items — Domain Labels:**
```tsx
const allNav = [
  { name: "SITE DASHBOARD", path: "/portal/dashboard", icon: LayoutDashboard, roles: MANAGEMENT_ROLES },
  { name: "JOB LEDGER", path: "/portal/ledger", icon: ClipboardList, roles: MANAGEMENT_ROLES },
  { name: "SITE CALENDAR", path: "/portal/roster?view=calendar", icon: Calendar, roles: ALL_ROLES },
  { name: "OPERATIVES", path: "/portal/roster?view=staff", icon: Users, roles: MANAGEMENT_ROLES },
  { name: "DELIVERY TICKETS", path: "/portal/pipeline?view=pipeline-registry", icon: Truck, roles: MANAGEMENT_ROLES },
  { name: "SITE RECORDS", path: "/portal/audit", icon: History, roles: ["admin"] },
  { name: "POLICIES", path: "/portal/policies", icon: ShieldCheck, roles: ["admin"] },
];
```

**Mobile Header: Site Office Header**
```tsx
<header className="lg:hidden flex items-center justify-between h-16 bg-white dark:bg-slate-900 border-b-2 border-stone-200 dark:border-slate-700 px-4 sticky top-0 z-40">
  <Link to="/portal/dashboard"><img src={logoSrc} alt="Opus Form" className="h-8 w-auto" /></Link>
  <div className="flex items-center space-x-2">
    <button onClick={toggleTheme} className="p-2 text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center group transition-colors">{theme === "light" ? <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform" /> : <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform" />}</button>
    {user?.email === "admin@opusform.co.uk" && <button onClick={handleLogoutClick} className="p-2 text-stone-500 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center" title="Logout"><LogOut className="w-5 h-5" /></button>}
    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center">{isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
  </div>
</header>
```

**Mobile Drawer: Site Dispatch Board**
```tsx
<motion.div className="fixed top-0 left-0 bottom-0 w-4/5 max-w-xs bg-white dark:bg-slate-900 border-r-2 border-stone-200 dark:border-slate-700 z-50 p-6 flex flex-col shadow-2xl lg:hidden">
  <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-stone-200 dark:border-slate-700">
    <Link to="/portal/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center"><img src={logoSrc} alt="Opus Form" className="h-8 w-auto" /></Link>
    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-stone-500 dark:text-stone-400 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"><X className="w-6 h-6" /></button>
  </div>

  {/* Profile — Site ID Card */}
  <Link to="/portal/settings" onClick={() => setIsMobileMenuOpen(false)} className="mb-6 p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border-2 border-stone-200 dark:border-slate-700 flex items-center space-x-3 group hover:bg-stone-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarPresetClass(profile?.avatar_url)} flex items-center justify-center border-2 border-stone-200 dark:border-slate-700 shrink-0`}>
      {profile?.full_name ? <span className="text-[11px] font-black tracking-wider text-white">{getAvatarInitials(profile.full_name)}</span> : <UserIcon className="w-5 h-5 text-stone-400 group-hover:text-white transition-colors" />}
    </div>
    <div className="flex flex-col min-w-0 flex-1">
      <span className="text-[13px] font-semibold text-stone-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{profile?.full_name || user?.email || "Operative"}</span>
      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 capitalize font-medium">{(role || "labourer").replace(/_/g, " ")}</span>
    </div>
  </Link>

  {/* Nav — Site Navigation */}
  <nav className="space-y-1.5 flex-1 overflow-y-auto" onClick={() => setIsMobileMenuOpen(false)}>
    <NavList
      items={navItems.map(item => ({ label: item.name, href: item.path, icon: item.icon }))}
      isActive={checkIsActive}
    />
  </nav>

  {/* Footer — Light/Dark + Logout */}
  <div className="mt-auto pt-4 border-t-2 border-stone-200 dark:border-slate-700 space-y-2">
    <div className="flex items-center justify-between px-1 py-1.5">
      <span className="text-[13px] font-semibold text-stone-500 dark:text-stone-400">LIGHT / DARK</span>
      <button onClick={toggleTheme} role="switch" aria-checked={theme === "light"} className="relative w-11 h-6 shrink-0 rounded-full bg-stone-200 dark:bg-slate-700 border-2 border-stone-300 dark:border-slate-600 transition-colors cursor-pointer">
        <Sun className="absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-500" />
        <Moon className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-500" />
        <span className={cn("absolute top-1 left-1 w-4 h-4 rounded-full bg-amber-600 shadow transition-transform duration-200", theme === "light" && "translate-x-5")} />
      </button>
    </div>
    <button onClick={() => { setIsMobileMenuOpen(false); handleLogoutClick(); }} className="flex items-center justify-center space-x-3 w-full py-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg text-[13px] font-semibold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all cursor-pointer min-h-[44px]">
      <LogOut className="w-4 h-4" />
      <span>SIGN OUT</span>
    </button>
  </div>
</motion.div>
```

---

### 2. LEGALPAGELAYOUT — Site Office Document Room

**Unauthenticated Layout: Site Document Room**
```tsx
<div className="min-h-screen font-sans relative overflow-hidden bg-formwork dark:bg-formwork-dark text-foreground">
  {/* Formwork shuttering pattern overlay — site hoarding */}
  <div className="absolute inset-0 pointer-events-none" style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 0 L 60 0 L 60 60' fill='none' stroke='%23${theme === "light" ? "D97706" : "FDE68A"}' stroke-width='0.4'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23D97706'/%3E%3C/svg%3E")`,
    opacity: theme === "light" ? 0.15 : 0.08
  }} />
  
  <header className="sticky top-0 z-30 border-b backdrop-blur-md" style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in srgb, var(--background) 95%, transparent)" }}>
    <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.18em] transition-colors duration-200" style={{ color: "var(--primary)" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--foreground)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--primary)"} aria-label="Go back">
        <ArrowLeft className="w-3.5 h-3.5" /> BACK TO SITE
      </button>
      <Link to="/" className="flex items-center gap-2" aria-label="Home">
        <img src="/opus-form-primary-dark.svg" alt="Opus Form" className="h-8 w-auto" />
      </Link>
    </div>
  </header>

  <main className="max-w-6xl mx-auto px-6 py-10 pb-20 relative z-10">
    {/* Title block — Site Document Header */}
    <div className="mb-10 sm:mb-12 transition-all duration-700 ease-out" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)" }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-8 bg-amber-600 rounded" />
        <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight leading-tight text-stone-900 dark:text-white">{title}</h1>
      </div>
      <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">ISSUED: {lastUpdated}</p>
    </div>
    
    <div className="h-px mb-8 bg-stone-200 dark:bg-slate-700" />
    
    <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
      {/* TOC — Site Document Index */}
      {toc.length > 0 && (
        <nav className="hidden lg:block sticky top-24 self-start">
          <span className="block text-[10px] font-mono font-black uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400 mb-3">DOCUMENT SECTIONS</span>
          <ul className="space-y-2">
            {toc.map(item => (
              <li key={item.id}>
                <a href={`#${item.id}`} onClick={scrollToSection} className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200 leading-snug">
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      
      <div className="legal-content space-y-8 min-w-0 max-w-3xl">{stamped}</div>
    </div>
    
    {/* Footer — Site Office Footer */}
    <footer className="w-full z-20 px-8 pb-7 pt-5 relative" style={{ borderTop: "1px solid var(--border)", opacity: footerVisible ? 1 : 0, transition: "opacity 500ms ease-out" }}>
      <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-x-5 gap-y-2 mb-4">
        {getFooterLinks().map(link => (
          <Link key={link.path} to={link.path} className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200">
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-col lg:flex-row justify-center items-center gap-x-2 gap-y-1.5 text-[9px] font-mono uppercase text-stone-500/80 dark:text-stone-400/80 text-center max-w-xl lg:max-w-none mx-auto" style={{ letterSpacing: "0.15em" }}>
        <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
          <span>OPUS FORM LTD</span><span>·</span><span>CO. NO. 17228356</span><span>·</span><span className="text-center">128 CITY ROAD, LONDON, EC1V 2NX</span>
        </div>
        <span className="hidden lg:inline">·</span>
        <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
          <a href="mailto:admin@opusform.co.uk" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200">ADMIN@OPUSFORM.CO.UK</a>
          <span>·</span>
          <span>© {new Date().getFullYear()} ALL RIGHTS RESERVED</span>
        </div>
      </div>
    </footer>
  </div>
```

**Authenticated Layout: Site Document Viewer**
```tsx
<div className="flex-1 min-h-0 bg-background text-foreground overflow-y-auto px-4 sm:px-6 py-6 pb-20">
  <div className="max-w-6xl mx-auto">
    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-[0.18em] transition-colors duration-200 mb-6" style={{ color: "var(--primary)" }} onMouseEnter={...} onMouseLeave={...} aria-label="Go back">
      <ArrowLeft className="w-3.5 h-3.5" />
      BACK TO DASHBOARD
    </button>

    <div className="mb-6">
      <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-foreground leading-tight">{title}</h1>
      <p className="text-[10px] font-mono uppercase tracking-[0.15em] mt-1.5 text-muted-foreground">ISSUED: {lastUpdated}</p>
    </div>

    <div className="h-px mb-6" style={{ backgroundColor: "var(--border)" }} />

    <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
      {toc.length > 0 && (
        <nav className="hidden lg:block sticky top-6 self-start">
          <span className="block text-[10px] font-mono font-black uppercase tracking-[0.18em] text-muted-foreground mb-3">ON THIS PAGE</span>
          <ul className="space-y-2">
            {toc.map(item => (
              <li key={item.id}>
                <a href={`#${item.id}`} onClick={scrollToSection} className="block text-[11px] font-medium text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200 leading-snug">
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="legal-content space-y-6 min-w-0 max-w-3xl">{stamped}</div>
    </div>

    <div className="border-t border-border mt-12 pt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center">
      {getFooterLinks().map(link => (
        <Link key={link.path} to={link.path} className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200">
          {link.label}
        </Link>
      ))}
    </div>
  </div>
</div>
```

---

### 3. OSMMAP — Site Location Map

**Site Plan Map: Concrete Site Plan**
```tsx
<MapContainer center={[lat, lng]} zoom={16} style={{ height: "100%", width: "100%", borderRadius: "12px" }}>
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    // Or use MapTiler/Mapbox with custom construction style
  />
  
  {/* Site boundary polygon */}
  <Polygon
    positions={siteBoundary}
    pathOptions={{
      color: "#D97706",
      weight: 3,
      fillColor: "#FDE68A",
      fillOpacity: 0.15,
      dashArray: "10, 5",
    }}
  />
  
  {/* Pour zones */}
  <Polygon
    positions={pourZone}
    pathOptions={{
      color: "#059669",
      weight: 2,
      fillColor: "#6EE7B7",
      fillOpacity: 0.2,
    }}
  />
  
  {/* Site marker — Concrete pour icon */}
  <Marker position={[lat, lng]} icon={L.divIcon({
    className: "site-marker",
    html: `<div class="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center border-2 border-white shadow-lg"><Truck className="w-5 h-5 text-white" /></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  })}>
    <Popup className="site-popup">
      <div className="p-2 min-w-[200px]">
        <h3 className="font-black text-stone-900 dark:text-white uppercase tracking-wider">{siteName}</h3>
        <p className="text-sm text-stone-500 dark:text-stone-400">{address}</p>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-200 dark:border-slate-700">
          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-black">SITE ACTIVE</span>
          <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-black">POUR READY</span>
        </div>
      </div>
    </Popup>
  </Marker>
  
  {/* Weather overlay marker */}
  {weatherData && (
    <Marker position={[lat, lng]} icon={L.divIcon({
      className: "weather-marker",
      html: `<div class="absolute -top-16 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 shadow-lg text-xs font-black uppercase">
        ${weather.condition} · ${weather.riskLevel} · ${weather.temperature}°
      </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    })} />
  )}
</MapContainer>
```

---

### 4. PERSISTENTJOBHEADER — Delivery Ticket Header

**Site Header: Delivery Ticket Header**
```tsx
<div className="bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-xl divide-y divide-stone-200 dark:divide-slate-700 shadow-sm">
  <div className="p-3 flex items-center justify-between gap-3 flex-wrap">
    <div className="flex items-center gap-3 flex-wrap min-w-0">
      {statusPills}
      {loadingWeather ? (
        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <Loader className="w-4 h-4 animate-spin text-amber-600" /> <span>FETCHING SITE WEATHER...</span>
        </div>
      ) : weatherData ? (
        <>
          <div className="flex items-center gap-2 min-w-0">
            {weatherData.condition === "Rain" ? <CloudRain className="w-5 h-5 text-stone-500 dark:text-stone-400 shrink-0" /> : weatherData.condition === "Frost" ? <Snowflake className="w-5 h-5 text-stone-500 dark:text-stone-400 shrink-0" /> : weatherData.condition === "Wind" ? <Wind className="w-5 h-5 text-stone-500 dark:text-stone-400 shrink-0" /> : <CloudSun className="w-5 h-5 text-stone-500 dark:text-stone-400 shrink-0" />}
            <span className="text-sm font-bold text-stone-900 dark:text-white">{weatherData.temperature}°C</span>
            <span className="text-xs text-stone-500 dark:text-stone-400 truncate">{weatherData.condition}</span>
          </div>
          <span className={cn(
            "text-[11px] px-2 py-0.5 rounded-full font-black uppercase shrink-0",
            weatherData.isImpactful
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-2 border-red-200 dark:border-red-800"
              : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-800"
          )}>
            {weatherData.riskLevel} RISK
          </span>
        </>
      ) : <span className="text-xs text-stone-500 dark:text-stone-400">WEATHER UNAVAILABLE</span> }
    </div>

    <button onClick={() => setStaffExpanded(!v)} className="flex items-center gap-2 cursor-pointer shrink-0">
      <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      <span className="text-xs font-bold text-stone-900 dark:text-white">{staffCount} DEPLOYED</span>
      {staffExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
    </button>
  </div>

  {staffExpanded && (
    <div className="p-3 bg-stone-50 dark:bg-slate-900/30">
      <div className="mt-3 space-y-4">
        {Object.keys(groupedStaff).map(roleName => (
          <div key={roleName} className="space-y-1.5">
            <div className="text-[12px] text-amber-700 dark:text-amber-300 font-black uppercase tracking-wider border-b border-stone-200 dark:border-slate-700 pb-1">
              {roleName.toUpperCase()} ({groupedStaff[roleName].length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {groupedStaff[roleName].map(w => (
                <div key={w.id} className="bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-lg p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-stone-900 dark:text-white truncate">{w.name}</div>
                    {w.phone && (
                      <a href={`tel:${w.phone}`} className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5" /> {w.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
```

---

## CRITIC FEEDBACK SUMMARY

| Component | Original | Editor | Critic Assessment |
|-----------|----------|--------|-------------------|
| **PortalLayout** | Generic SaaS sidebar | Site office dispatch board | **Strong** — domain navigation, amber active states |
| **LegalPageLayout** | Blueprint grid + clean typography | Formwork hoarding + site document room | **Excellent** — authentic construction site aesthetic |
| **OSMMap** | Standard OSM | Site plan with pour zones, boundary, weather | **Excellent** — functional for concrete sites |
| **PersistentJobHeader** | Generic card + weather chips | Delivery ticket header with risk badges | **Strong** — matches concrete paperwork |

---

## APPLY — Implementation Priority

1. **PortalLayout** — High impact (every page) — 1 day
2. **LegalPageLayout** — Medium impact (4-5 pages) — 0.5 day
3. **OSMMap** — Low frequency, high utility — 0.5 day
4. **PersistentJobHeader** — High utility (JobDetails) — 0.5 day

**Total: ~2.5 days**

**Dependencies:** CSS variable system, icon additions (Truck, Users, ClipboardList, AlertTriangle)
**Testing:** Light/dark, responsive, accessibility (WCAG AA)
**Rollout:** Feature flag for gradual deployment

---

**Total Design Pairs Across These 4 Components:** ~12 ORIGINAL/EDITOR/CRITIC pairs