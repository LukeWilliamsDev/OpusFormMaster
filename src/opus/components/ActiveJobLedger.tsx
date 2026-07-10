// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudSun, AlertCircle, ChevronRight } from 'lucide-react';
import { Job } from '../types/erp';

interface ActiveJobLedgerProps {
  filteredJobs: Job[];
  filterStatus: Job['status'] | 'all';
  setFilterStatus: (status: Job['status'] | 'all') => void;
  onSelectJob: (id: string) => void;
  getJobActionRequired: (job: Job) => {
    hasAction: boolean;
    weather: { condition: string; temperature: number } | null;
    followup: { reason: string } | null;
  };
}

export const ActiveJobLedger: React.FC<ActiveJobLedgerProps> = ({
  filteredJobs,
  filterStatus,
  setFilterStatus,
  onSelectJob,
  getJobActionRequired
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-[#2a2a2a] pb-3">
        <div className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-white font-archivo">
          <div className="w-1 h-4 bg-[#b0b8c4] rounded-sm" />
          Job Ledger
        </div>
        <div className="w-full sm:w-auto">
          <div className="flex flex-wrap items-center bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-1 gap-1 shadow-inner">
            {(['all', 'in-progress', 'pending', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded-md px-3 py-1.5 text-[9px] font-black tracking-widest uppercase whitespace-nowrap transition-all duration-200 ${
                  filterStatus === status 
                    ? 'bg-[#333] text-white shadow-md border border-[#444]' 
                    : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                }`}
              >
                {status.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl">
        {/* Table Header - hidden on mobile, shown on tablet/desktop */}
        <div className="hidden md:grid md:grid-cols-[120px_2.5fr_1.5fr_140px] gap-4 px-4 py-3 border-b border-[#2e2e2e] bg-[#222]">
          <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400">Job Ref</span>
          <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400">Site / Contractor</span>
          <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400">Site Warnings</span>
          <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400 text-right">Job Status</span>
        </div>

        <div className="divide-y divide-[#2e2e2e]">
          <AnimatePresence mode="popLayout">
            {filteredJobs.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
                No active jobs found
              </div>
            ) : (
              filteredJobs.map((job) => {
                const action = getJobActionRequired(job);
                return (
                  <motion.div 
                    key={job.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    layout
                    onClick={() => onSelectJob(job.id)}
                    className="group flex flex-col md:grid md:grid-cols-[120px_2.5fr_1.5fr_140px] gap-4 px-4 py-4 md:py-0 md:min-h-[64px] items-center hover:bg-[#242424] transition-colors duration-150 cursor-pointer"
                  >
                    {/* Job Ref */}
                    <div className="flex justify-between items-center w-full md:w-auto md:contents">
                      <div className="text-xs font-mono font-semibold text-[#8a9bb0] group-hover:text-white transition-colors text-left">
                        {job.jobRef}
                      </div>
                      {/* Mobile-only status badge */}
                      <div className="md:hidden">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[8px] font-black tracking-widest uppercase border ${
                          job.status === 'in-progress' ? 'bg-[#1e2a3a]/80 border-[#2a4060] text-[#6090c0]' :
                          job.status === 'pending' ? 'bg-[#2a2a1e]/80 border-[#44440a] text-[#888844]' :
                          'bg-[#1a2e1a]/80 border-[#2a5a2a] text-[#4a9a4a]'
                        }`}>
                          {job.status === 'in-progress' ? 'In Progress' : job.status}
                        </span>
                      </div>
                    </div>

                    {/* Site / Contractor */}
                    <div className="w-full md:w-auto space-y-1 py-1.5">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                          {job.siteName}
                        </div>
                        <div className="text-xs font-medium text-gray-400">
                          {job.mainContractor}
                        </div>
                      </div>
                      {/* Mobile Action Required Badges */}
                      <div className="md:hidden flex flex-wrap items-center gap-1.5 mt-2">
                        {(action.weather || action.followup) && (
                          <>
                            {action.weather && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#3a2024]/40 px-1.5 py-0.5 border border-[#ff8591]/20 text-[8.5px] font-black tracking-widest uppercase text-[#ff8591]">
                                <CloudSun className="w-2.5 h-2.5" />
                                {action.weather.condition} ({action.weather.temperature}°C)
                              </span>
                            )}
                            {action.followup && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#3a2e20]/40 px-1.5 py-0.5 border border-[#f59e0b]/20 text-[8.5px] font-black tracking-widest uppercase text-[#f59e0b]">
                                <AlertCircle className="w-2.5 h-2.5" />
                                {action.followup.reason}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Desktop Action Required Badges Column */}
                    <div className="hidden md:flex flex-col items-start justify-center gap-1.5 py-1 w-full text-left">
                      {(action.weather || action.followup) && (
                        <>
                          {action.weather && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#3a2024]/40 px-1.5 py-0.5 border border-[#ff8591]/20 text-[8.5px] font-black tracking-widest uppercase text-[#ff8591] shrink-0">
                              <CloudSun className="w-2.5 h-2.5" />
                              <span>{action.weather.condition} ({action.weather.temperature}°C)</span>
                            </span>
                          )}
                          {action.followup && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#3a2e20]/40 px-1.5 py-0.5 border border-[#f59e0b]/20 text-[8.5px] font-black tracking-widest uppercase text-[#f59e0b] shrink-0">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>{action.followup.reason}</span>
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Job Status (Desktop/Tablet-only) */}
                    <div className="hidden md:block text-right">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[8.5px] font-black tracking-widest uppercase border ${
                        job.status === 'in-progress' ? 'bg-[#1e2a3a]/80 border-[#3a5a8a] text-[#8ab4f8] shadow-[0_0_10px_rgba(138,180,248,0.1)]' :
                        job.status === 'pending' ? 'bg-[#2a2a1e]/80 border-[#66661a] text-[#c0c040] shadow-[0_0_10px_rgba(192,192,64,0.1)]' :
                        'bg-[#1a2e1a]/80 border-[#3a7a3a] text-[#81c995] shadow-[0_0_10px_rgba(129,201,149,0.1)]'
                      }`}>
                        {job.status === 'in-progress' ? 'In Progress' : job.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
