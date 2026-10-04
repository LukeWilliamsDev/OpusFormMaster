import React from "react";
import { useSearchParams } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { ASSIGNED_SHIFT_ROLES, MANAGEMENT_WRITE_ROLES } from "../context/PortalContext";
import { RosterView } from "../components/RosterView";
import { CalendarBoard, CalendarGroup } from "../components/calendar/CalendarBoard";
import { defaultSelectedDay, isValidISODate } from "../utils/week";
import { MyShiftsPage } from "./MyShiftsPage";

export const LaborRosterPage: React.FC = () => {
  const { jobs, workers, setWorkers, shifts, setShifts, role } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();

  if (role && ASSIGNED_SHIFT_ROLES.includes(role)) {
    return <MyShiftsPage />;
  }

  const requestedView = searchParams.get("view") === "staff" ? "staff" : "calendar";
  const currentView = requestedView;
  const selectedWorkerId = searchParams.get("workerId");
  const initialDossierTab = searchParams.get("tab") === "assignments" ? "assignments" : undefined;
  const autoOpenAddWorker = searchParams.get("addWorker") === "1";
  const group: CalendarGroup = searchParams.get("group") === "staff" ? "staff" : "project";
  const dateParam = searchParams.get("date");
  const selectedDate = isValidISODate(dateParam) ? dateParam : defaultSelectedDay();

  const handleSelectWorker = (id: string | null) => {
    if (id) {
      setSearchParams({ view: "staff", workerId: id });
    } else {
      setSearchParams({ view: "staff" });
    }
  };

  const handleChangeGroup = (nextGroup: CalendarGroup) => {
    setSearchParams({ view: "calendar", group: nextGroup, date: selectedDate });
  };

  const handleChangeDate = (nextDate: string) => {
    // replace: day/week navigation shouldn't pollute back-button history
    setSearchParams({ view: "calendar", group, date: nextDate }, { replace: true });
  };

  return (
    <div className="portal-page-container animate-fade-in space-y-6 py-6 lg:py-8">
      {currentView === "staff" ? (
        <RosterView
          workers={workers}
          setWorkers={setWorkers}
          setShifts={setShifts}
          shifts={shifts}
          jobs={jobs}
          selectedWorkerDetailsId={selectedWorkerId}
          setSelectedWorkerDetailsId={handleSelectWorker}
          autoOpenAddWorker={autoOpenAddWorker}
          initialDossierTab={initialDossierTab}
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
          canEdit={!!role && MANAGEMENT_WRITE_ROLES.includes(role)}
        />
      )}
    </div>
  );
};
