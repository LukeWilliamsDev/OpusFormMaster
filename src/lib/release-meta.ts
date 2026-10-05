const buildSha = import.meta.env.VITE_BUILD_SHA || "unknown";
const buildTimestamp = import.meta.env.VITE_BUILD_TIMESTAMP || "unknown";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const supabaseProjectId = supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : "";
const approvedSupabaseProjectIds = (
  import.meta.env.VITE_ALLOWED_SUPABASE_PROJECT_IDS || "fgpthpxmiroyebrzjdzo"
)
  .split(",")
  .map((value: string) => value.trim())
  .filter(Boolean);

export const releaseMeta = {
  buildSha,
  buildTimestamp,
  supabaseUrl,
  supabaseProjectId,
  approvedSupabaseProjectIds,
  supabasePublishableKey,
};
