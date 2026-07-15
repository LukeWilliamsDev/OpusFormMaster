// @ts-nocheck
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePortal } from '../context/PortalContext';
import { RosterView } from '../components/RosterView';
import { CalendarBoard, CalendarGroup } from '../components/calendar/CalendarBoard';
import { defaultSelectedDay, isValidISODate } from '../utils/week';

export const LaborRosterPage: React.FC = () => {
  const { jobs, workers, setWorkers, shifts, setShifts } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentView = (searchParams.get('view') === 'staff') ? 'staff' : 'calendar';
  const selectedWorkerId = searchParams.get('workerId');
  const group: CalendarGroup = (searchParams.get('group') === 'project') ? 'project' : 'staff';
  const dateParam = searchParams.get('date');
  const selectedDate = isValidISODate(dateParam) ? dateParam : defaultSelectedDay();

  const handleSelectWorker = (id: string | null) => {
    if (id) {
      setSearchParams({ view: 'staff', workerId: id });
    } else {
      setSearchParams({ view: 'staff' });
    }
  };

  const handleChangeGroup = (nextGroup: CalendarGroup) => {
    setSearchParams({ view: 'calendar', group: nextGroup, date: selectedDate });
  };

  const handleChangeDate = (nextDate: string) => {
    // replace: day/week navigation shouldn't pollute back-button history
    setSearchParams({ view: 'calendar', group, date: nextDate }, { replace: true });
  };

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto animate-fade-in space-y-6">
      {currentView === 'staff' ? (
        <RosterView
          workers={workers}
          setWorkers={setWorkers}
          setShifts={setShifts}
          shifts={shifts}
          jobs={jobs}
          selectedWorkerDetailsId={selectedWorkerId}
          setSelectedWorkerDetailsId={handleSelectWorker}
        />
      ) : (
        <CalendarBoard
          jobs={jobs}
          workers={workers}
          shifts={shifts}
          setShifts={setShifts}
          group={group}
          date={selectedDate}
          onChangeGroup={handleChangeGroup}
          onChangeDate={handleChangeDate}
        />
      )}
    </div>
  );
};
