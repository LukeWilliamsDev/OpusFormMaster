export const CERTIFICATE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const CERTIFICATE_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

type CertificateFileLike = {
  name: string;
  type: string;
  size: number;
};

const MIME_EXTENSION: Record<(typeof CERTIFICATE_UPLOAD_MIME_TYPES)[number], string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const normalizeCertificateMimeType = (mimeType: string): string =>
  mimeType.toLowerCase() === "image/jpg" ? "image/jpeg" : mimeType.toLowerCase();

export const validateCertificateFile = (file: CertificateFileLike): string | null => {
  const mimeType = normalizeCertificateMimeType(file.type);
  if (
    !CERTIFICATE_UPLOAD_MIME_TYPES.includes(
      mimeType as (typeof CERTIFICATE_UPLOAD_MIME_TYPES)[number],
    )
  ) {
    return "Only PDF, PNG, or JPG files are allowed.";
  }
  if (file.size > CERTIFICATE_UPLOAD_MAX_BYTES) {
    return "File size must be 10 MB or smaller.";
  }
  if (file.size < 1) {
    return "The selected file is empty.";
  }
  return null;
};

export const getCertificateFileExtension = (file: CertificateFileLike): string => {
  const mimeType = normalizeCertificateMimeType(file.type) as keyof typeof MIME_EXTENSION;
  if (mimeType in MIME_EXTENSION) return MIME_EXTENSION[mimeType];

  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return extension && extension.length <= 8 ? extension : "bin";
};

export const certificateUploadContentType = (file: CertificateFileLike): string =>
  normalizeCertificateMimeType(file.type);

export const sanitizeUploadPathSegment = (value: string, fallback = "file"): string => {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return sanitized || fallback;
};
