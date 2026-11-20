const MAX_PHOTO_DIMENSION = 2560;

// Re-encodes ordinary JPEG photos client-side at high quality and caps very
// large photos at a 2,560 px longest edge. Evidence upload paths do not call
// this helper and retain their original files.
// PNGs are left untouched because canvas PNG output is usually not smaller and
// converting them can damage transparency or evidence detail. Any unsupported
// image format, decode failure, or non-beneficial result falls back to original.
export async function compressImageFile(file: File): Promise<File> {
  if (file.type !== "image/jpeg" && file.type !== "image/jpg") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}

export function isVideoFile(file: Pick<File, "type" | "name">): boolean {
  return (
    file.type === "video/mp4" || file.type === "video/webm" || /\.(mp4|webm)$/i.test(file.name)
  );
}

export function isVideoAttachment(fileName: string): boolean {
  return /\.(mp4|webm)$/i.test(fileName);
}
