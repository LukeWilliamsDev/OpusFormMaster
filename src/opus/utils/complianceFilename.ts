const FALLBACK_PART = "compliance";

function slugifyPart(value: string, fallback = FALLBACK_PART): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || fallback;
}

export function getManualComplianceFilename(
  workerName: string,
  certificateType: string,
  extension: string,
): string {
  const nameParts = workerName.trim().split(/\s+/).filter(Boolean);
  const firstName = slugifyPart(nameParts[0] ?? "staff", "staff");
  const surname = slugifyPart(nameParts.length > 1 ? (nameParts.at(-1) ?? "") : "staff", "staff");
  const certificate = slugifyPart(certificateType);
  const safeExtension = slugifyPart(extension.replace(/^\./, ""), "bin");

  return `${firstName}_${surname}_${certificate}.${safeExtension}`;
}
