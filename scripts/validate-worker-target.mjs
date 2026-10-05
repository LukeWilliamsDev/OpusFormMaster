import { readFileSync } from "node:fs";

const [historyPath, target] = process.argv.slice(2);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!historyPath || !uuidPattern.test(target || "")) {
  console.error("A valid Cloudflare Worker version UUID is required.");
  process.exit(1);
}

const history = JSON.parse(readFileSync(historyPath, "utf8"));
if (!Array.isArray(history)) {
  console.error("Cloudflare deployment history is malformed.");
  process.exit(1);
}

const deployed = history.some(
  (deployment) =>
    Array.isArray(deployment?.versions) &&
    deployment.versions.some(
      (version) => version?.version_id === target && Number(version?.percentage) === 100,
    ),
);
if (!deployed) {
  console.error(
    "The rollback target has not been a fully deployed Worker version; refusing to roll back.",
  );
  process.exit(1);
}

process.stdout.write(`${target}\n`);
