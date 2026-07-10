import React, { createContext, useContext, useState, useEffect } from 'react';
import { Job, Worker, ScheduledShift } from '../types/erp';
import { INITIAL_ROSTER, INITIAL_SHIFTS } from '../data/roster';

const INITIAL_JOBS: Job[] = [
  { id: '1', jobRef: 'OP-4921-X', siteName: 'Riverside Phase 2', mainContractor: 'Balfour Beatty', postcode: 'SW1A 1AA', currentPours: 5, contractMaxPours: 4, status: 'in-progress', scheduleValue: 42500 },
  { id: '2', jobRef: 'OP-5102-Y', siteName: 'Oakwood Grounds', mainContractor: 'Laing O\'Rourke', postcode: 'M1 1AE', currentPours: 2, contractMaxPours: 6, status: 'pending', scheduleValue: 18200 },
  { id: '3', jobRef: 'OP-3884-Z', siteName: 'Brentwood Hub', mainContractor: 'Kier Group', postcode: 'CM14 4BA', currentPours: 8, contractMaxPours: 8, status: 'completed', scheduleValue: 65400 },
  { id: '4', jobRef: 'OP-2291-A', siteName: 'Central Square', mainContractor: 'Skanska', postcode: 'B1 1BB', currentPours: 1, contractMaxPours: 10, status: 'in-progress', scheduleValue: 89000 },
  { id: '5', jobRef: 'OP-9921-B', siteName: 'Marina Development', mainContractor: 'Morgan Sindall', postcode: 'EH1 1YZ', currentPours: 12, contractMaxPours: 10, status: 'in-progress', scheduleValue: 54000 },
];

interface PortalContextType {
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  shifts: ScheduledShift[];
  setShifts: React.Dispatch<React.SetStateAction<ScheduledShift[]>>;
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  handleReloadDemoData: () => void;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('opus_authenticated') === 'true';
    }
    return false;
  });

  const [workers, setWorkers] = useState<Worker[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('opus_workers');
      return stored ? JSON.parse(stored) : INITIAL_ROSTER;
    }
    return INITIAL_ROSTER;
  });

  const [shifts, setShifts] = useState<ScheduledShift[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('opus_shifts');
      return stored ? JSON.parse(stored) : INITIAL_SHIFTS;
    }
    return INITIAL_SHIFTS;
  });

  const [jobs, setJobs] = useState<Job[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('opus_jobs');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse jobs', e);
        }
      }
    }
    return INITIAL_JOBS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('opus_workers', JSON.stringify(workers));
    }
  }, [workers]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('opus_shifts', JSON.stringify(shifts));
    }
  }, [shifts]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('opus_jobs', JSON.stringify(jobs));
    }
  }, [jobs]);

  // Proactive automatic upgrade for legacy/small mock data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('opus_shifts');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length < 10) {
            localStorage.setItem('opus_shifts', JSON.stringify(INITIAL_SHIFTS));
            setShifts(INITIAL_SHIFTS);
            localStorage.setItem('opus_jobs', JSON.stringify(INITIAL_JOBS));
            setJobs(INITIAL_JOBS);
          }
        } catch (e) {
          console.error('Failed to parse stored shifts for upgrade check', e);
        }
      }
    }
  }, []);

  const handleReloadDemoData = () => {
    if (window.confirm("Are you sure you want to restore the default active jobs, full crew list, and rich deployment histories? This will replace your current browser session state.")) {
      localStorage.removeItem('opus_workers');
      localStorage.removeItem('opus_shifts');
      localStorage.removeItem('opus_jobs');
      setWorkers(INITIAL_ROSTER);
      setShifts(INITIAL_SHIFTS);
      setJobs(INITIAL_JOBS);
      alert("Demo dataset successfully loaded! Explore the staff profiles to view active deployments and the new 'Deployment History' records.");
    }
  };

  const login = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('opus_authenticated', 'true');
    }
    setIsAuthenticated(true);
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('opus_authenticated');
    }
    setIsAuthenticated(false);
  };

  return (
    <PortalContext.Provider value={{
      workers,
      setWorkers,
      shifts,
      setShifts,
      jobs,
      setJobs,
      handleReloadDemoData,
      isAuthenticated,
      login,
      logout
    }}>
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};
