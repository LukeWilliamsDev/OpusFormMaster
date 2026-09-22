import { describe, expect, it } from "vitest";
import {
  buildDocumentRequestLabel,
  buildJobCandidateLabel,
  buildUploadPath,
  cleanPostcode,
  daysUntil,
  DENY_TEXT,
  haversineMiles,
  isDeclaredUploadTypeAllowed,
  isManagementRole,
  isPendingExpired,
  isValidBridgeSecret,
  parsePendingCallback,
  nearestByDistance,
  parseCommand,
  renderJobStatus,
  renderStaffMatches,
  renderStaffStatus,
  renderToday,
  renderWeek,
  renderWho,
  sniffFileType,
  ticketStatusLine,
} from "../lib";

describe("parseCommand", () => {
  it("extracts a start token", () => {
    expect(parseCommand("/start abc123")).toEqual({
      command: "start",
      argument: "abc123",
    });
  });

  it("handles a bare command", () => {
    expect(parseCommand("/myweek")).toEqual({ command: "myweek", argument: "" });
  });

  it("strips a bot suffix", () => {
    expect(parseCommand("/myweek@OpusFormBot")).toEqual({
      command: "myweek",
      argument: "",
    });
  });

  it("returns null for plain text", () => {
    expect(parseCommand("when am i working")).toBeNull();
  });
});

describe("isValidBridgeSecret", () => {
  it("accepts a matching secret", () => {
    expect(isValidBridgeSecret("s3cret", "s3cret")).toBe(true);
  });

  it("rejects a mismatch", () => {
    expect(isValidBridgeSecret("wrong!", "s3cret")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isValidBridgeSecret(null, "s3cret")).toBe(false);
  });

  it("rejects when the server has no secret configured", () => {
    expect(isValidBridgeSecret("anything", undefined)).toBe(false);
  });
});

describe("renderWeek", () => {
  it("lists each shift with its site", () => {
    const out = renderWeek([
      { date: "2026-08-14", site_name: "Croydon Depot", postcode: "CR0 1AA" },
    ]);
    expect(out).toContain("Croydon Depot");
    expect(out).toContain("CR0 1AA");
  });

  it("says so when there are no shifts", () => {
    expect(renderWeek([])).toBe("No shifts booked in the next 7 days.");
  });

  it("omits the postcode when absent", () => {
    const out = renderWeek([{ date: "2026-08-14", site_name: "Croydon Depot", postcode: null }]);
    expect(out).toContain("Croydon Depot");
    expect(out).not.toContain("null");
  });
});

describe("DENY_TEXT", () => {
  it("gives no hint about why access failed", () => {
    expect(DENY_TEXT.toLowerCase()).not.toContain("token");
    expect(DENY_TEXT.toLowerCase()).not.toContain("expired");
  });
});

describe("isDeclaredUploadTypeAllowed", () => {
  it("accepts an allowed mime type", () => {
    expect(isDeclaredUploadTypeAllowed("image/jpeg", "cert.jpeg")).toBe(true);
  });

  it("accepts an allowed extension when mime type is missing", () => {
    expect(isDeclaredUploadTypeAllowed(undefined, "cert.pdf")).toBe(true);
  });

  it("rejects an unsupported type", () => {
    expect(isDeclaredUploadTypeAllowed("application/zip", "archive.zip")).toBe(false);
  });

  it("rejects when both mime type and extension are missing", () => {
    expect(isDeclaredUploadTypeAllowed(undefined, undefined)).toBe(false);
  });
});

describe("sniffFileType", () => {
  it("identifies a JPEG by magic bytes", () => {
    expect(sniffFileType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toEqual({
      mime: "image/jpeg",
      ext: "jpg",
    });
  });

  it("identifies a PNG by magic bytes", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffFileType(png)).toEqual({ mime: "image/png", ext: "png" });
  });

  it("identifies a PDF by magic bytes", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(sniffFileType(pdf)).toEqual({ mime: "application/pdf", ext: "pdf" });
  });

  it("rejects bytes that match no signature, regardless of a claimed mime type", () => {
    expect(sniffFileType(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });

  it("rejects a truncated file too short to carry a full signature", () => {
    expect(sniffFileType(new Uint8Array([0x89, 0x50]))).toBeNull();
  });
});

