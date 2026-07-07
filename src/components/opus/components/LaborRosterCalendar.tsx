import React, { useState } from 'react';
import { 
  Users,   Calendar,   Search,   Plus,   Trash2,   ShieldAlert,   CheckCircle,   AlertTriangle,   ChevronLeft,   Clock,   MapPin,   UserPlus,  UserCheck,  X,  Phone,  FileText,  UploadCloud,  Download,  FilePlus
} from 'lucide-react';
import { Job, Worker, Ticket } from '../types/erp';
import { validateWorkerForDeployment } from '../utils/workerValidation';
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
}

interface Shift {
  id: string;
  workerId: string;
  jobId: string;
  date: string; // YYYY-MM-DD
  isRemoved?: boolean;
}

const getWeekDays = (offset: number) => {
  const baseDate = new Date('2026-07-06T00:00:00Z');
  baseDate.setDate(baseDate.getDate() + (offset * 7));
  
  const days = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const shortNames = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  
  for (let i = 0; i < 5; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    days.push({
      dayName: dayNames[i],
      date: d.toISOString().split('T')[0],
      shortName: shortNames[i]
    });
  }
  return days;
};

export const LaborRosterCalendar: React.FC<LaborRosterCalendarProps> = ({ view, jobs, workers, setWorkers, shifts, setShifts, onBack, onNavigate }) => {
  
  // Interactive assignment active selections
  const [activeWorkerToAssign, setActiveWorkerToAssign] = useState<Worker | null>(null);
  
  // View states for ultimate responsive control
  const [selectedMobileDay, setSelectedMobileDay] = useState<string>('2026-07-06');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const WEEK_DAYS = getWeekDays(weekOffset);

  const handleSetActiveWorkerToAssign = (w: Worker | null) => {
    setActiveWorkerToAssign(w);
    
  };

  // Assign worker helper
  const handleAssignWorker = (workerId: string, jobId: string, date: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    // Check if they are already assigned here
    const alreadyAssigned = shifts.some(s => s.workerId === workerId && s.jobId === jobId && s.date === date);
    if (alreadyAssigned) return;

    // Validate tickets
    const job = jobs.find(j => j.id === jobId);
    const validation = validateWorkerForDeployment(worker, worker.role);
    if (!validation.isValid) {
      alert(`DEPLOYMENT BLOCKED: ${worker.name} cannot be assigned. Reason: ${validation.reason}`);
      return;
    }

    // Check if worker is already assigned to a DIFFERENT job on this exact day
    const busyElsewhere = shifts.find(s => s.workerId === workerId && s.date === date);
    if (busyElsewhere) {
      const otherJob = jobs.find(j => j.id === busyElsewhere.jobId);
      if (!confirm(`${worker.name} is already deployed to "${otherJob?.siteName || 'Another project'}" on this day. Reallocate to this project?`)) {
        return;
      }
      // Remove previous assignment on this day
      setShifts(prev => prev.filter(s => s.id !== busyElsewhere.id));
    }

    // Add new shift
    const newShift: Shift = {
      id: `shift-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      workerId,
      jobId,
      date
    };
    setShifts(prev => [...prev, newShift]);
    
    // Auto-clear active selection after assignment to make it fluid
    setActiveWorkerToAssign(null);
  };

  const handleAssignWorkerFullWeek = (workerId: string, jobId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    // Validate tickets
    const validation = validateWorkerForDeployment(worker, worker.role);
    if (!validation.isValid) {
      alert(`DEPLOYMENT BLOCKED: ${worker.name} cannot be assigned. Reason: ${validation.reason}`);
      return;
    }

    const conflictDays: string[] = [];
    WEEK_DAYS.forEach(day => {
      const busyElsewhere = shifts.find(s => s.workerId === workerId && s.jobId !== jobId && s.date === day.date);
      if (busyElsewhere) {
        const otherJob = jobs.find(j => j.id === busyElsewhere.jobId);
        conflictDays.push(`${day.shortName} (${otherJob?.siteName || 'Other job'})`);
      }
    });

    if (conflictDays.length > 0) {
      if (!confirm(`${worker.name} has existing deployments on:\n${conflictDays.join('\n')}\n\nDo you want to clear these and assign to this project for the entire week?`)) {
        return;
      }
    }

    setShifts(prev => {
      // Filter out this worker's existing shifts for the week
      let cleaned = prev.filter(s => !(s.workerId === workerId && WEEK_DAYS.some(d => d.date === s.date)));
      
      // Create new shifts for each day of the week
      const newShifts = WEEK_DAYS.map(day => ({
        id: `shift-${Date.now()}-${day.date}-${Math.random().toString(36).substr(2, 5)}`,
        workerId,
        jobId,
        date: day.date
      }));
      
      return [...cleaned, ...newShifts];
    });
    
    setActiveWorkerToAssign(null);
  };

  const handleRemoveShift = (shift: Shift) => {
    if (shift.id.startsWith('job-assigned-')) {
      // It's an implicit shift from job.assignedWorkers, so we create an explicit 'removed' shift
      setShifts(prev => [
        ...prev,
        {
          id: `removed-${shift.workerId}-${shift.jobId}-${shift.date}`,
          workerId: shift.workerId,
          jobId: shift.jobId,
          date: shift.date,
          isRemoved: true
        }
      ]);
    } else {
      // It's an explicit shift, just remove it
      setShifts(prev => prev.filter(s => s.id !== shift.id));
    }
  };

  const handleDeleteWorker = (workerId: string) => {
    setWorkers(prev => prev.filter(w => w.id !== workerId));
    setShifts(prev => prev.filter(s => s.workerId !== workerId));
  };

  const handleEditWorker = (updatedWorker: Worker) => {
    setWorkers(prev => prev.map(w => w.id === updatedWorker.id ? updatedWorker : w));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a2a2a] pb-3 mb-4">
        <div className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-white">
          <div className="w-1 h-4 bg-[#b0b8c4] rounded-sm" />
          {view === 'staff' ? 'Staff' : 'Calendar'}
        </div>
      </div>

      {/* Roster Selection Mode Hint Banner (Active Assignee) */}
      

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
        />
      ) : (
        <CalendarMatrix
          jobs={jobs}
          workers={workers}
          shifts={shifts}
          setShifts={setShifts}
          activeWorkerToAssign={activeWorkerToAssign}
          setActiveWorkerToAssign={setActiveWorkerToAssign}
          WEEK_DAYS={WEEK_DAYS}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          selectedMobileDay={selectedMobileDay}
          setSelectedMobileDay={setSelectedMobileDay}
          handleAssignWorker={handleAssignWorker}
          handleAssignWorkerFullWeek={handleAssignWorkerFullWeek}
          handleRemoveShift={handleRemoveShift}
          handleDeleteWorker={handleDeleteWorker}
          handleEditWorker={handleEditWorker}
        />
      )}
    </div>
  );
};
