import { gzipSync } from "node:zlib";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const assetsDir = join(process.cwd(), ".output", "public", "assets");
const files = await readdir(assetsDir);
const budgets = [
  { name: "application shell", pattern: /^App-[^/]+\.js$/, maxGzipBytes: 60 * 1024 },
  { name: "shared vendor entry", pattern: /^index-[^/]+\.js$/, maxGzipBytes: 190 * 1024 },
];

const failures = [];
for (const budget of budgets) {
  const matching = files.filter((file) => budget.pattern.test(file));
  if (matching.length !== 1) {
    failures.push(`${budget.name}: expected one matching asset, found ${matching.length}`);
    continue;
  }
  const file = matching[0];
  const compressedBytes = gzipSync(await readFile(join(assetsDir, file))).byteLength;
  const compressedKb = (compressedBytes / 1024).toFixed(1);
  console.log(
    `${budget.name}: ${file} ${compressedKb} KiB gzip (budget ${budget.maxGzipBytes / 1024} KiB)`,
  );
  if (compressedBytes > budget.maxGzipBytes) {
    failures.push(`${budget.name} exceeds its gzip budget: ${compressedKb} KiB`);
  }
}

if (failures.length) {
  console.error("Bundle budget failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
