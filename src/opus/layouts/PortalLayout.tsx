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
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePortal } from '../context/PortalContext';

export const PortalLayout: React.FC = () => {
  const { signOut, role, user } = usePortal();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    <div className="min-h-screen bg-[#111114] text-[#E4E4E7] font-sans selection:bg-[#6C8295]/30 selection:text-white flex flex-col lg:flex-row">
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-[#0c0c0f] border-r border-[#1e1e24] shrink-0 sticky top-0 h-screen z-40">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-[#1e1e24]">
          <Link to="/portal/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded bg-[#6C8295]/10 flex items-center justify-center border border-[#6C8295]/20 group-hover:border-[#6C8295]/50 transition-all duration-300">
              <span className="text-[#6C8295] font-archivo font-extrabold text-lg">O</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white font-archivo">OPUS FORM</span>
              <span className="text-[11px] font-medium text-brand-accent tracking-wider uppercase">ERP PORTAL</span>
            </div>
          </Link>
        </div>

        {/* Current Active User Profile Banner */}
        <div className="px-6 py-4 border-b border-[#1e1e24] bg-[#0c0c0f] flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#6C8295]/20 flex items-center justify-center border border-[#6C8295]/30">
            <UserIcon className="w-4 h-4 text-[#6C8295]" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-semibold text-white truncate">{user?.email || 'User'}</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <Shield className="w-3 h-3 text-[#10b981]" />
              <span className="text-[11px] text-[#10b981] capitalize font-medium">{role || 'operative'}</span>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = checkIsActive(item.path);
            const Icon = item.icon;
            return (
              <NavLink 
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-[13px] font-semibold tracking-wide transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#6C8295] text-white pl-3' 
                    : 'text-[#888888] hover:text-white hover:bg-[#16161a]'
                }`}
              >
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-[#888888] group-hover:text-white'}`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Logout Button */}
        <div className="p-4 border-t border-[#1e1e24] bg-[#0c0c0f]">
          <button 
            onClick={handleLogoutClick}
            className="flex items-center justify-between w-full px-4 py-3 text-[13px] font-semibold text-[#888888] hover:text-white hover:bg-[#ef4444]/10 hover:border-l-4 hover:border-[#ef4444] rounded-lg transition-all cursor-pointer"
          >
            <span className="tracking-wide">Log Out</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Sticky Header */}
      <header className="lg:hidden flex items-center justify-between h-16 bg-[#0c0c0f] border-b border-[#1e1e24] px-4 sticky top-0 z-40">
        <Link to="/portal/dashboard" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded bg-[#6C8295]/10 flex items-center justify-center border border-[#6C8295]/20">
            <span className="text-[#6C8295] font-archivo font-extrabold text-sm">O</span>
          </div>
          <span className="text-base font-bold tracking-tight text-white font-archivo">OPUS FORM</span>
        </Link>
        <div className="flex items-center space-x-2">
          {/* Audit Admin Logout for mobile */}
          {user?.email === 'admin@opusform.co.uk' && (
            <button 
              onClick={handleLogoutClick}
              className="p-2 text-[#888888] hover:text-white cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white hover:bg-[#2a2a30] rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
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
              className="fixed top-0 left-0 bottom-0 w-4/5 max-w-xs bg-[#1a1a1e] border-r border-[#2a2a30] z-50 p-6 flex flex-col shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2a2a30]">
                <Link to="/portal/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded bg-[#6C8295]/10 flex items-center justify-center border border-[#6C8295]/20">
                    <span className="text-[#6C8295] font-archivo font-extrabold text-sm">O</span>
                  </div>
                  <span className="text-base font-bold tracking-tight text-white font-archivo">OPUS FORM</span>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-[#9a9a9e] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Mobile Drawer Profile */}
              <div className="mb-6 p-3 rounded-lg bg-[#16161a]/60 border border-[#2a2a30] flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#6C8295]/20 flex items-center justify-center border border-[#6C8295]/30">
                  <UserIcon className="w-4 h-4 text-[#6C8295]" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-white truncate">{user?.email || 'User'}</span>
                  <span className="text-[11px] text-[#10b981] capitalize font-medium">{role || 'operative'}</span>
                </div>
              </div>

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
                          ? 'bg-[#6C8295]/10 text-white border-l-4 border-[#6C8295]' 
                          : 'text-[#9a9a9e] hover:text-white hover:bg-[#16161a]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="mt-auto pt-4 border-t border-[#2a2a30]">
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); handleLogoutClick(); }}
                  className="flex items-center justify-center space-x-3 w-full py-3 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/20 rounded-lg text-[13px] font-semibold text-white transition-all cursor-pointer min-h-[44px]"
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
      <main className="flex-1 flex flex-col min-h-0 bg-[#111114]">
        <div className="flex-1 w-full relative">
          <Outlet />
        </div>

      </main>
    </div>
  );
};
