import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(process.argv[2], "utf8"));
const versions = input?.versions;
if (!Array.isArray(versions) || versions.length === 0) {
  console.error(
    "Current Worker deployment status is missing; refusing to guess a rollback target.",
  );
  process.exit(1);
}

let percentageTotal = 0;
for (const [index, entry] of versions.entries()) {
  const rawPercentage = entry?.percentage;
  const percentage =
    typeof rawPercentage === "number"
      ? rawPercentage
      : typeof rawPercentage === "string" && rawPercentage.trim() !== ""
        ? Number(rawPercentage)
        : NaN;
  if (
    typeof entry?.version_id !== "string" ||
    entry.version_id.trim() === "" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      entry.version_id,
    ) ||
    !Number.isFinite(percentage) ||
    percentage < 0 ||
    percentage > 100
  ) {
    console.error(`Worker deployment entry ${index + 1} is malformed; refusing to guess.`);
    process.exit(1);
  }
  percentageTotal += percentage;
}
if (percentageTotal !== 100) {
  console.error("Worker deployment percentages do not total 100; refusing to guess.");
  process.exit(1);
}

const live = versions.filter((entry) => Number(entry?.percentage) === 100);
if (live.length !== 1 || typeof live[0]?.version_id !== "string") {
  console.error(
    "Current Worker deployment is not unambiguous; refusing to guess a rollback target.",
  );
  process.exit(1);
}

process.stdout.write(`${live[0].version_id}\n`);
