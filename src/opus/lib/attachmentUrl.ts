import { supabase } from "../../integrations/supabase/client";

// job-attachments is a private bucket; stored file_url values are legacy
// getPublicUrl()-shaped strings that 404 directly. Extract the storage path
// and sign it on demand, same pattern already used for compliance-documents.
export async function getSignedJobAttachmentUrl(
  fileUrl: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const marker = "/job-attachments/";
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  const filePath = fileUrl.slice(idx + marker.length);

  const { data, error } = await supabase.storage
    .from("job-attachments")
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