describe("buildUploadPath", () => {
  it("ignores the client filename and uses the server-generated uuid", () => {
    expect(buildUploadPath("requests/req-1", "abc-123", "pdf")).toBe("requests/req-1/abc-123.pdf");
  });
});

describe("cleanPostcode", () => {
  it("uppercases and strips whitespace", () => {
    expect(cleanPostcode(" sw1a 1aa ")).toBe("SW1A1AA");
  });
});

describe("haversineMiles", () => {
  it("returns zero for identical points", () => {
    expect(haversineMiles({ lat: 51.5, lng: -0.1 }, { lat: 51.5, lng: -0.1 })).toBe(0);
  });

  it("returns a positive distance for distinct points", () => {
    // Roughly London to Manchester, ~160-180 miles as the crow flies.
    const london = { lat: 51.5072, lng: -0.1276 };
    const manchester = { lat: 53.4808, lng: -2.2426 };
    const miles = haversineMiles(london, manchester);
    expect(miles).toBeGreaterThan(150);
    expect(miles).toBeLessThan(200);
  });
});

describe("nearestByDistance", () => {
  it("sorts ascending by distance and applies the limit", () => {
    const origin = { lat: 51.5, lng: -0.1 };
    const candidates = [
      { name: "Far", postcode: "EH1 1AA", coords: { lat: 55.95, lng: -3.19 } },
      { name: "Near", postcode: "SW1A 1AA", coords: { lat: 51.5012, lng: -0.1419 } },
      { name: "Mid", postcode: "B1 1AA", coords: { lat: 52.48, lng: -1.9 } },
    ];
    const result = nearestByDistance(origin, candidates, 2);
    expect(result.map((r) => r.name)).toEqual(["Near", "Mid"]);
    expect(result[0].distanceMiles).toBeLessThan(result[1].distanceMiles);
  });
});

describe("renderWho", () => {
  it("lists candidates with distance", () => {
    const out = renderWho([{ name: "Dave Smith", postcode: "SW1A 1AA", distanceMiles: 2.345 }]);
    expect(out).toContain("Dave Smith");
    expect(out).toContain("SW1A 1AA");
    expect(out).toContain("2.3");
  });

  it("says so when there are no candidates", () => {
    expect(renderWho([])).toBe("No staff records have a postcode set.");
  });
});

describe("daysUntil", () => {
  it("counts whole days to a future date", () => {
    expect(daysUntil("2026-08-20", "2026-08-13")).toBe(7);
  });

  it("returns a negative count for a past date", () => {
    expect(daysUntil("2026-08-01", "2026-08-13")).toBe(-12);
  });

  it("returns null for an unparseable date", () => {
    expect(daysUntil("not-a-date", "2026-08-13")).toBeNull();
  });
});

describe("ticketStatusLine", () => {
  it("phrases a future expiry", () => {
    expect(ticketStatusLine("CSCS", 7, "2026-08-20")).toBe("CSCS — expires in 7 days (2026-08-20)");
  });

  it("uses singular day phrasing for exactly one day", () => {
    expect(ticketStatusLine("CSCS", 1, "2026-08-14")).toBe("CSCS — expires in 1 day (2026-08-14)");
  });

  it("phrases expiry today", () => {
    expect(ticketStatusLine("CSCS", 0, "2026-08-13")).toBe("CSCS — expires today");
  });

  it("phrases a past expiry", () => {
    expect(ticketStatusLine("CSCS", -3, "2026-08-10")).toBe(
      "CSCS — expired 3 days ago (2026-08-10)",
    );
  });

  it("phrases a missing expiry date", () => {
    expect(ticketStatusLine("CSCS", null)).toBe("CSCS: no expiry date on file");
  });
});

describe("renderStaffStatus", () => {
  it("combines name, ticket lines, and next shift", () => {
    const out = renderStaffStatus("Dave Smith", ["CSCS — expires in 7 days (2026-08-20)"], {
      date: "2026-08-15",
      site_name: "Croydon Depot",
    });
    expect(out).toContain("Dave Smith");
    expect(out).toContain("CSCS");
    expect(out).toContain("Croydon Depot");
  });

  it("says so when there are no certificates or no upcoming shift", () => {
    const out = renderStaffStatus("Dave Smith", [], null);
    expect(out).toContain("No certificates on file.");
    expect(out).toContain("No upcoming shifts.");
  });
});

