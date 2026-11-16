const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
const allowPlaceholders = process.env.WORKER_BUILD_ALLOW_PLACEHOLDER === "1";

const invalid = required.filter((name) => {
  const value = process.env[name]?.trim() ?? "";
  return !value || value.includes("placeholder");
});

if (invalid.length > 0 && !allowPlaceholders) {
  console.error(
    `[worker-build] Missing real production client configuration: ${invalid.join(", ")}. ` +
      "Set the Vite Supabase variables before deploying the Worker.",
  );
  process.exit(1);
}

if (invalid.length > 0) {
  console.warn(
    `[worker-build] Placeholder configuration explicitly allowed for non-production validation: ${invalid.join(", ")}`,
  );
} else {
  console.log("[worker-build] Supabase client build configuration is present.");
}
