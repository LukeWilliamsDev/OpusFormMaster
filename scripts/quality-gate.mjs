#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const CONTRACT_PATTERN = /^docs\/quality\/changes\/[^/]+\.md$/;
const VALID_STATUSES = new Set(["READY_FOR_REVIEW"]);
const REQUIRED_SECTIONS = [
  "Intent",
  "Scope",
  "Acceptance criteria",
  "Risk and approval gates",
  "Verification evidence",
  "Critic review",
  "Release decision",
];

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function runGit(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

function hasGitRevision(ref) {
  return (
    Boolean(ref) &&
    !/^0+$/.test(ref) &&
    Boolean(runGit(["rev-parse", "--verify", `${ref}^{commit}`]))
  );
}

function uniquePaths(output) {
  const lines = Array.isArray(output) ? output : output.split(/\r?\n/);
  return [...new Set(lines.map((path) => path.trim()).filter(Boolean))].sort();
}

export function isRelevantFile(file) {
  const normalized = file.replaceAll("\\", "/");
  const generatedPath = [".output/", ".wrangler/", "node_modules/", ".letta/"];
  return !generatedPath.some((prefix) => normalized.startsWith(prefix));
}

export function changedFiles({ baseRef = process.env.QUALITY_BASE_REF, stagedOnly = false } = {}) {
  if (stagedOnly) {
    const staged = runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMRD", "HEAD"]);
    if (baseRef && hasGitRevision(baseRef)) {
      return uniquePaths(
        [runGit(["diff", "--name-only", "--diff-filter=ACMRD", `${baseRef}...HEAD`]), staged].join(
          "\n",
        ),
      );
    }
    return uniquePaths(staged);
  }

  if (hasGitRevision(baseRef)) {
    return uniquePaths(runGit(["diff", "--name-only", "--diff-filter=ACMRD", `${baseRef}...HEAD`]));
  }

  if (baseRef) {
    throw new Error(
      `QUALITY_BASE_REF does not resolve to a commit (${baseRef}); refusing to inspect an incomplete CI diff`,
    );
  }

  const workingTree = [
    runGit(["diff", "--name-only", "--diff-filter=ACMRD", "HEAD"]),
    runGit(["ls-files", "--others", "--exclude-standard"]),
  ].join("\n");
  const files = uniquePaths(workingTree);
  if (files.length > 0) return files;

  const previousCommit = runGit(["rev-parse", "--verify", "HEAD^"]);
  return hasGitRevision(previousCommit)
    ? uniquePaths(
        runGit(["diff", "--name-only", "--diff-filter=ACMRD", `${previousCommit}...HEAD`]),
      )
    : [];
}

function headingBody(markdown, level, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingPrefix = "#".repeat(level);
  const nextHeading = level === 2 ? "^##\\s+" : "^(?:##|###)\\s+";
  const match = markdown.match(
    new RegExp(
      `^${headingPrefix}\\s+${escapedHeading}\\s*$([\\s\\S]*?)(?=${nextHeading}|(?![\\s\\S]))`,
      "im",
    ),
  );
  return match?.[1]?.trim() ?? null;
}

function sectionBody(markdown, heading) {
  return headingBody(markdown, 2, heading);
}

function subsectionBody(markdown, heading) {
  return headingBody(markdown, 3, heading);
}

function requiredField(markdown, label) {
  return markdown.match(new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+)$`, "im"))?.[1]?.trim() ?? "";
}

function requireText(errors, body, pattern, message) {
  if (!pattern.test(body ?? "")) errors.push(message);
}

export function manifestMatches(actual, listed) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...listed].sort());
}

function normalizedValue(value) {
  return value.replace(/^`|`$/g, "").trim();
}

export function contractChangedFiles(markdown) {
  const scope = sectionBody(markdown, "Scope") ?? "";
  const changedFilesSection = subsectionBody(scope, "Changed files") ?? "";
  return uniquePaths(
    changedFilesSection
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*-\s+`?([^`]+?)`?\s*$/)?.[1] ?? "")
      .filter(Boolean),
  );
}

