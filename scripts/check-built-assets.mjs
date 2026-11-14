import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const publicDir = resolve(process.cwd(), ".output/public");
const assetsDir = join(publicDir, "assets");
if (!existsSync(assetsDir)) {
  throw new Error(`Built asset directory not found: ${assetsDir}. Run npm run build first.`);
}

const assetFiles = readdirSync(assetsDir).filter((file) => /\.(?:js|css)$/.test(file));
const entrypointNames = [
  assetFiles.find((file) => /^index-[^/]+\.js$/.test(file)),
  assetFiles.find((file) => /^routes-[^/]+\.js$/.test(file)),
  assetFiles.find((file) => /^App-[^/]+\.js$/.test(file)),
].filter(Boolean);
if (entrypointNames.length !== 3) {
  throw new Error(
    `Expected index, routes, and App entrypoints; found ${entrypointNames.join(", ")}`,
  );
}

const references = assetFiles.flatMap((file) => {
  const contents = readFileSync(join(assetsDir, file), "utf8");
  return [...contents.matchAll(/(?:\.\/|assets\/)([A-Za-z0-9_.-]+\.(?:js|css))/g)].map(
    (match) => match[1],
  );
});
const assetPaths = [...new Set([...entrypointNames, ...references])];
const missing = [];
const invalid = [];

for (const assetPath of assetPaths) {
  const filePath = join(assetsDir, assetPath.replace(/^\//, ""));
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    missing.push(assetPath);
    continue;
  }

  if (filePath.endsWith(".js")) {
    const firstBytes = readFileSync(filePath, "utf8").slice(0, 200).trimStart().toLowerCase();
    if (firstBytes.startsWith("<!doctype html") || firstBytes.startsWith("<html")) {
      invalid.push(`${assetPath} contains HTML instead of JavaScript`);
    }
  }
}

if (missing.length || invalid.length) {
  if (missing.length)
    console.error("Missing assets referenced by index.html:\n- " + missing.join("\n- "));
  if (invalid.length) console.error("Invalid built assets:\n- " + invalid.join("\n- "));
  process.exit(1);
}

console.log(`Verified ${assetPaths.length} generated JavaScript/CSS assets.`);