describe("renderStaffMatches", () => {
  it("lists the ambiguous names", () => {
    const out = renderStaffMatches(["Dave Smith", "Dave Jones"]);
    expect(out).toContain("Dave Smith");
    expect(out).toContain("Dave Jones");
    expect(out.toLowerCase()).toContain("specific");
  });
});

describe("renderJobStatus", () => {
  const job = {
    job_ref: "JOB-100",
    site_name: "Croydon Depot",
    status: "active",
    current_pours: 3,
    contract_max_pours: 10,
  };

  it("includes ref, status, pours, crew, and notes", () => {
    const out = renderJobStatus(
      job,
      [{ name: "Dave Smith" }, { name: "Jo Lee" }],
      [{ author: "Dave Smith", body: "Delivery arrived late" }],
    );
    expect(out).toContain("JOB-100");
    expect(out).toContain("Croydon Depot");
    expect(out).toContain("active");
    expect(out).toContain("3/10");
    expect(out).toContain("Dave Smith, Jo Lee");
    expect(out).toContain("Delivery arrived late");
  });

  it("says so when there is no crew booked today", () => {
    const out = renderJobStatus(job, [], []);
    expect(out).toContain("No crew booked today.");
  });

  it("omits the notes section when there are none", () => {
    const out = renderJobStatus(job, [], []);
    expect(out).not.toContain("Latest notes");
  });
});

describe("renderToday", () => {
  it("lists each site with its crew count", () => {
    const out = renderToday([
      { site_name: "Croydon Depot", postcode: "CR0 1AA", crewCount: 3 },
      { site_name: "Unassigned site", postcode: null, crewCount: 1 },
    ]);
    expect(out).toContain("Croydon Depot (CR0 1AA) — 3 crew");
    expect(out).toContain("Unassigned site — 1 crew");
  });

  it("says so when nothing is active today", () => {
    expect(renderToday([])).toBe("No sites active today.");
  });
});

describe("isManagementRole", () => {
  it("accepts each management role", () => {
    expect(isManagementRole("admin")).toBe(true);
    expect(isManagementRole("director")).toBe(true);
    expect(isManagementRole("logistics_coordinator")).toBe(true);
  });

  it("rejects a field role", () => {
    expect(isManagementRole("labourer")).toBe(false);
  });

  it("rejects null or undefined", () => {
    expect(isManagementRole(null)).toBe(false);
    expect(isManagementRole(undefined)).toBe(false);
  });
});

describe("buildDocumentRequestLabel", () => {
  it("joins requested certs", () => {
    expect(buildDocumentRequestLabel(["CSCS", "First Aid"])).toBe("CSCS, First Aid");
  });

  it("falls back when empty", () => {
    expect(buildDocumentRequestLabel([])).toBe("Document request");
  });

  it("falls back when null", () => {
    expect(buildDocumentRequestLabel(null)).toBe("Document request");
  });
});

describe("buildJobCandidateLabel", () => {
  it("uses the site name", () => {
    expect(buildJobCandidateLabel("Riverside Depot")).toBe("Riverside Depot");
  });

  it("falls back on empty string", () => {
    expect(buildJobCandidateLabel("")).toBe("Unassigned site");
  });

  it("falls back on null", () => {
    expect(buildJobCandidateLabel(null)).toBe("Unassigned site");
  });
});

describe("parsePendingCallback", () => {
  it("parses a valid pick", () => {
    expect(parsePendingCallback("pending:pick:abc-123:1")).toEqual({
      rowId: "abc-123",
      index: 1,
    });
  });

  it("returns null for a non-pending scope", () => {
    expect(parsePendingCallback("shift:confirm:abc")).toBeNull();
  });

  it("returns null for a non-numeric index", () => {
    expect(parsePendingCallback("pending:pick:abc-123:x")).toBeNull();
  });

  it("returns null for a missing index", () => {
    expect(parsePendingCallback("pending:pick:abc-123")).toBeNull();
  });
});

describe("isPendingExpired", () => {
  it("is not expired inside the 10-minute window", () => {
    expect(isPendingExpired("2026-08-14T12:00:00.000Z", "2026-08-14T12:09:59.000Z")).toBe(false);
  });

  it("is expired past the 10-minute window", () => {
    expect(isPendingExpired("2026-08-14T12:00:00.000Z", "2026-08-14T12:10:01.000Z")).toBe(true);
  });
});
