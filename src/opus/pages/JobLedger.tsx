import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MANAGEMENT_WRITE_ROLES, usePortal } from "../context/PortalContext";
import { ActiveJobLedger } from "../components/ActiveJobLedger";
import { JobDetails } from "../components/JobDetails";
import { Job } from "../types/erp";

const ARCHIVE_AFTER_DAYS = 30;
const JOB_FILTERS = ["all", "in-progress", "pending", "completed", "archived"] as const;
type JobFilter = (typeof JOB_FILTERS)[number];
const isJobFilter = (value: string | null): value is JobFilter =>
  value !== null && JOB_FILTERS.includes(value as JobFilter);

const isArchived = (job: Job) => {
  if (job.status !== "completed" || !job.updatedAt) return false;
  const daysSinceCompletion =
    (Date.now() - new Date(job.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCompletion > ARCHIVE_AFTER_DAYS;
};

export const JobLedgerPage: React.FC = () => {
  const { jobs, setJobs, workers, shifts, setShifts, role } = usePortal();
  const canWrite = role ? MANAGEMENT_WRITE_ROLES.includes(role) : false;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedJobId = searchParams.get("jobId");
  const requestedFilter = searchParams.get("filter");
  const filterStatus: JobFilter = isJobFilter(requestedFilter) ? requestedFilter : "all";

  useEffect(() => {
    if (!requestedFilter || isJobFilter(requestedFilter)) return;
    setSearchParams(
      (current) => {
        current.delete("filter");
        return current;
      },
      { replace: true },
    );
  }, [requestedFilter, setSearchParams]);

  const setFilterStatus = (nextFilter: Job["status"] | "all" | "archived") => {
    const normalizedFilter = isJobFilter(nextFilter) ? nextFilter : "all";
    setSearchParams((current) => {
      if (normalizedFilter === "all") current.delete("filter");
      else current.set("filter", normalizedFilter);
      return current;
    });
  };
  const fromStaff = searchParams.get("from") === "staff";
  const originWorkerId = searchParams.get("workerId");

  const followups = [
    { name: "Riverside P2", keyword: "Riverside", fallbackId: "1", reason: "Site Access Auth" },
    { name: "Marina Dev", keyword: "Marina", fallbackId: "5", reason: "Design Variation" },
    { name: "Oakwood Hub", keyword: "Oakwood", fallbackId: "2", reason: "Materials Delay" },
  ];

  const getJobFollowup = (job: Job) =>
    followups.find((f) => job.siteName.toLowerCase().includes(f.keyword.toLowerCase())) || null;

  const filteredJobs = jobs.filter((job) => {
    if (filterStatus === "archived") return isArchived(job);
    if (filterStatus === "all") return !isArchived(job);
    if (filterStatus === "completed") return job.status === "completed" && !isArchived(job);
    return job.status === filterStatus;
  });

  const handleUpdateJob = (updatedJob: Job) => {
    if (!canWrite) return;
    setJobs((prevJobs) => prevJobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
  };

  const handleSelectJob = (id: string | null) => {
    setSearchParams((current) => {
      if (id) current.set("jobId", id);
      else current.delete("jobId");
      return current;
    });
  };

  // If a jobId is selected, render the Job Details in full-page mode instead of the ledger grid list.
  if (selectedJobId && jobs.find((j) => j.id === selectedJobId)) {
    // JobDetails is self-contained (own padding, max-width, min-h-screen) —
    // no outer wrapper here, or its padding stacks with JobDetails' own and
    // wastes a chunk of vertical space above the header.
    return (
      <JobDetails
        job={jobs.find((j) => j.id === selectedJobId)!}
        workers={workers}
        allJobs={jobs}
        shifts={shifts}
        setShifts={setShifts}
        onBack={() =>
          fromStaff && originWorkerId
            ? navigate(`/portal/roster?view=staff&workerId=${originWorkerId}&tab=assignments`)
            : handleSelectJob(null)
        }
        backLabel={fromStaff && originWorkerId ? "Return to Staff Record" : "Job Ledger"}
        onUpdateJob={handleUpdateJob}
        readOnly={!canWrite}
      />
    );
  }

  return (
    <div className="portal-page-container space-y-8 py-6 animate-fade-in lg:py-8">
      <ActiveJobLedger
        filteredJobs={filteredJobs}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onSelectJob={handleSelectJob}
        getJobFollowup={getJobFollowup}
      />
    </div>
  );
};
