import { describe, expect, it } from "vitest";

import {
  changedFiles,
  contractChangedFiles,
  evidenceFingerprint,
  isRelevantFile,
  manifestMatches,
  preferStagedContent,
  stagedContractContent,
  stagedContentOrDeletion,
  validateChangedContracts,
  validateEvidenceBinding,
  validateContract,
} from "./quality-gate.mjs";

const passingContract = `
# Opus Form change contract
**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source
**Accountable owner:** Opus Form director
**Source of truth:** approved task
**Evidence base:** working tree
**Evidence head:** working tree
**Evidence fingerprint:** aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

## Intent
Make the requested change.

## Scope
### In scope
- UI and access behavior.
### Out of scope
- Production deployment.
### Changed files
- src/example.tsx

## Acceptance criteria
- [x] AC-1: The requested behavior is observable — evidence: test.

## Risk and approval gates
- Role and permission boundaries are checked; human approval is required before release.

## Verification evidence
| Check | Exact command or evidence | Result |
| --- | --- | --- |
| Test | \`npm run test\` | PASS |
| UI | visual and accessibility inspection | PASS |

## Critic review
- Verdict: \`PASS\`
- Unresolved blocking findings: \`none\`
- Repair iterations: \`1\`

## Release decision
- Automated gate: \`PASS\`
- Release status: \`READY_FOR_HUMAN_APPROVAL\`
- Human approval: \`PENDING\`
`;

describe("quality contract validation", () => {
  it("recognises repository surfaces that require a contract", () => {
    expect(isRelevantFile("src/opus/pages/Example.tsx")).toBe(true);
    expect(isRelevantFile("supabase/migrations/20260101_change.sql")).toBe(true);
    expect(isRelevantFile(".husky/pre-commit")).toBe(true);
    expect(isRelevantFile("README.md")).toBe(true);
    expect(isRelevantFile("image.png")).toBe(true);
  });

  it("accepts a complete source contract and warns on pending release approval", () => {
    const result = validateContract(passingContract, ["src/example.tsx"]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toContain(
      "Human approval is still pending; this contract does not authorize merge or release",
    );
  });

  it("extracts the exact changed-file list and produces a content fingerprint", () => {
    expect(contractChangedFiles(passingContract)).toEqual(["src/example.tsx"]);
    expect(evidenceFingerprint(["package.json"], ["contract.md"])).toMatch(/^[0-9a-f]{64}$/);
    expect(manifestMatches(["b", "a"], ["a", "b"])).toBe(true);
    expect(manifestMatches(["a"], ["b"])).toBe(false);
  });

  it("fails closed when CI supplies an invalid base revision", () => {
    expect(() => changedFiles({ baseRef: "0000000000000000000000000000000000000000" })).toThrow(
      "refusing to inspect an incomplete CI diff",
    );
  });

  it("prefers the staged contract over a different working-tree copy", () => {
    expect(preferStagedContent("staged contract", "working-tree contract")).toBe("staged contract");
    expect(preferStagedContent(null, "working-tree contract")).toBe("working-tree contract");
    expect(stagedContractContent("staged contract")).toBe("staged contract");
    expect(stagedContractContent(null)).toBe("");
    expect(stagedContentOrDeletion(null, "deleted.md").toString()).toBe(
      "STAGED-DELETED:deleted.md",
    );
  });

  it("rejects a changed-file or fingerprint mismatch", () => {
    const packageFingerprint = evidenceFingerprint(["package.json"], ["contract.md"]);
    const packageContract = passingContract
      .replace("- src/example.tsx", "- package.json")
      .replace(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        packageFingerprint,
      );
    expect(validateEvidenceBinding(packageContract, ["package.json"], ["contract.md"])).toEqual([]);
    expect(
      validateEvidenceBinding(packageContract, ["scripts/quality-gate.mjs"], ["contract.md"]),
    ).toEqual(expect.arrayContaining([expect.stringContaining("Changed files list")]));
  });

  it("rejects an unfinished contract", () => {
    const unfinished = passingContract
      .replace("[x]", "[ ]")
      .replace("Verdict: `PASS`", "Verdict: `PENDING`");
    const result = validateContract(unfinished, ["src/example.tsx"]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Every acceptance criterion must be checked before the contract is ready for review",
        "Critic review must record a PASS verdict",
      ]),
    );
  });

  it("does not let an automated contract claim approval", () => {
    const approved = passingContract.replace(
      "Human approval: `PENDING`",
      "Human approval: `APPROVED`",
    );
    const result = validateContract(approved, ["src/example.tsx"]);
    expect(result.errors).toContain("Automated validation requires Human approval: PENDING");
  });

  it("rejects a ready contract with a placeholder fingerprint", () => {
    const stale = passingContract.replace(
      "**Evidence fingerprint:** aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "**Evidence fingerprint:** PENDING",
    );
    const result = validateContract(stale, ["src/example.tsx"]);
    expect(result.errors).toContain(
      "READY_FOR_REVIEW contracts must record the final evidence fingerprint",
    );
  });

  it("requires a contract for an unlisted repository-control file", () => {
    expect(validateChangedContracts([".npmrc"])).toBe(false);
  });
});
