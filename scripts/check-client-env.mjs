import process from "node:process";

const projectIds = (process.env.ALLOWED_SUPABASE_PROJECT_IDS || "fgpthpxmiroyebrzjdzo")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const isPlaceholder = (value) =>
  !value || /placeholder|example\.com|localhost|127\.0\.0\.1/i.test(value);

const errors = [];
if (!supabaseUrl) errors.push("VITE_SUPABASE_URL is missing");
if (!publishableKey) errors.push("VITE_SUPABASE_PUBLISHABLE_KEY is missing");
if (supabaseUrl && isPlaceholder(supabaseUrl)) {
  errors.push("VITE_SUPABASE_URL is placeholder-like");
}
if (publishableKey && isPlaceholder(publishableKey)) {
  errors.push("VITE_SUPABASE_PUBLISHABLE_KEY is placeholder-like");
}

let projectId = "";
if (supabaseUrl) {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    projectId = hostname.split(".")[0] ?? "";
    if (!hostname.endsWith(".supabase.co")) {
      errors.push("VITE_SUPABASE_URL must point to a Supabase project hostname");
    }
  } catch {
    errors.push("VITE_SUPABASE_URL is not a valid URL");
  }
}
if (projectId && !projectIds.includes(projectId)) {
  errors.push(`VITE_SUPABASE_URL points to an unapproved project (${projectId})`);
}
if (projectId && /^(?:placeholder|local|unknown)$/i.test(projectId)) {
  errors.push("VITE_SUPABASE_URL points to a non-production project identifier");
}

if (errors.length > 0) {
  console.error(`[build] Refusing to build: ${errors.join("; ")}.`);
  process.exit(1);
}

console.log(`[build] Supabase client configuration verified for approved project ${projectId}.`);
