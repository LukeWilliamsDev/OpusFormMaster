// @ts-nocheck
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePortal } from '../context/PortalContext';
import { LaborRosterCalendar } from '../components/LaborRosterCalendar';

export const LaborRosterPage: React.FC = () => {
  const { jobs, workers, setWorkers, shifts, setShifts } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentView = (searchParams.get('view') === 'staff') ? 'staff' : 'calendar';
  const selectedWorkerId = searchParams.get('workerId');

  const handleNavigate = (view: 'calendar' | 'staff') => {
    setSearchParams({ view });
  };

  const handleSelectWorker = (id: string | null) => {
    if (id) {
      setSearchParams({ view: 'staff', workerId: id });
    } else {
      setSearchParams({ view: 'staff' });
    }
  };

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto animate-fade-in">
      <LaborRosterCalendar 
        view={currentView}
        jobs={jobs}
        workers={workers}
        setWorkers={setWorkers}
        shifts={shifts}
        setShifts={setShifts}
        onBack={() => navigate('/portal/dashboard')}
        onNavigate={handleNavigate}
        selectedWorkerId={selectedWorkerId}
        onSelectWorker={handleSelectWorker}
      />
    </div>
  );
};
