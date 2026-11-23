#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import process from "node:process";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (!key.startsWith("--")) continue;
  args.set(key.slice(2), process.argv[index + 1]);
  index += 1;
}

const base = args.get("base");
const dateBaseline = args.get("date-baseline");
const release = args.get("release") ?? "HEAD";

if (!base || !dateBaseline) {
  console.error(
    "Usage: node scripts/check-release-reconciliation.mjs --base <release-base> --date-baseline <date-ref> [--release <release-ref>]",
  );
  process.exit(2);
}

const git = (...gitArgs) => execFileSync("git", gitArgs, { encoding: "utf8" }).trim();
const gitStatus = (...gitArgs) => {
  try {
    git(...gitArgs);
    return true;
  } catch {
    return false;
  }
};

const expectedDateFiles = [
  "docs/quality/changes/2026-11-23-main-branch-alignment.md",
  "src/integrations/supabase/types.ts",
  "src/opus/components/ActiveJobLedger.tsx",
  "src/opus/components/JobDetails.tsx",
  "src/opus/components/calendar/CalendarBoard.tsx",
  "src/opus/components/calendar/MonthCalendar.tsx",
  "src/opus/components/calendar/ProjectDayList.tsx",
  "src/opus/components/calendar/WeekGridProject.tsx",
  "src/opus/components/calendar/__tests__/jobPeriods.test.ts",
  "src/opus/components/calendar/jobPeriods.ts",
  "src/opus/context/PortalContext.tsx",
  "src/opus/lib/__tests__/eligibleQuoteData.test.ts",
  "src/opus/lib/eligibleQuoteData.ts",
  "src/opus/pages/JobLedger.tsx",
  "src/opus/pages/LaborRoster.tsx",
  "src/opus/types/erp.ts",
  "supabase/functions/_shared/billing-pdf.ts",
  "supabase/functions/send-final-bill/index.ts",
  "supabase/functions/send-quote-pdf/index.ts",
  "supabase/migrations/20261116130700_add_job_date_period.sql",
  "scripts/check-release-reconciliation.mjs",
  "docs/quality/changes/2026-11-23-release-branch-drift-reconciliation.md",
];

const releaseMediaFiles = [
  "docs/quality/changes/2026-11-19-job-media-video-and-compression.md",
  "src/opus/components/JobDetails.tsx",
  "src/opus/components/MediaTab.tsx",
  "src/opus/lib/compressImage.ts",
  "src/opus/pages/ForemanSitePage.tsx",
  "src/opus/pages/ForemanWorkspace.tsx",
  "src/opus/pages/ThirdPartySitePage.tsx",
  "supabase/migrations/20261119123000_enable_job_media_video_uploads.sql",
];

const overlappingMediaFile = "src/opus/components/JobDetails.tsx";

const historicalEvidenceCommits = [
  "d4812427bf0b466c7393fe655c68d00f037579e8",
  "8b666add526d9151cba568dcf474ad8e4ca2108e",
  "6549106d51add2d8ac6eedfefe4a65b79bed663a",
  "7e0ab9b8b78b85472c4bcffa4f4009e0305e2269",
  "3db8dd8b3ead7ade3d0cef8e9614984a05e01165",
];

const errors = [];
if (!gitStatus("rev-parse", "--verify", `${base}^{commit}`)) {
  errors.push(`Base ref does not resolve: ${base}`);
}
if (!gitStatus("rev-parse", "--verify", `${dateBaseline}^{commit}`)) {
  errors.push(`Date-baseline ref does not resolve: ${dateBaseline}`);
}
if (!gitStatus("rev-parse", "--verify", `${release}^{commit}`)) {
  errors.push(`Release ref does not resolve: ${release}`);
}

if (errors.length === 0) {
  if (!gitStatus("merge-base", "--is-ancestor", dateBaseline, release)) {
    errors.push(`${dateBaseline} is not an ancestor of ${release}`);
  }

  const changedFiles = git("diff", "--name-only", `${base}..${release}`)
    .split("\n")
    .filter(Boolean)
    .sort();
  const expectedFiles = [...expectedDateFiles].sort();
  if (JSON.stringify(changedFiles) !== JSON.stringify(expectedFiles)) {
    errors.push(
      `Release diff does not match the reconciliation allowlist. Expected ${expectedFiles.join(", ")}; got ${changedFiles.join(", ")}`,
    );
  }

  for (const file of expectedDateFiles) {
    if (!gitStatus("cat-file", "-e", `${release}:${file}`)) {
      errors.push(`Missing reconciled release file: ${file}`);
    }
  }

  const expectedMergedTree = git("merge-tree", "--write-tree", base, dateBaseline);

  for (const file of releaseMediaFiles) {
    if (!gitStatus("cat-file", "-e", `${base}:${file}`)) {
      errors.push(`Media baseline file is missing from base: ${file}`);
      continue;
    }
    if (!gitStatus("cat-file", "-e", `${release}:${file}`)) {
      errors.push(`Media baseline file was dropped from release: ${file}`);
    } else if (file !== overlappingMediaFile) {
      const expectedBlob = git("rev-parse", `${expectedMergedTree}:${file}`);
      const releaseBlob = git("rev-parse", `${release}:${file}`);
      if (expectedBlob !== releaseBlob) {
        errors.push(`Media baseline file drifted during date reconciliation: ${file}`);
      }
    } else {
      const expectedJobDetails = git("show", `${expectedMergedTree}:${file}`);
      const actualJobDetails = git("show", `${release}:${file}`);
      const normalizedActual = actualJobDetails
        .replace(
          'import { formatUKDate, isValidISODate, toLocalISODate } from "../utils/week";',
          'import { formatUKDate, toLocalISODate } from "../utils/week";',
        )
        .replace(
          `          if ((editStartDate && !editEndDate) || (!editStartDate && editEndDate)) {
            toast.error("Set both a start date and an end date, or clear both dates.");
            return;
          }
          if (
            (editStartDate && !isValidISODate(editStartDate)) ||
            (editEndDate && !isValidISODate(editEndDate))
          ) {
            toast.error("Enter valid calendar dates.");
            return;
          }
          if (editStartDate && editEndDate && editEndDate < editStartDate) {
            toast.error("The end date must be on or after the start date.");
            return;
          }
`,
          `          if ((editStartDate && !editEndDate) || (!editStartDate && editEndDate)) {
            toast.error("Set both a start date and an end date, or clear both dates.");
            return;
          }
          if (editStartDate && editEndDate && editEndDate < editStartDate) {
            toast.error("The end date must be on or after the start date.");
            return;
          }
`,
        );
      if (normalizedActual !== expectedJobDetails) {
        errors.push(`Merged JobDetails differs from the expected media/date merge: ${file}`);
      }
    }
  }

  for (const commit of historicalEvidenceCommits) {
    if (!gitStatus("merge-base", "--is-ancestor", commit, dateBaseline)) {
      errors.push(`Historical date evidence commit is not in the date baseline: ${commit}`);
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`[release-reconciliation][error] ${error}`);
  process.exit(1);
}

console.log(
  `[release-reconciliation] PASS: ${release} contains the date baseline, preserves media baseline files, and matches the reconciliation allowlist`,
);
