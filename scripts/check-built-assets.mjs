import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const publicDir = resolve(process.cwd(), ".output/public");
if (!existsSync(publicDir)) throw new Error(`Built public directory not found: ${publicDir}`);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else files.push(path);
  }
  return files;
}

const files = await listFiles(publicDir);
const fileSet = new Set(files);
const htmlFiles = files.filter((file) => extname(file).toLowerCase() === ".html");
const references = new Set();
for (const htmlFile of htmlFiles) {
  const contents = readFileSync(htmlFile, "utf8");
  for (const match of contents.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const reference = match[1];
    if (!reference || /^(?:https?:|data:|#|mailto:|tel:)/i.test(reference)) continue;
    references.add(reference.split("?")[0].replace(/^\//, ""));
  }
}

const missing = [...references].filter((reference) => !fileSet.has(join(publicDir, reference)));
if (missing.length > 0) {
  throw new Error(`Missing built assets referenced by HTML:\n- ${missing.join("\n- ")}`);
}

const invalid = [];
for (const file of files) {
  const extension = extname(file).toLowerCase();
  if (!new Set([".js", ".css", ".html"]).has(extension)) continue;
  const contents = await readFile(file, "utf8");
  if (/^\s*<!doctype html|<html[\s>]/i.test(contents)) {
    invalid.push(`${file.replace(`${publicDir}/`, "")}: HTML content in ${extension} asset`);
  }
  if (/placeholder\.supabase\.co|placeholder-anon-key/i.test(contents)) {
    invalid.push(`${file.replace(`${publicDir}/`, "")}: placeholder Supabase configuration`);
  }
}
if (invalid.length > 0) throw new Error(`Invalid built assets:\n- ${invalid.join("\n- ")}`);

const manifestPath = join(publicDir, "release-manifest.json");
if (!existsSync(manifestPath)) throw new Error("release-manifest.json is missing from the build");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (
  !Array.isArray(manifest.files) ||
  !manifest.buildSha ||
  manifest.buildSha === "local" ||
  manifest.buildSha === "unknown" ||
  !manifest.supabaseProjectId
) {
  throw new Error("release-manifest.json is incomplete");
}
const allowedProjectIds = (process.env.ALLOWED_SUPABASE_PROJECT_IDS || "fgpthpxmiroyebrzjdzo")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (
  /^(?:placeholder|local|unknown)$/i.test(manifest.supabaseProjectId) ||
  !allowedProjectIds.includes(manifest.supabaseProjectId)
) {
  throw new Error(
    `Release manifest uses an unapproved Supabase project: ${manifest.supabaseProjectId}`,
  );
}
const emittedPaths = new Set(
  files.filter((file) => file !== manifestPath).map((file) => file.replace(`${publicDir}/`, "")),
);
const manifestPaths = new Set(manifest.files.map((entry) => entry.path));
const missingFromManifest = [...emittedPaths].filter((path) => !manifestPaths.has(path));
const extraInManifest = [...manifestPaths].filter((path) => !emittedPaths.has(path));
if (missingFromManifest.length > 0 || extraInManifest.length > 0) {
  throw new Error(
    `Release manifest drift detected (missing: ${missingFromManifest.join(", ") || "none"}; extra: ${extraInManifest.join(", ") || "none"})`,
  );
}
for (const entry of manifest.files) {
  const filePath = join(publicDir, entry.path);
  if (!fileSet.has(filePath)) throw new Error(`Manifest references missing file: ${entry.path}`);
  const digest = createHash("sha256").update(readFileSync(filePath)).digest("hex");
  if (digest !== entry.sha256) throw new Error(`Manifest hash mismatch: ${entry.path}`);
}
console.log(
  `Verified ${files.length} generated public files and ${references.size} HTML asset references.`,
);
