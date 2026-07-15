// @ts-nocheck
import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { ActiveJobLedger } from "../components/ActiveJobLedger";
import { JobDetails } from "../components/JobDetails";
import { getWeatherForJob } from "../utils/weather";
import { Job } from "../types/erp";

export const JobLedgerPage: React.FC = () => {
  const { jobs, setJobs, workers } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<Job["status"] | "all">("all");
  const navigate = useNavigate();

  const selectedJobId = searchParams.get("jobId");

  const followups = [
    { name: "Riverside P2", keyword: "Riverside", fallbackId: "1", reason: "Site Access Auth" },
    { name: "Marina Dev", keyword: "Marina", fallbackId: "5", reason: "Design Variation" },
    { name: "Oakwood Hub", keyword: "Oakwood", fallbackId: "2", reason: "Materials Delay" },
  ];

  const getJobActionRequired = (job: Job) => {
    const weather = getWeatherForJob(job);
    const followup = followups.find((f) =>
      job.siteName.toLowerCase().includes(f.keyword.toLowerCase()),
    );

    if (weather.isImpactful || followup) {
      return {
        hasAction: true,
        weather: weather.isImpactful ? weather : null,
        followup: followup || null,
      };
    }
    return { hasAction: false, weather: null, followup: null };
  };

  const filteredJobs = jobs.filter((job) => filterStatus === "all" || job.status === filterStatus);

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
    return (
      <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-6 animate-fade-in">
        <JobDetails
          job={jobs.find((j) => j.id === selectedJobId)!}
          workers={workers}
          onBack={() => handleSelectJob(null)}
          onUpdateJob={handleUpdateJob}
        />
      </div>
    );
  }

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-8 animate-fade-in">
      <ActiveJobLedger
        filteredJobs={filteredJobs}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onSelectJob={handleSelectJob}
        getJobActionRequired={getJobActionRequired}
      />
    </div>
  );
};