export function stagedContentOrDeletion(stagedContent, file) {
  return stagedContent ?? Buffer.from(`STAGED-DELETED:${file}`);
}

function fileBytes(file, stagedOnly) {
  if (stagedOnly) {
    const staged = spawnSync("git", ["show", `:${file}`], { encoding: null });
    return stagedContentOrDeletion(staged.status === 0 ? staged.stdout : null, file);
  }
  return existsSync(file) ? readFileSync(file) : Buffer.from(`DELETED:${file}`);
}

export function evidenceFingerprint(files, excluded = [], stagedOnly = false) {
  const excludedSet = new Set(excluded);
  const entries = files
    .filter((file) => !excludedSet.has(file))
    .sort()
    .map((file) => {
      const contentHash = createHash("sha256").update(fileBytes(file, stagedOnly)).digest("hex");
      return `${file}\0${contentHash}`;
    });
  return createHash("sha256").update(entries.join("\n")).digest("hex");
}

export function preferStagedContent(stagedContent, workingTreeContent) {
  return stagedContent ?? workingTreeContent;
}

export function stagedContractContent(stagedContent) {
  return stagedContent ?? "";
}

export function validateEvidenceBinding(markdown, files, contracts, stagedOnly = false) {
  const errors = [];
  const listedFiles = contractChangedFiles(markdown);
  if (!manifestMatches(files, listedFiles)) {
    errors.push(
      `Changed files list must exactly match the detected diff (listed ${listedFiles.length}, detected ${files.length})`,
    );
  }

  const recordedFingerprint = normalizedValue(requiredField(markdown, "Evidence fingerprint"));
  if (/^[0-9a-f]{64}$/i.test(recordedFingerprint)) {
    const expectedFingerprint = evidenceFingerprint(files, contracts, stagedOnly);
    if (recordedFingerprint.toLowerCase() !== expectedFingerprint) {
      errors.push(
        `Evidence fingerprint is stale; rerun checks after the diff changes (expected ${expectedFingerprint})`,
      );
    }
  }
  return errors;
}

function readContract(contract, stagedOnly) {
  if (stagedOnly) {
    const staged = spawnSync("git", ["show", `:${contract}`], { encoding: "utf8" });
    return staged.status === 0 ? stagedContractContent(staged.stdout) : "";
  }
  return existsSync(contract) ? readFileSync(contract, "utf8") : "";
}

