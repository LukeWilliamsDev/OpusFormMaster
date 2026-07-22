// @ts-nocheck
import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { ActiveJobLedger } from "../components/ActiveJobLedger";
import { JobDetails } from "../components/JobDetails";
import { Job } from "../types/erp";

const ARCHIVE_AFTER_DAYS = 30;

const isArchived = (job: Job) => {
  if (job.status !== "completed" || !job.updatedAt) return false;
  const daysSinceCompletion =
    (Date.now() - new Date(job.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCompletion > ARCHIVE_AFTER_DAYS;
};

export const JobLedgerPage: React.FC = () => {
  const { jobs, setJobs, workers, shifts, setShifts } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<Job["status"] | "all" | "archived">("all");
  const navigate = useNavigate();

  const selectedJobId = searchParams.get("jobId");
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
    setJobs((prevJobs) => prevJobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
  };

  const handleSelectJob = (id: string | null) => {
    if (id) {
      setSearchParams({ jobId: id });
    } else {
      setSearchParams({});
    }
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
      />
    );
  }

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-8 animate-fade-in">
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
