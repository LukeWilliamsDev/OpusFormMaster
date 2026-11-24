#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const jsonOutput = args.has("--json");
const acknowledge = args.has("--ack");
const commitMode = args.has("--commit");
const allowDirty = args.has("--allow-dirty");
const writeMode = acknowledge || commitMode;

function runGit(gitArgs) {
  const result = spawnSync("git", gitArgs, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function validCommit(value) {
  return Boolean(value && runGit(["rev-parse", "--verify", `${value}^{commit}`]));
}

function isSensitivePath(file) {
  return /(^|\/)(?:\.env(?:\.|$)|secrets?(?:\/|\.|$)|credentials?(?:\/|\.|$)|.*(?:token|secret|password|private[-_]?key|dump|backup).*)/i.test(
    file,
  );
}

function safePaths(files) {
  let redactedCount = 0;
  const paths = files.map((file) => {
    if (isSensitivePath(file)) {
      redactedCount += 1;
      return "[redacted-sensitive-path]";
    }
    return file;
  });

  return {
    paths: [...new Set(paths)].sort(),
    redactedCount,
  };
}

function dirtyFiles() {
  return runGit(["status", "--porcelain=v1", "--untracked-files=all"])
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2),
      path: line.slice(3),
    }));
}

function changedFiles(fromCommit, toCommit) {
  if (fromCommit && toCommit && validCommit(fromCommit) && validCommit(toCommit)) {
    return runGit(["diff", "--name-only", "--diff-filter=ACMRD", `${fromCommit}..${toCommit}`])
      .split(/\r?\n/)
      .map((file) => file.trim())
      .filter(Boolean);
  }

  return runGit(["show", "--format=", "--name-only", "HEAD"])
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

function recentCommits(fromCommit, toCommit) {
  const range =
    fromCommit && toCommit && validCommit(fromCommit) && validCommit(toCommit)
      ? `${fromCommit}..${toCommit}`
      : "-20";
  const logArgs =
    range === "-20"
      ? ["log", "-20", "--date=iso-strict", "--format=%H%x09%cI"]
      : ["log", range, "--date=iso-strict", "--format=%H%x09%cI"];

  return runGit(logArgs)
    .split(/\r?\n/)
    .map((line) => {
      const [hash, committedAt] = line.split("\t");
      return hash && committedAt ? { hash, committedAt } : null;
    })
    .filter(Boolean);
}

function loadState(statePath) {
  if (!existsSync(statePath)) return {};
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return {};
  }
}

function writeState(statePath, state) {
  mkdirSync(dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.tmp-${process.pid}`;
  writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, statePath);
}

function output(state) {
  if (jsonOutput) {
    console.log(JSON.stringify(state, null, 2));
    return;
  }

  console.log(
    `Opus Form context marker: ${state.pendingSemanticReview ? "review pending" : "in sync"}`,
  );
  console.log(`Observed commit: ${state.observedCommit}`);
  console.log(`Baseline: ${state.baselineStatus}`);
  if (state.dirty) console.log(`Dirty files: ${state.dirtyFiles.join(", ")}`);
  if (state.changedFilesSinceReview.length > 0) {
    console.log(`Changed files: ${state.changedFilesSinceReview.join(", ")}`);
  }
}

const repository = runGit(["rev-parse", "--show-toplevel"]);
if (!repository) {
  console.error("sync-opusform-context: not inside a git repository");
  process.exit(1);
}

const currentCommit = runGit(["rev-parse", "HEAD"]);
const currentCommitAt = runGit(["show", "-s", "--format=%cI", "HEAD"]);
const baselineCommit = validCommit("origin/promote-live")
  ? runGit(["rev-parse", "origin/promote-live"])
  : null;
const statePath = join(repository, ".letta", "opusform", "context-sync.json");
const previousState = loadState(statePath);
const reviewedCommit = validCommit(previousState.reviewedCommit)
  ? previousState.reviewedCommit
  : null;
const observedCommit = validCommit(previousState.observedCommit)
  ? previousState.observedCommit
  : null;
const baseForChangeSet = reviewedCommit ?? observedCommit;
const commitFiles = changedFiles(baseForChangeSet, currentCommit);
const dirty = dirtyFiles();
const dirtyPathResult = safePaths(dirty.map(({ path }) => path));
const commitPathResult = safePaths(commitFiles);
const baselineStatus = !baselineCommit
  ? "unavailable"
  : previousState.reviewedBaselineCommit && previousState.reviewedBaselineCommit !== baselineCommit
    ? "changed_since_review"
    : "current";
const currentDiffersFromObserved = currentCommit !== observedCommit;
const derivedPending = Boolean(
  previousState.pendingSemanticReview ||
  currentDiffersFromObserved ||
  !reviewedCommit ||
  dirty.length > 0 ||
  baselineStatus !== "current",
);

const nextState = {
  schemaVersion: 1,
  project: "Opus Form",
  repository,
  baseline: "origin/promote-live",
  baselineCommit,
  baselineStatus,
  observedCommit: currentCommit,
  observedCommitAt: currentCommitAt || null,
  reviewedCommit: acknowledge ? currentCommit : reviewedCommit,
  reviewedCommitAt: acknowledge
    ? currentCommitAt || null
    : (previousState.reviewedCommitAt ?? null),
  reviewedBaselineCommit: acknowledge
    ? baselineCommit
    : (previousState.reviewedBaselineCommit ?? null),
  pendingSemanticReview: acknowledge ? false : derivedPending,
  dirty: dirty.length > 0,
  dirtyFiles: dirtyPathResult.paths,
  changedFilesSinceReview: [
    ...new Set([...commitPathResult.paths, ...dirtyPathResult.paths]),
  ].sort(),
  redactedPathCount: commitPathResult.redactedCount + dirtyPathResult.redactedCount,
  commitsSinceReview: recentCommits(baseForChangeSet, currentCommit),
  stateExists: existsSync(statePath),
  generatedAt: new Date().toISOString(),
};

if (acknowledge && dirty.length > 0 && !allowDirty) {
  nextState.pendingSemanticReview = true;
  output(nextState);
  console.error(
    "sync-opusform-context: refusing to acknowledge while the worktree is dirty; review or use --allow-dirty explicitly",
  );
  process.exit(2);
}

if (acknowledge && baselineStatus !== "current") {
  nextState.pendingSemanticReview = true;
  output(nextState);
  console.error(
    `sync-opusform-context: refusing to acknowledge with baseline status ${baselineStatus}; refresh or reconcile origin/promote-live first`,
  );
  process.exit(2);
}

if (writeMode) writeState(statePath, nextState);
output(nextState);