export function validateContract(markdown, changed = []) {
  const errors = [];
  const warnings = [];

  for (const heading of REQUIRED_SECTIONS) {
    if (!sectionBody(markdown, heading)) errors.push(`Missing required section: ## ${heading}`);
  }

  const status = requiredField(markdown, "Status").toUpperCase();
  if (!VALID_STATUSES.has(status)) {
    errors.push(`Status must be READY_FOR_REVIEW; received ${status || "nothing"}`);
  }

  const risk = requiredField(markdown, "Risk").toLowerCase();
  if (!["low", "medium", "high", "critical"].includes(risk)) {
    errors.push(`Risk must be low, medium, high, or critical; received ${risk || "nothing"}`);
  }

  const category = requiredField(markdown, "Change category");
  if (!category) errors.push("Missing Change category field");

  const scope = sectionBody(markdown, "Scope");
  requireText(errors, scope, /in scope/i, "Scope must state what is in scope");
  requireText(errors, scope, /out of scope/i, "Scope must state what is out of scope");

  const acceptance = sectionBody(markdown, "Acceptance criteria");
  const checkboxes = acceptance?.match(/^\s*-\s*\[[ xX]\].*$/gm) ?? [];
  if (checkboxes.length === 0)
    errors.push("Acceptance criteria must contain at least one checkbox");
  if (VALID_STATUSES.has(status) && checkboxes.some((line) => !/\[[xX]\]/.test(line))) {
    errors.push(
      "Every acceptance criterion must be checked before the contract is ready for review",
    );
  }

  const critic = sectionBody(markdown, "Critic review");
  requireText(errors, critic, /verdict:\s*`?PASS\b/i, "Critic review must record a PASS verdict");
  requireText(
    errors,
    critic,
    /unresolved blocking findings:\s*`?(none|no\b)/i,
    "Critic review must state that no blocking findings remain",
  );
  requireText(errors, critic, /repair iterations:/i, "Critic review must record repair iterations");

  const release = sectionBody(markdown, "Release decision");
  requireText(
    errors,
    release,
    /automated gate:/i,
    "Release decision must record the automated gate",
  );
  if (/release status:\s*`?APPROVED\b/i.test(release ?? "")) {
    errors.push(
      "Automation cannot record an APPROVED release status; named human approval is required",
    );
  }
  requireText(
    errors,
    release,
    /release status:\s*`?(NOT_RELEASED|READY_FOR_HUMAN_APPROVAL|APPROVED)\b/i,
    "Release decision must state whether release is blocked, awaiting approval, or approved",
  );
  if (/human approval:\s*`?PENDING\b/i.test(release ?? "")) {
    warnings.push(
      "Human approval is still pending; this contract does not authorize merge or release",
    );
  }
  const humanApproval = normalizedValue(
    release?.match(/human approval:\s*`?([^`\n]+?)`?\s*$/im)?.[1] ?? "",
  );
  if (!humanApproval) {
    errors.push("Release decision must record the human approval state");
  } else if (status === "READY_FOR_REVIEW" && humanApproval !== "PENDING") {
    errors.push("Automated validation requires Human approval: PENDING");
  }

  const evidence = sectionBody(markdown, "Verification evidence");
  requireText(
    errors,
    evidence,
    /\|.*\|/i,
    "Verification evidence must contain a check/evidence table",
  );
  const evidenceBase = normalizedValue(requiredField(markdown, "Evidence base"));
  const evidenceHead = normalizedValue(requiredField(markdown, "Evidence head"));
  const fingerprint = normalizedValue(requiredField(markdown, "Evidence fingerprint"));
  if (!evidenceBase) errors.push("Evidence must record a base revision or working-tree identity");
  if (!evidenceHead) errors.push("Evidence must record a head revision or working-tree identity");
  if (!/^(working tree|PENDING|[0-9a-f]{64})$/i.test(fingerprint)) {
    errors.push("Evidence fingerprint must be a SHA-256 value or the temporary value PENDING");
  }
  if (status === "READY_FOR_REVIEW" && !/^[0-9a-f]{64}$/i.test(fingerprint)) {
    errors.push("READY_FOR_REVIEW contracts must record the final evidence fingerprint");
  }

  const normalizedChanged = changed.map((file) => file.replaceAll("\\", "/"));
  if (normalizedChanged.some((file) => file.startsWith("supabase/migrations/"))) {
    requireText(
      errors,
      `${scope}\n${sectionBody(markdown, "Risk and approval gates")}`,
      /RLS|tenant|row-level/i,
      "Migration changes must address RLS or tenant isolation",
    );
    requireText(
      errors,
      sectionBody(markdown, "Risk and approval gates"),
      /rollback|corrective|forward-only/i,
      "Migration changes must state a rollback or corrective path",
    );
  }
  if (normalizedChanged.some((file) => file.startsWith("src/") || file.startsWith("public/"))) {
    requireText(
      errors,
      `${scope}\n${evidence}`,
      /UI|visual|responsive|accessibility/i,
      "UI changes must record visual, responsive, or accessibility verification",
    );
    requireText(
      errors,
      `${scope}\n${sectionBody(markdown, "Risk and approval gates")}`,
      /role|permission|access/i,
      "Source changes must address the relevant role or access boundary",
    );
  }
  if (
    normalizedChanged.some((file) => file.startsWith("docs/QMS/") || file.startsWith("policies/"))
  ) {
    requireText(
      errors,
      `${scope}\n${sectionBody(markdown, "Risk and approval gates")}`,
      /owner|approval/i,
      "Policy/QMS changes must identify ownership and approval",
    );
  }
  if (normalizedChanged.some((file) => ["package.json", "package-lock.json"].includes(file))) {
    requireText(
      errors,
      `${scope}\n${evidence}`,
      /dependenc|audit|lockfile/i,
      "Dependency changes must record dependency or audit verification",
    );
  }

  return { errors, warnings };
}

function printContractResult(changed, contracts) {
  console.log(
    `[quality] inspected ${changed.length} changed file${changed.length === 1 ? "" : "s"}`,
  );
  if (contracts.length > 0)
    console.log(`[quality] contract${contracts.length === 1 ? "" : "s"}: ${contracts.join(", ")}`);
}

export function validateChangedContracts(files, { stagedOnly = false } = {}) {
  const relevant = files.filter(isRelevantFile);
  const contracts = files.filter((file) => CONTRACT_PATTERN.test(file));
  const errors = [];
  const warnings = [];

  if (relevant.length > 0 && contracts.length === 0) {
    errors.push("Relevant changes require a new or modified docs/quality/changes/*.md contract");
  }

  for (const contract of contracts) {
    if (!existsSync(contract) && !stagedOnly) {
      errors.push(`Contract is listed as changed but cannot be read: ${contract}`);
      continue;
    }
    const markdown = readContract(contract, stagedOnly);
    if (!markdown) {
      errors.push(`Contract is listed as changed but cannot be read: ${contract}`);
      continue;
    }
    const result = validateContract(markdown, files);
    errors.push(...result.errors.map((error) => `${contract}: ${error}`));
    warnings.push(...result.warnings.map((warning) => `${contract}: ${warning}`));

    errors.push(
      ...validateEvidenceBinding(markdown, files, contracts, stagedOnly).map(
        (error) => `${contract}: ${error}`,
      ),
    );
  }

  printContractResult(files, contracts);
  for (const warning of warnings) console.warn(`[quality][warning] ${warning}`);
  for (const error of errors) console.error(`[quality][error] ${error}`);
  return errors.length === 0;
}

function runCheck(name, command, args, env = process.env) {
  console.log(`\n[quality] ${name}: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) {
    console.error(`[quality][error] ${name} could not start: ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    console.error(`[quality][error] ${name} failed with exit code ${result.status ?? "unknown"}`);
    return false;
  }
  return true;
}

function runDeterministicChecks() {
  const buildEnv = { ...process.env };
  buildEnv.VITE_SUPABASE_URL ||= "https://placeholder.supabase.co";
  buildEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||= "placeholder-anon-key";
  const checks = [
    ["lint", npmCommand, ["run", "lint"]],
    ["format", npxCommand, ["--no-install", "prettier", "--check", "."]],
    ["typecheck", npmCommand, ["run", "typecheck"]],
    ["tests", npmCommand, ["run", "test"]],
    ["build and bundle budget", npmCommand, ["run", "build:budget"], buildEnv],
  ];
  return checks.every(([name, command, args, env]) => runCheck(name, command, args, env));
}

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return { contractOnly: args.has("--contract-only"), stagedOnly: args.has("--staged-only") };
}

export function main() {
  const { contractOnly, stagedOnly } = parseArgs();
  let files;
  try {
    files = changedFiles({ stagedOnly });
  } catch (error) {
    console.error(`[quality][error] ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  if (!validateChangedContracts(files, { stagedOnly })) return 1;
  if (contractOnly) {
    console.log("[quality] change contract gate passed");
    return 0;
  }
  return runDeterministicChecks() ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
