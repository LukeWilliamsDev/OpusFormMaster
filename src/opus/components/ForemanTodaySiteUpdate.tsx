import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { usePortal } from "../context/PortalContext";

type Diary = Database["public"]["Tables"]["job_diary"]["Row"];
type Issue = Database["public"]["Tables"]["job_issues"]["Row"];
type Form = {
  work_summary: string;
  progress_status: "on_track" | "at_risk" | "blocked";
  blocker: string;
  ready_for_next_shift: "yes" | "no" | "not_sure";
  next_steps: string;
};
const emptyForm: Form = {
  work_summary: "",
  progress_status: "on_track",
  blocker: "",
  ready_for_next_shift: "not_sure",
  next_steps: "",
};
const localKey = (jobId: string) => `foreman-structured-update-${jobId}`;

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}
function fromDiary(row: Diary | null): Form {
  return {
    work_summary: row?.work_summary ?? "",
    progress_status: (row?.progress_status as Form["progress_status"]) ?? "on_track",
    blocker:
      row?.progress_status === "at_risk" || row?.progress_status === "blocked"
        ? (row.blocker_details ?? "")
        : "",
    ready_for_next_shift: (row?.ready_for_next_shift as Form["ready_for_next_shift"]) ?? "not_sure",
    next_steps: row?.next_steps ?? "",
  };
}
function labelStatus(value: string) {
  return value === "on_track" ? "On track" : value === "at_risk" ? "At risk" : "Blocked";
}

