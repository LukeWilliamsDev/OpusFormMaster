// Re-encodes image files via canvas at quality 0.82, same resolution, before upload.
// Skips non-images and any file canvas can't decode (falls back to original).
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);

    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, outType, 0.82));
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name, { type: outType });
  } catch {
    return file;
  }
}
