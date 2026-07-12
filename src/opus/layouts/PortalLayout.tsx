// @ts-nocheck
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  LogOut, 
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePortal } from '../context/PortalContext';

export const PortalLayout: React.FC = () => {
  const { signOut, role } = usePortal();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoutClick = async () => {
    await signOut();
    navigate('/portal');
  };

  const allNav = [
    { name: 'Dashboard', path: '/portal/dashboard', roles: ['admin', 'dispatcher'] },
    { name: 'Job Ledger', path: '/portal/ledger', roles: ['admin', 'dispatcher'] },
    { name: 'Calendar', path: '/portal/roster?view=calendar', roles: ['admin', 'dispatcher', 'operative'] },
    { name: 'Staff', path: '/portal/roster?view=staff', roles: ['admin', 'dispatcher'] },
    { name: 'Quote', path: '/portal/pipeline?view=quote-builder', roles: ['admin', 'dispatcher'] },
    { name: 'Quote Management', path: '/portal/pipeline?view=pipeline-registry', roles: ['admin', 'dispatcher'] },
  ];
  const navItems = allNav.filter(item => !role || item.roles.includes(role));

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
      const currentView = params.get('view') || 'pipeline-registry';
      const itemView = itemParams.get('view') || 'pipeline-registry';
      return currentView === itemView;
    }
    
    return true; // For simple paths like /portal/dashboard or /portal/ledger
  };

  return (
    <div className="min-h-screen bg-[#1A1B1E] text-brand-white font-sans selection:bg-brand-accent/30 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#1A1B1E] border-b border-white/5 z-50 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/portal/dashboard" className="flex items-center group cursor-pointer">
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter leading-none transition-colors group-hover:text-brand-accent font-archivo uppercase">OPUS FORM</span>
                <div className="h-0.5 w-full bg-brand-accent mt-1"></div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6">
              {navItems.map((item) => {
                const isActive = checkIsActive(item.path);
                return (
                  <NavLink 
                    key={item.name}
                    to={item.path}
                    end={item.path === '/portal/dashboard' || item.path === '/portal/ledger'}
                    className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                      isActive ? 'text-brand-accent' : 'text-brand-white/70 hover:text-brand-white'
                    }`}
                  >
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            
            <button 
              onClick={handleLogoutClick}
              className="hidden lg:flex items-center space-x-2 px-4 py-2 border border-white/10 rounded hover:bg-white/5 transition-all group active:scale-95 cursor-pointer"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-brand-white">Terminate Session</span>
              <LogOut className="w-4 h-4 text-white/40 group-hover:text-brand-white" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-brand-white hover:bg-white/5 rounded transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-3/4 max-w-sm bg-[#1A1B1E] border-l border-white/5 z-[70] lg:hidden p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <Link to="/portal/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center group cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-xl font-black tracking-tighter leading-none font-archivo uppercase">OPUS FORM</span>
                    <div className="h-0.5 w-full bg-brand-accent mt-1"></div>
                  </div>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white/40 cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 flex-1">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Main Menu</p>
                  {navItems.map((item) => {
                    const isActive = checkIsActive(item.path);
                    return (
                      <NavLink 
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        end={item.path === '/portal/dashboard' || item.path === '/portal/ledger'}
                        className={`block w-full text-left py-3 text-sm font-bold uppercase tracking-widest border-b border-white/5 transition-colors ${
                          isActive ? 'text-brand-accent' : 'text-white/40 hover:text-white'
                        }`}
                      >
                        {item.name}
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              <div className="mt-auto space-y-2 w-full">
                
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); handleLogoutClick(); }}
                  className="flex items-center justify-center space-x-3 w-full py-4 border border-white/10 rounded text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Terminate Session</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
};
