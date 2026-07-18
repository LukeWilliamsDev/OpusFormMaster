const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Patterns for credential detection
const SECRET_PATTERNS = [
  { name: "Stripe Live Secret Key", pattern: /sk_live_[a-zA-Z0-9]+/i },
  { name: "Resend API Key", pattern: /re_[a-zA-Z0-9]{24}/ },
  { name: "Google API Key", pattern: /AIzaSy[a-zA-Z0-9\-_]{35}/ },
  { name: "Generic Private Key", pattern: /-----BEGIN (RSA |EC |PGP |OPENSSH )?PRIVATE KEY-----/ },
];

// Banned CSS color functions that crash html2canvas/html2pdf
const BANNED_CSS_FUNCTIONS = ["oklch(", "lch(", "lab("];
const FRONTEND_EXTENSIONS = [".tsx", ".ts", ".css", ".jsx", ".html", ".scss"];

console.log("Running pre-commit quality and safety checks...");

let files = [];
try {
  const staged = execSync("git diff --cached --name-only", { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);

  const unstaged = execSync("git diff --name-only", { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);

  files = Array.from(new Set([...staged, ...unstaged]));
} catch (e) {
  console.log("Skipping pre-commit checks: Git not initialized or failed.");
  process.exit(0);
}

// Clean and filter files
const filesToScan = files.filter((file) => {
  try {
    // Only scan files that exist, are regular files, and are not in node_modules, .agents, or package locks
    return (
      fs.existsSync(file) &&
      fs.statSync(file).isFile() &&
      !file.includes("node_modules") &&
      !file.includes("package-lock.json") &&
      !file.includes("pnpm-lock.yaml") &&
      !file.includes("yarn.lock") &&
      !file.includes(".git/")
    );
  } catch {
    return false;
  }
});

let failed = false;

for (const file of filesToScan) {
  const content = fs.readFileSync(file, "utf8");
  const ext = path.extname(file).toLowerCase();

  // 1. Scan for secrets
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      console.error(`\x1b[31m[ERROR] Potential ${name} detected in file: ${file}\x1b[0m`);
      failed = true;
    }
  }

  // 2. Scan for banned CSS color functions in frontend files
  if (FRONTEND_EXTENSIONS.includes(ext)) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Strip comments to avoid false positives in documentation/explanations
      let codeOnly = line;
      const doubleSlash = codeOnly.indexOf("//");
      if (doubleSlash !== -1) {
        codeOnly = codeOnly.substring(0, doubleSlash);
      }
      const blockComment = codeOnly.indexOf("/*");
      if (blockComment !== -1) {
        codeOnly = codeOnly.substring(0, blockComment);
      }

      for (const banned of BANNED_CSS_FUNCTIONS) {
        if (codeOnly.toLowerCase().includes(banned)) {
          console.error(
            `\x1b[31m[ERROR] Banned CSS function "${banned}" found in ${file}:${i + 1}\x1b[0m`,
          );
          console.error(`  > ${line.trim()}`);
          failed = true;
        }
      }
    }
  }
}

if (failed) {
  console.error(
    "\x1b[31mPre-commit checks FAILED. Please fix the safety issues above before committing.\x1b[0m",
  );
  process.exit(1);
} else {
  console.log("\x1b[32mPre-commit checks passed successfully.\x1b[0m");
  process.exit(0);
}
