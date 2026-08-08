// Bundled for Composio deploy (--no-remote): no imports, no cross-file.

function corsHeaders(req) {
  const ALLOWED_ORIGINS = [
    "https://opusform.co.uk",
    "https://www.opusform.co.uk",
    "http://localhost:5173",
    "http://localhost:3000",
  ];
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin":
      origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// deno-lint-ignore-file no-explicit-any
// Allowlist of every action Jinn AI can invoke. This IS the scope boundary —
// if it's not a key here, Jinn cannot do it, no matter what the chat message
// says. Each handler still runs under the caller's RLS-scoped client, so a
// tenant_id leak here is defense-in-depth, not the only line of defense.
//
// No supabase-js (deploy path forbids remote imports) — RestDb below is a
// minimal PostgREST wrapper over fetch, enough for the query shapes these
// actions need.

type Filter = { column: string; op: string; value: string };

class QueryBuilder {
  private db: RestDb;
  private table: string;
  private selectCols = "*";
  private filters: Filter[] = [];
  private orderCol?: string;
  private orderAsc = true;
  private single_ = false;

  constructor(db: RestDb, table: string) {
    this.db = db;
    this.table = table;
  }

  select(cols: string) {
    this.selectCols = cols;
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push({ column, op: "eq", value: String(value) });
    return this;
  }
  gte(column: string, value: unknown) {
    this.filters.push({ column, op: "gte", value: String(value) });
    return this;
  }
  lte(column: string, value: unknown) {
    this.filters.push({ column, op: "lte", value: String(value) });
    return this;
  }
  order(column: string, opts: { ascending: boolean }) {
    this.orderCol = column;
    this.orderAsc = opts.ascending;
    return this;
  }
  single() {
    this.single_ = true;
    return this;
  }

  private buildQuery(extra: Record<string, string> = {}): string {
    const qs = new URLSearchParams();
    qs.set("select", this.selectCols);
    for (const f of this.filters) qs.append(f.column, `${f.op}.${f.value}`);
    if (this.orderCol) qs.set("order", `${this.orderCol}.${this.orderAsc ? "asc" : "desc"}`);
    for (const [k, v] of Object.entries(extra)) qs.set(k, v);
    return qs.toString();
  }

  async then<T>(resolve: (v: { data: T; error: null } | { data: null; error: Error }) => T) {
    const query = this.buildQuery();
    const res = await this.db.request(`${this.table}?${query}`, { method: "GET" });
    const result = await this.resultOf(res);
    return resolve(result as any);
  }

  private async resultOf(res: Response) {
    if (!res.ok) {
      return { data: null, error: new Error(await res.text()) };
    }
    const rows = await res.json();
    if (this.single_) {
      return { data: Array.isArray(rows) ? (rows[0] ?? null) : rows, error: null };
    }
    return { data: rows, error: null };
  }

  async update(patch: Record<string, unknown>) {
    const query = this.buildQuery();
    const res = await this.db.request(`${this.table}?${query}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
      prefer: "return=representation",
    });
    return this.resultOf(res);
  }

  async insert(row: Record<string, unknown>) {
    const res = await this.db.request(`${this.table}`, {
      method: "POST",
      body: JSON.stringify(row),
      prefer: "return=representation",
    });
    return this.resultOf(res);
  }

  async upsert(row: Record<string, unknown>) {
    const res = await this.db.request(`${this.table}`, {
      method: "POST",
      body: JSON.stringify(row),
      prefer: "return=representation,resolution=merge-duplicates",
    });
    return this.resultOf(res);
  }
}

export class RestDb {
  private supabaseUrl: string;
  private anonKey: string;
  private accessToken: string;
  auth: { getUser: () => Promise<{ data: { user: { id: string; email: string } | null } }> };

  constructor(
    supabaseUrl: string,
    anonKey: string,
    accessToken: string,
    user: { id: string; email: string } | null,
  ) {
    this.supabaseUrl = supabaseUrl;
    this.anonKey = anonKey;
    this.accessToken = accessToken;
    this.auth = { getUser: () => Promise.resolve({ data: { user } }) };
  }

  from(table: string) {
    return new QueryBuilder(this, table);
  }

  async request(
    path: string,
    opts: { method: string; body?: string; prefer?: string },
  ): Promise<Response> {
    const headers: Record<string, string> = {
      apikey: this.anonKey,
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };
    if (opts.prefer) headers["Prefer"] = opts.prefer;
    return fetch(`${this.supabaseUrl}/rest/v1/${path}`, {
      method: opts.method,
      headers,
      body: opts.body,
    });
  }
}

type Handler = (db: RestDb, params: Record<string, unknown>) => Promise<unknown>;

function str(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  if (typeof v !== "string" || !v.trim()) throw new Error(`Missing required param "${key}"`);
  return v;
}

export const ACTIONS: Record<string, Handler> = {
  // ---- Jobs / Pipeline ----------------------------------------------
  listJobs: async (db) => {
    const { data, error } = await db
      .from("jobs")
      .select(
        "id, job_ref, site_name, status, main_contractor, postcode, schedule_value, current_pours, contract_max_pours",
      )
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  moveJobStage: async (db, params) => {
    const jobId = str(params, "jobId");
    const status = str(params, "status");
    const { data, error } = await db.from("jobs").eq("id", jobId).update({ status });
    if (error) throw error;
    return data;
  },

  updateJobDetails: async (db, params) => {
    const jobId = str(params, "jobId");
    const allowedFields = [
      "site_name",
      "main_contractor",
      "postcode",
      "schedule_value",
      "current_pours",
      "contract_max_pours",
    ];
    const patch: Record<string, unknown> = {};
    for (const f of allowedFields) if (f in params) patch[f] = params[f];
    if (Object.keys(patch).length === 0) throw new Error("No editable fields supplied");
    const { data, error } = await db.from("jobs").eq("id", jobId).update(patch);
    if (error) throw error;
    return data;
  },

  // ---- Job notes (read + add only — no edit/delete) ------------------
  listJobNotes: async (db, params) => {
    const jobId = str(params, "jobId");
    const { data, error } = await db
      .from("job_notes")
      .select("id, body, created_at, reminder_at, user_email")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  addJobNote: async (db, params) => {
    const jobId = str(params, "jobId");
    const bodyText = str(params, "body");
    const reminderAt = typeof params.reminderAt === "string" ? params.reminderAt : null;
    const {
      data: { user },
    } = await db.auth.getUser();
    const { data, error } = await db.from("job_notes").insert({
      job_id: jobId,
      body: bodyText,
      reminder_at: reminderAt,
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
    });
    if (error) throw error;
    return data;
  },

  // ---- Job attachments (read only) -----------------------------------
  listJobAttachments: async (db, params) => {
    const jobId = str(params, "jobId");
    const { data, error } = await db
      .from("job_attachments")
      .select("id, file_name, type, file_url, uploaded_by, uploaded_at")
      .eq("job_id", jobId)
      .order("uploaded_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  // ---- Job diary (read only) ------------------------------------------
  listJobDiary: async (db, params) => {
    const jobId = str(params, "jobId");
    const { data, error } = await db
      .from("job_diary")
      .select("id, date, notes, hs_checklist")
      .eq("job_id", jobId)
      .order("date", { ascending: false });
    if (error) throw error;
    return data;
  },

  // ---- Labor Roster ----------------------------------------------------
  listStaff: async (db) => {
    const { data, error } = await db.from("staff").select("*");
    if (error) throw error;
    return data;
  },

  upsertStaff: async (db, params) => {
    const allowedFields = ["id", "name", "role", "phone", "email", "postcode", "is_archived"];
    const patch: Record<string, unknown> = {};
    for (const f of allowedFields) if (f in params) patch[f] = params[f];
    if (!patch.id && !patch.name) throw new Error("Need id (edit) or name (create)");
    const { data, error } = await db.from("staff").upsert(patch);
    if (error) throw error;
    return data;
  },

  archiveStaff: async (db, params) => {
    const id = str(params, "id");
    const { data, error } = await db.from("staff").eq("id", id).update({ is_archived: true });
    if (error) throw error;
    return data;
  },

  // ---- Calendar / Scheduling -------------------------------------------
  listCalendarEvents: async (db, params) => {
    const from = typeof params.from === "string" ? params.from : undefined;
    const to = typeof params.to === "string" ? params.to : undefined;
    let query = db.from("calendar_events").select("*");
    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    const { data, error } = await query.order("date", { ascending: true });
    if (error) throw error;
    return data;
  },

  assignShift: async (db, params) => {
    const jobId = str(params, "jobId");
    const staffId = str(params, "staffId");
    const date = str(params, "date");
    const { data, error } = await db
      .from("shifts")
      .insert({ job_id: jobId, staff_id: staffId, date });
    if (error) throw error;
    return data;
  },

  // ---- Quotes -------------------------------------------------------------
  listQuotes: async (db) => {
    const { data, error } = await db
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  upsertQuote: async (db, params) => {
    const allowedFields = ["id", "job_id", "status", "amount", "line_items"];
    const patch: Record<string, unknown> = {};
    for (const f of allowedFields) if (f in params) patch[f] = params[f];
    const { data, error } = await db.from("quotes").upsert(patch);
    if (error) throw error;
    return data;
  },

  // ---- Dashboard / summary -------------------------------------------------
  getDashboardSummary: async (db) => {
    const [{ data: jobs, error: jobsErr }, { data: staff, error: staffErr }] = await Promise.all([
      db.from("jobs").select("id, status"),
      db.from("staff").select("id, is_archived"),
    ]);
    if (jobsErr) throw jobsErr;
    if (staffErr) throw staffErr;
    return {
      totalJobs: (jobs as any[])?.length ?? 0,
      jobsByStatus: ((jobs as any[]) ?? []).reduce((acc: Record<string, number>, j: any) => {
        acc[j.status] = (acc[j.status] ?? 0) + 1;
        return acc;
      }, {}),
      activeStaff: ((staff as any[]) ?? []).filter((s: any) => !s.is_archived).length,
    };
  },
};

// Jinn AI gateway: the ONLY door Jinn is allowed to knock on. It never sees
// the service-role key and never runs raw SQL. Every call here signs in as
// the real admin user (via a stored refresh token) so Postgres RLS enforces
// tenant/role scoping exactly as it would for that user in the portal — no
// manually-injected `WHERE tenant_id = ...` to forget or bypass.
//
// No supabase-js / no remote imports: Composio's deploy path runs Deno with
// --no-remote, which rejects any https:// import at boot. Auth + REST calls
// below hit Supabase's HTTP APIs directly with fetch (built into Deno).
//
// Auth model:
//   1. Caller authenticates to THIS function with JINN_GATEWAY_SECRET
//      (shared secret between Jinn AI and this function only).
//   2. This function then signs in as the mapped admin user using a stored
//      Supabase refresh token, producing a short-lived user JWT.
//   3. All DB calls go through PostgREST with that JWT — RLS applies.
//
// Add a new capability by adding one entry to ACTIONS in actions.ts.
// Never add a raw-SQL or arbitrary-table action here.

interface GatewayRequest {
  action: string;
  params?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  const jsonHeaders = { ...corsHeaders(req), "Content-Type": "application/json" };

  const gatewaySecret = Deno.env.get("JINN_GATEWAY_SECRET");
  const suppliedSecret = req.headers.get("x-jinn-secret");
  if (!gatewaySecret || suppliedSecret !== gatewaySecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  let body: GatewayRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const { action, params = {} } = body;
  const handler = ACTIONS[action];
  if (!handler) {
    return new Response(
      JSON.stringify({ error: `Unknown action "${action}". Not on the allowlist.` }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const fallbackRefreshToken = Deno.env.get("JINN_ADMIN_REFRESH_TOKEN");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !fallbackRefreshToken) {
    return new Response(JSON.stringify({ error: "Gateway not configured" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  // Service-role client used ONLY to read/write the single row in
  // jinn_admin_session — RLS on that table has zero policies, so this is
  // the sole way to reach it. Every other query in this file goes through
  // the anon-key + user-JWT `db` client below, RLS fully enforced.
  const sessionTableHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
  const storedRes = await fetch(
    `${supabaseUrl}/rest/v1/jinn_admin_session?select=refresh_token&id=eq.true`,
    { headers: sessionTableHeaders },
  );
  const stored = storedRes.ok ? await storedRes.json() : [];
  const refreshToken = stored[0]?.refresh_token ?? fallbackRefreshToken;

  // Anon key + refresh token, never service-role for the actual data — RLS
  // stays active for every action handler.
  const exchangeToken = (token) =>
    fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: token }),
    });

  let tokenRes = await exchangeToken(refreshToken);

  // Concurrent invocations can race to consume the same stored refresh
  // token; whichever call loses gets "already_used". Re-read the row —
  // the winner has already persisted the newer token — and retry once.
  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    if (detail.includes("refresh_token_already_used")) {
      const retryRes = await fetch(
        `${supabaseUrl}/rest/v1/jinn_admin_session?select=refresh_token&id=eq.true`,
        { headers: sessionTableHeaders },
      );
      const retryStored = retryRes.ok ? await retryRes.json() : [];
      const retryToken = retryStored[0]?.refresh_token;
      if (retryToken && retryToken !== refreshToken) {
        tokenRes = await exchangeToken(retryToken);
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to establish admin session", detail }),
          { status: 502, headers: jsonHeaders },
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Failed to establish admin session", detail }),
        { status: 502, headers: jsonHeaders },
      );
    }
  }
  if (!tokenRes.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to establish admin session", detail: await tokenRes.text() }),
      { status: 502, headers: jsonHeaders },
    );
  }
  const session = await tokenRes.json();

  // Supabase rotates the refresh token on every exchange — persist the new
  // one so the next invocation doesn't reuse the now-dead one we just spent.
  if (session.refresh_token) {
    await fetch(`${supabaseUrl}/rest/v1/jinn_admin_session`, {
      method: "POST",
      headers: { ...sessionTableHeaders, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: true,
        refresh_token: session.refresh_token,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  // Scoped client: every query below carries this user's JWT, so PostgREST
  // enforces that user's RLS policies (tenant_id, role checks, etc).
  const db = new RestDb(supabaseUrl, anonKey, session.access_token, session.user);

  try {
    const result = await handler(db, params);
    return new Response(JSON.stringify({ result }), { headers: jsonHeaders });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      {
        status: 400,
        headers: jsonHeaders,
      },
    );
  }
});
