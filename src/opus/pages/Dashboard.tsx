// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList,
  Target,
  Truck,
  UserCheck,
  TrendingUp
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { ExpiryRadar } from '../components/ExpiryRadar';

export const DashboardPage: React.FC = () => {
  const { workers, jobs } = usePortal();
  const navigate = useNavigate();

  const expiringTickets = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const list: {
      workerId: string;
      workerName: string;
      workerRole: string;
      ticketId: string;
      ticketType: string;
      expiryDate: string;
      ticketNumber: string;
      diffDays: number;
      isExpired: boolean;
      isExpiringSoon: boolean;
    }[] = [];
    
    workers.forEach(worker => {
      worker.tickets?.forEach(ticket => {
        const expiry = new Date(ticket.expiryDate);
        expiry.setHours(0, 0, 0, 0);
        
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const isExpired = diffDays < 0;
        const isExpiringSoon = diffDays >= 0 && diffDays <= 30;
        
        if (isExpired || isExpiringSoon) {
          list.push({
            workerId: worker.id,
            workerName: worker.name,
            workerRole: worker.role,
            ticketId: ticket.id,
            ticketType: ticket.type,
            expiryDate: ticket.expiryDate,
            ticketNumber: ticket.ticketNumber,
            diffDays,
            isExpired,
            isExpiringSoon
          });
        }
      });
    });
    
    return list.sort((a, b) => a.diffDays - b.diffDays);
  }, [workers]);

  const metrics = [
    { label: 'Active Projects', value: jobs.filter(j => j.status === 'in-progress' || j.status === 'active').length.toString(), icon: ClipboardList, color: 'text-brand-accent' },
    { label: 'Total Projects', value: jobs.length.toString(), icon: Target, color: 'text-white' },
    { label: 'Active Crew Count', value: workers.length.toString(), icon: UserCheck, color: 'text-amber-500' },
  ];

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div 
              key={metric.label}
              className="bg-[#1e1e20] border border-white/5 rounded-xl p-5 flex items-center justify-between hover:border-brand-accent/20 transition-all duration-300"
            >
              <div className="space-y-1">
                <p className="text-[9px] font-black text-brand-white/30 uppercase tracking-widest">{metric.label}</p>
                <p className="text-xl sm:text-2xl font-black text-brand-white font-archivo tracking-tight">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-white/5 ${metric.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Expiry Radar and Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Expiry Radar Widget */}
        <div className="lg:col-span-2">
          <ExpiryRadar 
            expiringTickets={expiringTickets} 
            onSelectWorker={(workerId) => {
              navigate(`/portal/roster?view=staff&workerId=${workerId}`);
            }}
          />
        </div>

        {/* Right Column: Portal Directories / Shortcuts */}
        <div className="bg-[#1e1e20] border border-white/5 rounded-xl p-6 flex flex-col">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-white/30 mb-6">
              <TrendingUp className="w-4 h-4 text-brand-accent" />
              <span>Rapid Gateway</span>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/portal/ledger')}
                className="w-full text-left p-4 rounded-lg bg-[#252528] border border-white/5 hover:border-brand-accent/30 hover:bg-[#28282b] transition-all group flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-white group-hover:text-brand-accent transition-colors">
                    Job Ledger
                  </h3>
                  <p className="text-[9px] text-brand-white/40 uppercase font-bold tracking-wider mt-1">
                    Manage active pours, site scopes & rates
                  </p>
                </div>
                <div className="text-brand-white/20 group-hover:text-brand-white transition-colors">&rarr;</div>
              </button>

              <button
                onClick={() => navigate('/portal/roster?view=calendar')}
                className="w-full text-left p-4 rounded-lg bg-[#252528] border border-white/5 hover:border-brand-accent/30 hover:bg-[#28282b] transition-all group flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-white group-hover:text-brand-accent transition-colors">
                    Labor Calendar
                  </h3>
                  <p className="text-[9px] text-brand-white/40 uppercase font-bold tracking-wider mt-1">
                    Drag-and-drop worker scheduling matrix
                  </p>
                </div>
                <div className="text-brand-white/20 group-hover:text-brand-white transition-colors">&rarr;</div>
              </button>

              <button
                onClick={() => navigate('/portal/pipeline?view=quote-builder')}
                className="w-full text-left p-4 rounded-lg bg-[#252528] border border-white/5 hover:border-brand-accent/30 hover:bg-[#28282b] transition-all group flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-white group-hover:text-brand-accent transition-colors">
                    Estimate Builder
                  </h3>
                  <p className="text-[9px] text-brand-white/40 uppercase font-bold tracking-wider mt-1">
                    Generate professional tenders and DRS quotes
                  </p>
                </div>
                <div className="text-brand-white/20 group-hover:text-brand-white transition-colors">&rarr;</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