export const ForemanTodaySiteUpdate: React.FC<{ jobId: string; readOnly?: boolean }> = ({
  jobId,
  readOnly = false,
}) => {
  const { user } = usePortal();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"draft" | "submitted" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isLocal = import.meta.env.DEV && jobId.startsWith("local-foreman-");
  const isIssueStatus = form.progress_status !== "on_track";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (isLocal) {
      try {
        const stored = JSON.parse(localStorage.getItem(localKey(jobId)) ?? "null") as {
          diary?: Diary;
          issue?: Issue;
        } | null;
        const localDiary =
          stored?.diary ??
          ({
            id: `${jobId}-structured-diary`,
            job_id: jobId,
            date: today(),
            entry_status: "draft",
            progress_status: "on_track",
            work_summary: "Pour 2 complete. No blockers reported.",
            blocker_details: null,
            next_steps: "Continue with the planned pour.",
            ready_for_next_shift: "yes",
            issue_id: null,
            notes: null,
            hs_checklist: [],
            created_at: new Date().toISOString(),
            created_by: null,
            submitted_at: null,
            submitted_by: null,
            tenant_id: "local-fixture",
            updated_at: new Date().toISOString(),
            updated_by: null,
          } as Diary);
        setDiary(localDiary);
        setIssue(stored?.issue ?? null);
        setForm(fromDiary(localDiary));
      } catch {
        setError("The local update fixture could not be loaded.");
      }
      setLoading(false);
      return;
    }
    const { data, error: diaryError } = await supabase
      .from("job_diary")
      .select("*")
      .eq("job_id", jobId)
      .eq("date", today())
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (diaryError) {
      setError("Today’s site update could not be loaded.");
      setLoading(false);
      return;
    }
    const row = data as Diary | null;
    setDiary(row);
    setForm(fromDiary(row));
    if (row?.issue_id) {
      const result = await supabase
        .from("job_issues")
        .select("*")
        .eq("id", row.issue_id)
        .maybeSingle();
      setIssue((result.data as Issue | null) ?? null);
    } else setIssue(null);
    setLoading(false);
  }, [isLocal, jobId]);
  useEffect(() => {
    void load();
  }, [load]);

  const validate = (submit: boolean) => {
    const next: Record<string, string> = {};
    if (submit && !form.work_summary.trim()) next.work_summary = "Add what was completed today.";
    if (isIssueStatus && !form.blocker.trim()) next.blocker = "Describe the blocker or risk.";
    if (form.work_summary.length > 10000) next.work_summary = "Use 10,000 characters or fewer.";
    if (form.blocker.length > 10000) next.blocker = "Use 10,000 characters or fewer.";
    if (form.next_steps.length > 10000) next.next_steps = "Use 10,000 characters or fewer.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (entryStatus: "draft" | "submitted") => {
    if (readOnly || !validate(entryStatus === "submitted")) return;
    setSaving(entryStatus);
    setError(null);
    const payload = {
      job_id: jobId,
      date: today(),
      entry_status: entryStatus,
      progress_status: form.progress_status,
      work_summary: form.work_summary.trim() || null,
      blocker_details: isIssueStatus ? form.blocker.trim() : null,
      next_steps: form.next_steps.trim() || null,
      ready_for_next_shift: form.ready_for_next_shift,
      issue_id: issue?.id ?? null,
    };
    try {
      let nextIssue = issue;
      if (isIssueStatus) {
        const issuePayload = {
          job_id: jobId,
          title: `Site update: ${labelStatus(form.progress_status)}`,
          description: form.blocker.trim(),
          severity: "medium",
          status: "open",
          reported_by: user?.id ?? "local-foreman-user",
        };
        if (isLocal)
          nextIssue = {
            ...(issue ?? {
              id: `${jobId}-issue`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              tenant_id: "local-fixture",
              resolution_summary: null,
              resolved_at: null,
              resolved_by: null,
            }),
            ...issuePayload,
          } as Issue;
        else if (issue?.id && !["resolved", "closed", "dismissed"].includes(issue.status)) {
          // Foremen may continue editing the daily record, but Operations owns
          // issue lifecycle changes. The current blocker text is stored on
          // blocker_details; the issue remains the escalation record.
          nextIssue = issue;
        } else {
          const result = await supabase.from("job_issues").insert(issuePayload).select().single();
          if (result.error) throw result.error;
          nextIssue = result.data as Issue;
        }
        payload.issue_id = nextIssue.id;
      }
      let savedDiary: Diary;
      if (isLocal)
        savedDiary = {
          ...(diary ?? {
            id: `${jobId}-structured-diary`,
            created_at: new Date().toISOString(),
            created_by: null,
            blocker_details: null,
            submitted_at: null,
            submitted_by: null,
            tenant_id: "local-fixture",
            updated_by: null,
            hs_checklist: [],
          }),
          ...payload,
          updated_at: new Date().toISOString(),
        } as Diary;
      else {
        const result = diary?.id
          ? await supabase.from("job_diary").update(payload).eq("id", diary.id).select().single()
          : await supabase.from("job_diary").insert(payload).select().single();
        if (result.error) throw result.error;
        savedDiary = result.data as Diary;
      }
      setDiary(savedDiary);
      setIssue(nextIssue);
      setForm(fromDiary(savedDiary));
      if (isLocal)
        localStorage.setItem(
          localKey(jobId),
          JSON.stringify({ diary: savedDiary, issue: nextIssue }),
        );
      toast.success(entryStatus === "submitted" ? "Today’s update submitted" : "Draft saved");
    } catch (saveError) {
      console.error(saveError);
      setError("The update could not be saved. Your input is still here.");
    } finally {
      setSaving(null);
    }
  };

  const statusText = useMemo(
    () =>
      diary
        ? `${diary.entry_status === "submitted" ? "Submitted" : "Draft"} · ${labelStatus(diary.progress_status)}`
        : "Not started",
    [diary],
  );
  return (
    <section
      id="today-site-update"
      className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6"
      aria-labelledby="today-site-update-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="today-site-update-heading"
            className="text-xs font-black uppercase tracking-[0.14em]"
          >
            Today&apos;s site update
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record today&apos;s work and hand off clearly to the next shift.
          </p>
        </div>
        <span className="w-fit rounded-full bg-secondary px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          {loading ? "Loading..." : statusText}
        </span>
      </div>
      {loading ? (
        <div role="status" className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading today&apos;s update...
        </div>
      ) : readOnly ? null : (
        <form
          className="mt-5 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save("submitted");
          }}
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
          <div>
            <label htmlFor="today-work-summary" className="text-sm font-semibold">
              Work completed today
            </label>
            <textarea
              id="today-work-summary"
              value={form.work_summary}
              onChange={(e) => setForm({ ...form, work_summary: e.target.value })}
              placeholder="What was completed, and what changed on site?"
              className="mt-2 min-h-28 w-full rounded-lg border border-border bg-background p-3 text-sm focus:ring-2 focus:ring-primary"
              aria-invalid={!!fieldErrors.work_summary}
            />
            {fieldErrors.work_summary && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.work_summary}</p>
            )}
          </div>
          <div>
            <label htmlFor="today-progress" className="text-sm font-semibold">
              Site status
            </label>
            <select
              id="today-progress"
              value={form.progress_status}
              onChange={(e) =>
                setForm({ ...form, progress_status: e.target.value as Form["progress_status"] })
              }
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="on_track">On track</option>
              <option value="at_risk">At risk</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          {isIssueStatus && (
            <div>
              <label htmlFor="today-blocker" className="text-sm font-semibold">
                Blocker or risk details
              </label>
              <textarea
                id="today-blocker"
                value={form.blocker}
                onChange={(e) => setForm({ ...form, blocker: e.target.value })}
                placeholder="Describe the blocker or risk and any help needed."
                className="mt-2 min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm focus:ring-2 focus:ring-primary"
                aria-invalid={!!fieldErrors.blocker}
              />
              {fieldErrors.blocker && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.blocker}</p>
              )}
            </div>
          )}
          <div>
            <label htmlFor="today-ready" className="text-sm font-semibold">
              Ready for next shift?
            </label>
            <select
              id="today-ready"
              value={form.ready_for_next_shift}
              onChange={(e) =>
                setForm({
                  ...form,
                  ready_for_next_shift: e.target.value as Form["ready_for_next_shift"],
                })
              }
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="not_sure">Not sure</option>
            </select>
          </div>
          <div>
            <label htmlFor="today-next-steps" className="text-sm font-semibold">
              Next shift handoff
            </label>
            <textarea
              id="today-next-steps"
              value={form.next_steps}
              onChange={(e) => setForm({ ...form, next_steps: e.target.value })}
              placeholder="What should the next shift pick up or know?"
              className="mt-2 min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm focus:ring-2 focus:ring-primary"
              aria-invalid={!!fieldErrors.next_steps}
            />
            {fieldErrors.next_steps && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.next_steps}</p>
            )}
          </div>
          {issue && (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-sm dark:bg-amber-400/10">
              <p className="font-bold">
                <AlertTriangle className="mr-1 inline h-4 w-4" />
                Linked {issue.severity} issue · {issue.status}
              </p>
              <p className="mt-1 text-muted-foreground">{issue.description}</p>
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
            <Button type="submit" className="min-h-11" disabled={!!saving}>
              {saving === "submitted"
                ? "Submitting..."
                : diary?.entry_status === "submitted"
                  ? "Update submitted entry"
                  : "Submit update"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 text-muted-foreground"
              disabled={!!saving}
              onClick={() => void save("draft")}
            >
              {saving === "draft" ? "Saving draft..." : "Save draft"}
            </Button>
          </div>
        </form>
      )}
      {readOnly && !diary && !loading && (
        <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          No update was recorded for this site.
        </p>
      )}
      {readOnly && diary && (
        <div className="mt-5 space-y-3 text-sm">
          <p>
            <strong>Work completed:</strong> {diary.work_summary || "Not provided"}
          </p>
          <p>
            <strong>Status:</strong> {labelStatus(diary.progress_status)}
          </p>
          <p>
            <strong>Next shift:</strong> {diary.next_steps || "Not provided"}
          </p>
          {issue && (
            <p>
              <strong>Issue:</strong> {issue.title} — {issue.description}
            </p>
          )}
        </div>
      )}
    </section>
  );
};
