// @ts-nocheck
import React, { useState } from 'react';
import { Job, Worker } from '../types/erp';
import { RosterView } from './RosterView';
import { CalendarMatrix } from './CalendarMatrix';

interface LaborRosterCalendarProps {
  view: 'calendar' | 'staff';
  jobs: Job[];
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  onBack: () => void;
  onNavigate?: (view: 'calendar' | 'staff') => void;
  selectedWorkerId?: string | null;
  onSelectWorker?: (id: string | null) => void;
}

interface Shift {
  id: string;
  workerId: string;
  jobId: string;
  date: string; // YYYY-MM-DD
  isRemoved?: boolean;
}

export const LaborRosterCalendar: React.FC<LaborRosterCalendarProps> = ({ 
  view, 
  jobs, 
  workers, 
  setWorkers, 
  shifts, 
  setShifts, 
  onBack, 
  onNavigate,
  selectedWorkerId,
  onSelectWorker
}) => {
  
  // Interactive assignment active selections
  const [activeWorkerToAssign, setActiveWorkerToAssign] = useState<Worker | null>(null);

  const handleSetActiveWorkerToAssign = (w: Worker | null) => {
    setActiveWorkerToAssign(w);
  };

  return (
    <div className="space-y-6">
      {view !== 'staff' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a2a2a] pb-3 mb-4">
          <div className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-white">
            Calendar
          </div>
        </div>
      )}

      {/* Main Board Layout Panels depending on Active Tab */}
      {view === 'staff' ? (
        <RosterView 
          workers={workers}
          setWorkers={setWorkers}
          activeWorkerToAssign={activeWorkerToAssign}
          setActiveWorkerToAssign={handleSetActiveWorkerToAssign}
          setShifts={setShifts}
          shifts={shifts}
          jobs={jobs}
          selectedWorkerDetailsId={selectedWorkerId}
          setSelectedWorkerDetailsId={onSelectWorker}
        />
      ) : (
        <CalendarMatrix
          jobs={jobs}
          workers={workers}
          setWorkers={setWorkers}
          shifts={shifts}
          setShifts={setShifts}
          activeWorkerToAssign={activeWorkerToAssign}
          setActiveWorkerToAssign={setActiveWorkerToAssign}
        />
      )}
    </div>
  );
};
