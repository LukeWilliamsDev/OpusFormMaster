import { describe, expect, it } from "vitest";
import { getJobAttachmentPath } from "../attachmentUrl";

describe("getJobAttachmentPath", () => {
  it("normalises legacy public-style attachment URLs", () => {
    expect(
      getJobAttachmentPath(
        "https://example.supabase.co/storage/v1/object/public/job-attachments/jobs/job-1/photo.jpg",
      ),
    ).toBe("jobs/job-1/photo.jpg");
  });

  it("accepts new direct object paths", () => {
    expect(getJobAttachmentPath("jobs/job-1/photo.jpg")).toBe("jobs/job-1/photo.jpg");
  });

  it("rejects unrelated URLs", () => {
    expect(getJobAttachmentPath("https://example.com/photo.jpg")).toBeNull();
  });
});
