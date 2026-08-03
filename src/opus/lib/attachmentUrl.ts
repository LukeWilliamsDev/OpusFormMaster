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

export interface BatchSignedUrlsResult {
  fullUrl: string | null;
  thumbUrl: string | null;
}

/**
 * Batch sign multiple file URLs in 1 or 2 API calls instead of N roundtrips.
 */
export async function getSignedJobAttachmentUrlsBatch(
  fileUrls: string[],
  expiresInSeconds = 3600,
): Promise<Map<string, BatchSignedUrlsResult>> {
  const resultMap = new Map<string, BatchSignedUrlsResult>();
  const marker = "/job-attachments/";

  // Map input fileUrls to relative storage paths
  const validItems: { originalUrl: string; filePath: string }[] = [];
  for (const url of fileUrls) {
    if (!url) continue;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const filePath = url.slice(idx + marker.length);
      validItems.push({ originalUrl: url, filePath });
    }
  }

  if (validItems.length === 0) return resultMap;

  const paths = validItems.map((item) => item.filePath);

  // Fetch full size signed URLs and thumbnail signed URLs in parallel (batch calls)
  const [fullResResponse, thumbResResponse] = await Promise.all([
    supabase.storage.from("job-attachments").createSignedUrls(paths, expiresInSeconds),
    supabase.storage.from("job-attachments").createSignedUrls(paths, expiresInSeconds, {
      transform: { width: 400, quality: 75, resize: "contain" },
    }),
  ]);

  const fullMap = new Map<string, string>();
  if (fullResResponse.data) {
    for (const item of fullResResponse.data) {
      if (item.path && item.signedUrl) {
        fullMap.set(item.path, item.signedUrl);
      }
    }
  }

  const thumbMap = new Map<string, string>();
  if (thumbResResponse.data) {
    for (const item of thumbResResponse.data) {
      if (item.path && item.signedUrl) {
        thumbMap.set(item.path, item.signedUrl);
      }
    }
  }

  for (const item of validItems) {
    resultMap.set(item.originalUrl, {
      fullUrl: fullMap.get(item.filePath) || null,
      thumbUrl: thumbMap.get(item.filePath) || fullMap.get(item.filePath) || null,
    });
  }

  return resultMap;
}

