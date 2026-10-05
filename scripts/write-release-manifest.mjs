import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import process from "node:process";

const publicDir = resolve(process.cwd(), ".output/public");
const manifestPath = join(publicDir, "release-manifest.json");

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

const files = (await listFiles(publicDir))
  .filter((path) => path !== manifestPath)
  .sort()
  .map((path) => relative(publicDir, path).replaceAll("\\", "/"));
const entries = [];
for (const file of files) {
  const bytes = await readFile(join(publicDir, file));
  entries.push({
    path: file,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.byteLength,
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const projectId = new URL(supabaseUrl).hostname.split(".")[0];
const manifest = {
  service: "opus-form",
  buildSha: process.env.VITE_BUILD_SHA || process.env.GITHUB_SHA || "local",
  builtAt: process.env.VITE_BUILD_TIMESTAMP || new Date().toISOString(),
  supabaseProjectId: projectId,
  files: entries,
};

await mkdir(publicDir, { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`[build] Wrote release manifest for ${entries.length} public files.`);
