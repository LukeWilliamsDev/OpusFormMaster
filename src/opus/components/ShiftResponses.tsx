import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../integrations/supabase/client";

type ShiftResponse = {
  id: string;
  date: string;
  status: "declined" | "confirmed" | "awaiting";
  workerName: string;
  siteName: string;
};

const STATUS = {
  declined: {
    label: "Declined",
    Icon: AlertTriangle,
    row: "bg-destructive/10 border-destructive/30",
    pill: "bg-destructive/20 border-destructive/30 text-destructive",
  },
  awaiting: {
    label: "No reply",
    Icon: Clock,
    row: "bg-warning/10 border-warning/20",
    pill: "bg-warning/20 border-warning/30 text-warning",
  },
  confirmed: {
    label: "Confirmed",
    Icon: CheckCircle2,
    row: "bg-success/10 border-success/20",
    pill: "bg-success/20 border-success/30 text-success",
  },
} as const;

/**
 * Shift replies from Telegram for the week ahead. Declines and unanswered
 * replies are listed first because both need an operations decision. A decline
 * never removes the shift; reassigning stays a deliberate decision in the roster.
 */
export function ShiftResponses() {
  const [rows, setRows] = useState<ShiftResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const weekEnd = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

      const { data, error: queryError } = await supabase
        .from("shifts")
        .select("id, date, confirmed_at, declined_at, staff(name), jobs(site_name)")
        .gte("date", today)
        .lte("date", weekEnd)
        .order("date");

      if (queryError) throw queryError;

      const mapped = (data ?? []).map((shift) => {
        const row = shift as Record<string, unknown>;
        const staff = row.staff as { name?: string } | null;
        const job = row.jobs as { site_name?: string } | null;
        return {
          id: row.id as string,
          date: row.date as string,
          status: row.declined_at
            ? ("declined" as const)
            : row.confirmed_at
              ? ("confirmed" as const)
              : ("awaiting" as const),
          workerName: staff?.name ?? "Unknown",
          siteName: job?.site_name ?? "Unassigned site",
        };
      });

      // Declines first, then unanswered, then confirmed — urgency order, not date.
      const rank = { declined: 0, awaiting: 1, confirmed: 2 };
      mapped.sort((a, b) => rank[a.status] - rank[b.status] || a.date.localeCompare(b.date));
      setRows(mapped);
    } catch (loadError) {
      console.error("Failed to load shift responses", loadError);
      setError("Shift responses are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div
        className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground"
        role="status"
      >
        Checking shift responses…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-card px-4 py-3 text-xs text-muted-foreground"
        role="alert"
      >
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void load()}
          className="shrink-0 font-black uppercase tracking-widest text-primary"
        >
          Try again
        </button>
      </div>
    );
  }

  const actionableRows = rows?.filter((row) => row.status !== "confirmed") ?? [];
  if (actionableRows.length === 0) return null;

  const needsAttention = actionableRows.length;

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
          Shift responses needing action
        </h3>
        {needsAttention > 0 && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-destructive/20 border border-destructive/30 text-destructive">
            {needsAttention} response{needsAttention === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="divide-y divide-border">
        {actionableRows.map((row) => {
          const style = STATUS[row.status];
          return (
            <Link
              key={row.id}
              to={`/portal/roster?view=calendar&date=${row.date}`}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 ${style.row}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <style.Icon className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold truncate">{row.workerName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {new Date(`${row.date}T00:00:00Z`).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    })}{" "}
                    — {row.siteName}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${style.pill}`}
              >
                {style.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
