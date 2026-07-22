import { describe, it, expect } from "vitest";
import { groupNotesByDay, sortUpcomingReminders } from "../FeedTab";

describe("groupNotesByDay", () => {
  it("groups notes under their created_at calendar day, newest day first", () => {
    const notes = [
      {
        id: "1",
        created_at: "2026-07-20T09:00:00Z",
        body: "a",
        reminder_at: null,
        user_email: "x@y.com",
      },
      {
        id: "2",
        created_at: "2026-07-21T09:00:00Z",
        body: "b",
        reminder_at: null,
        user_email: "x@y.com",
      },
      {
        id: "3",
        created_at: "2026-07-21T15:00:00Z",
        body: "c",
        reminder_at: null,
        user_email: "x@y.com",
      },
    ];
    const grouped = groupNotesByDay(notes);
    expect(grouped.map((g) => g.day)).toEqual(["2026-07-21", "2026-07-20"]);
    expect(grouped[0].notes.map((n) => n.id)).toEqual(["3", "2"]);
  });
});

describe("sortUpcomingReminders", () => {
  it("returns only future reminder_at notes, soonest first", () => {
    const notes = [
      {
        id: "1",
        created_at: "2026-07-20T09:00:00Z",
        body: "a",
        reminder_at: "2026-08-01T09:00:00Z",
        user_email: "x@y.com",
      },
      {
        id: "2",
        created_at: "2026-07-20T09:00:00Z",
        body: "b",
        reminder_at: null,
        user_email: "x@y.com",
      },
      {
        id: "3",
        created_at: "2026-07-20T09:00:00Z",
        body: "c",
        reminder_at: "2026-07-25T09:00:00Z",
        user_email: "x@y.com",
      },
    ];
    const upcoming = sortUpcomingReminders(notes, new Date("2026-07-23T00:00:00Z"));
    expect(upcoming.map((n) => n.id)).toEqual(["3", "1"]);
  });

  it("excludes reminders in the past", () => {
    const notes = [
      {
        id: "1",
        created_at: "2026-07-20T09:00:00Z",
        body: "a",
        reminder_at: "2026-07-01T09:00:00Z",
        user_email: "x@y.com",
      },
    ];
    expect(sortUpcomingReminders(notes, new Date("2026-07-23T00:00:00Z"))).toEqual([]);
  });
});
