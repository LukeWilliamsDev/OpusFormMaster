import { supabase } from "../../integrations/supabase/client";

export type StaffUploadBucket =
  "compliance-documents" | "third-party-staff-documents" | "certificate-check-evidence";

export const cleanupStaffUpload = async ({
  bucket,
  path,
  requestId,
}: {
  bucket: StaffUploadBucket;
  path: string;
  requestId?: string;
}): Promise<void> => {
  const headers = requestId ? { Authorization: `Bearer ${requestId}` } : undefined;
  const { error } = await supabase.functions.invoke("cleanup-staff-upload", {
    body: { bucket, path, requestId: requestId ?? null },
    headers,
  });
  if (error) throw error;
};
