import { supabase } from "../../integrations/supabase/client";

// job-attachments is a private bucket; stored file_url values are legacy
// getPublicUrl()-shaped strings that 404 directly. Extract the storage path
// and sign it on demand, same pattern already used for compliance-documents.
//
// width/quality request Supabase Storage's on-the-fly image transform so
// grid thumbnails don't ship the full multi-MB camera original just to show
// it at 96px — falls back to the original size if transform isn't enabled
// on the project (createSignedUrl just ignores the option).
export async function getSignedJobAttachmentUrl(
  fileUrl: string,
  expiresInSeconds = 3600,
  transform?: { width?: number; height?: number; quality?: number },
): Promise<string | null> {
  const marker = "/job-attachments/";
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  const filePath = fileUrl.slice(idx + marker.length);

  const { data, error } = await supabase.storage
    .from("job-attachments")
    .createSignedUrl(filePath, expiresInSeconds, transform ? { transform } : undefined);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
