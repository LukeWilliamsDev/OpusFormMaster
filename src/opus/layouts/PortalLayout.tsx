// @ts-nocheck
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  HardHat, 
  Calendar, 
  Users, 
  FileText, 
  History, 
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Shield,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePortal } from '../context/PortalContext';
import { getAvatarPresetClass } from '../pages/Settings';

export const PortalLayout: React.FC = () => {
  const { signOut, role, user, profile } = usePortal();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('portal-sidebar-collapsed') === 'true');

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      localStorage.setItem('portal-sidebar-collapsed', String(!prev));
      return !prev;
    });
  };
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoutClick = async () => {
    await signOut();
    navigate('/portal');
  };

  const allNav = [
    { name: 'Dashboard', path: '/portal/dashboard', icon: LayoutDashboard, roles: ['admin', 'dispatcher'] },
    { name: 'Job Ledger', path: '/portal/ledger', icon: HardHat, roles: ['admin', 'dispatcher'] },
    { name: 'Calendar', path: '/portal/roster?view=calendar', icon: Calendar, roles: ['admin', 'dispatcher', 'operative'] },
    { name: 'Staff', path: '/portal/roster?view=staff', icon: Users, roles: ['admin', 'dispatcher'] },
    { name: 'Quotes', path: '/portal/pipeline?view=pipeline-registry', icon: FileText, roles: ['admin', 'dispatcher'] },
    { name: 'Audit Trail', path: '/portal/audit', icon: History, roles: ['admin'] },
  ];

  // Filter main nav items based on user's role and email constraints
  const navItems = allNav.filter(item => {
    if (!role) return false;
    if (!item.roles.includes(role)) return false;
    if (user?.email === 'admin@opusform.co.uk') {
      return item.path === '/portal/audit';
    }
    if (item.path === '/portal/audit' && user?.email !== 'admin@opusform.co.uk') return false;
    return true;
  });

  const checkIsActive = (path: string) => {
    const [itemPath, itemQuery] = path.split('?');
    if (location.pathname !== itemPath) return false;
    
    const params = new URLSearchParams(location.search);
    const itemParams = new URLSearchParams(itemQuery || '');
    
    if (itemPath === '/portal/roster') {
      const currentView = params.get('view') || 'calendar';
      const itemView = itemParams.get('view') || 'calendar';
      return currentView === itemView;
    }
    
    if (itemPath === '/portal/pipeline') {
      // Both quote-builder and pipeline-registry count under Quotes active state
      return true;
    }
    
    return true; // For simple paths like /portal/dashboard or /portal/ledger
  };



  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#6C8295]/30 selection:text-white flex flex-col lg:flex-row">
      
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col ${isSidebarCollapsed ? 'w-16' : 'w-52 xl:w-56'} bg-muted/30 border-r border-border shrink-0 sticky top-0 h-screen z-40 transition-[width] duration-200`}>
        {/* Sidebar Header */}
        <div className={`p-4 border-b border-border flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && (
            <Link to="/portal/dashboard" className="flex items-center group min-w-0">
              <img src="/opus-form-primary.svg" alt="Opus Form" className="h-8 w-auto" />
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 text-[#888888] hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer shrink-0"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
 
        {/* Current Active User Profile Banner (Interactive) */}
        <Link
          to="/portal/settings"
          className={`${isSidebarCollapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3 space-x-3'} border-b border-border bg-muted/20 hover:bg-muted/40 transition-all flex items-center group cursor-pointer`}
          title={isSidebarCollapsed ? (profile?.full_name || user?.email || 'User') : undefined}
        >
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarPresetClass(profile?.avatar_url)} flex items-center justify-center border border-border shrink-0`}>
            {profile?.full_name ? (
              <span className="text-[11px] font-black tracking-wider text-white">
                {profile.full_name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            ) : (
              <UserIcon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            )}
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[12px] font-semibold text-foreground truncate group-hover:text-[#6C8295] transition-colors">
                {profile?.full_name || user?.email || 'User'}
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Shield className="w-3 h-3 text-[#10b981]" />
                <span className="text-[11px] text-[#10b981] capitalize font-medium">{role || 'operative'}</span>
              </div>
            </div>
          )}
        </Link>
 
        {/* Desktop Sidebar Navigation */}
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${isSidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const isActive = checkIsActive(item.path);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-2.5 rounded-lg text-[13px] font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-[#6C8295] text-white shadow-md'
                    : 'text-[#888888] hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-[#888888] group-hover:text-foreground'}`} />
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>
 
        {/* Sidebar Footer — Legal & Logout */}
        <div className={`border-t border-border bg-muted/20 ${isSidebarCollapsed ? 'p-2 space-y-1' : 'p-3 space-y-1'}`}>
          <NavLink
            to="/portal/privacy"
            title={isSidebarCollapsed ? 'Legal & Privacy' : undefined}
            className={`flex items-center w-full py-2 text-[11px] font-medium text-[#555558] hover:text-[#6C8295] rounded-lg transition-all ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 space-x-3'}`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            {!isSidebarCollapsed && <span className="tracking-wide">Legal & Privacy</span>}
          </NavLink>
          <button
            onClick={handleLogoutClick}
            title={isSidebarCollapsed ? 'Log Out' : undefined}
            className={`flex items-center w-full py-2.5 text-[13px] font-semibold text-[#888888] hover:text-foreground hover:bg-[#ef4444]/10 rounded-lg transition-all cursor-pointer ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3 hover:border-l-4 hover:border-[#ef4444]'}`}
          >
            {!isSidebarCollapsed && <span className="tracking-wide">Log Out</span>}
            <LogOut className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </aside>
 
      {/* Mobile Sticky Header */}
      <header className="lg:hidden flex items-center justify-between h-16 bg-muted/30 border-b border-border px-4 sticky top-0 z-40">
        <Link to="/portal/dashboard" className="flex items-center">
          <img src="/opus-form-primary.svg" alt="Opus Form" className="h-6 w-auto" />
        </Link>
        <div className="flex items-center space-x-2">
          {/* Audit Admin Logout for mobile */}
          {user?.email === 'admin@opusform.co.uk' && (
            <button 
              onClick={handleLogoutClick}
              className="p-2 text-[#888888] hover:text-foreground cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>
 
      {/* Mobile Slide-out Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-4/5 max-w-xs bg-card border-r border-border z-50 p-6 flex flex-col shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <Link to="/portal/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center">
                  <img src="/opus-form-primary.svg" alt="Opus Form" className="h-8 w-auto" />
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-[#9a9a9e] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="w-6 h-6" />
                </button>
              </div>
 
              {/* Mobile Drawer Profile (Interactive) */}
              <Link 
                to="/portal/settings" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="mb-6 p-3 rounded-lg bg-muted/60 border border-border flex items-center space-x-3 group hover:bg-muted transition-all cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarPresetClass(profile?.avatar_url)} flex items-center justify-center border border-border shrink-0`}>
                  {profile?.full_name ? (
                    <span className="text-[11px] font-black tracking-wider text-white">
                      {profile.full_name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  ) : (
                    <UserIcon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-foreground truncate group-hover:text-[#6C8295] transition-colors">
                    {profile?.full_name || user?.email || 'User'}
                  </span>
                  <span className="text-[11px] text-[#10b981] capitalize font-medium">{role || 'operative'}</span>
                </div>
              </Link>
 
              {/* Mobile Drawer Menu Links */}
              <nav className="space-y-1.5 flex-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = checkIsActive(item.path);
                  const Icon = item.icon;
                  return (
                    <NavLink 
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-[13px] font-semibold tracking-wide transition-colors min-h-[44px] ${
                        isActive 
                          ? 'bg-[#6C8295]/10 text-foreground border-l-4 border-[#6C8295]' 
                          : 'text-[#9a9a9e] hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
 
              <div className="mt-auto pt-4 border-t border-border">
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); handleLogoutClick(); }}
                  className="flex items-center justify-center space-x-3 w-full py-3 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/20 rounded-lg text-[13px] font-semibold text-foreground hover:text-white transition-all cursor-pointer min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
 
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="flex-1 w-full relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
