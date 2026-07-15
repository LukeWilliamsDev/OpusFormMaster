const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Preparing memory consolidation drafts...");

// Helper to get changed files from Git
function getChangedFiles() {
  try {
    // Check staged and unstaged changes
    const diff = execSync("git diff HEAD --name-only", { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);

    // Check untracked files
    const untracked = execSync("git status --porcelain", { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter((line) => line.startsWith("??"))
      .map((line) => line.substring(3).trim())
      .filter(Boolean);

    return Array.from(new Set([...diff, ...untracked]));
  } catch (e) {
    console.warn("Git error or not a git repository:", e.message);
    return [];
  }
}

const changedFiles = getChangedFiles();
const dateStr = new Date().toISOString().split("T")[0];

console.log("\n========================================");
console.log(`DRAFT RECAP FOR: ${dateStr}`);
console.log("========================================");
console.log(`## ${dateStr}`);

if (changedFiles.length === 0) {
  console.log("- [No file changes detected in Git. Add bullet points manually.]");
} else {
  changedFiles.forEach((file) => {
    // Generate draft bullets
    const base = path.basename(file);
    if (file.includes("pre-commit") || file.includes("consolidate")) {
      console.log(`- Added automated safety and memory consolidation helper scripts in ${file}.`);
    } else {
      console.log(
        `- [Noun fragment summarizing changes to ${base} (e.g., Fixed, Added, Overhauled, Gated, Restyled)].`,
      );
    }
  });
}

console.log("\n========================================");
console.log("MEMORY.md KEY SECTIONS TO UPDATE:");
console.log("========================================");

const memoryPath = path.join(process.cwd(), "docs", "MEMORY.md");
if (fs.existsSync(memoryPath)) {
  const memoryContent = fs.readFileSync(memoryPath, "utf8");
  const sections = memoryContent.match(/^##\s+.+$/gm);
  if (sections) {
    console.log("Identify where your changes belong in these existing categories:");
    sections.forEach((sec) => console.log(`  * ${sec.replace("## ", "")}`));
  }
} else {
  console.log("docs/MEMORY.md not found.");
}

console.log("\n========================================");
console.log("Consolidation guidelines:");
console.log(
  "1. Merge new capabilities directly into existing MEMORY.md categories (No chronological logs).",
);
console.log("2. Use strict noun fragments only (no personal pronouns, short descriptions).");
console.log("3. Append today's consolidated list of changes to docs/RECAP.md.");
console.log("========================================\n");
