import { describe, it, expect } from "vitest";
import { groupNotesByDay } from "../FeedTab";

describe("groupNotesByDay", () => {
  it("groups notes under their created_at calendar day, newest day first", () => {
    const notes = [
      {
        id: "1",
        created_at: "2026-07-20T09:00:00Z",
        body: "a",
        user_email: "x@y.com",
      },
      {
        id: "2",
        created_at: "2026-07-21T09:00:00Z",
        body: "b",
        user_email: "x@y.com",
      },
      {
        id: "3",
        created_at: "2026-07-21T15:00:00Z",
        body: "c",
        user_email: "x@y.com",
      },
    ];
    const grouped = groupNotesByDay(notes);
    expect(grouped.map((g) => g.day)).toEqual(["2026-07-21", "2026-07-20"]);
    expect(grouped[0].notes.map((n) => n.id)).toEqual(["3", "2"]);
  });
});
