# Telegram Bot Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An invited operative opens a Telegram deep link, becomes bound to their `staff` row, and can ask the bot for their next seven days of shifts.

**Architecture:** The VPS bridge is a dumb relay — it POSTs each Telegram update to a Supabase edge function and sends back whatever comes out. All identity resolution, permission checking, and message rendering happen in `telegram-handler`. Invites are minted by a Postgres RPC so token generation never touches the client. Testable logic lives in a Deno-free module so Vitest can run it.

**Tech Stack:** Postgres + RLS, Supabase edge functions (Deno), React 19 + TypeScript, Vitest.

## Global Constraints

- Every new table carries `tenant_id uuid NOT NULL DEFAULT private.current_tenant_id()`.
- Operational access is gated by `private.can_write_ops(auth.uid())` — never re-implement the check.
- Bot never grants a role. `telegram_links` resolves to a row; role is read fresh from that row on every message.
- Edge function secrets: `TELEGRAM_BOT_TOKEN`, `OPUSFORM_BRIDGE_SECRET`. Both already set in Supabase. Never `VITE_`-prefixed, never in the repo.
- No new npm dependencies in this stage.
- Migration filenames: `YYYYMMDDHHMMSS_description.sql` in `supabase/migrations/`.
- Test files live in a `__tests__/` directory beside the code, named `*.test.ts`.
- Run tests with `npm run test`.

---

### Task 1: Invite and link tables

**Files:**

- Create: `supabase/migrations/20260813120000_add_telegram_tables.sql`

**Interfaces:**

- Consumes: `private.current_tenant_id()`, `private.can_write_ops(uuid)` — both already exist.
- Produces: tables `public.telegram_invites`, `public.telegram_links`; RPCs `public.create_telegram_invite(text)` returning `text`, and `public.revoke_telegram_link(text)` returning `void`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260813120000_add_telegram_tables.sql`:

```sql
-- Telegram identity binding. A link resolves a Telegram account to a staff row;
-- the role is always read fresh from that row, never stored here.

CREATE TABLE public.telegram_invites (
  token text PRIMARY KEY,
  target_id text NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  used_at timestamptz,
  tenant_id uuid NOT NULL DEFAULT private.current_tenant_id()
);

CREATE TABLE public.telegram_links (
  telegram_user_id text PRIMARY KEY,
  target_id text NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  class text NOT NULL DEFAULT 'staff' CHECK (class IN ('staff', 'guest')),
  telegram_username text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_seen_at timestamptz,
  tenant_id uuid NOT NULL DEFAULT private.current_tenant_id()
);

-- One live link per staff member. Revoked rows keep their history.
CREATE UNIQUE INDEX telegram_links_active_target_idx
  ON public.telegram_links(target_id) WHERE revoked_at IS NULL;
CREATE INDEX telegram_invites_target_idx ON public.telegram_invites(target_id);

ALTER TABLE public.telegram_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

-- Dispatchers and admins manage invites and links from the portal. The edge
-- function uses the service role and bypasses these policies entirely.
CREATE POLICY telegram_invites_select_ops ON public.telegram_invites FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY telegram_links_select_ops ON public.telegram_links FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

-- Token generation stays server-side so the client never chooses it.
CREATE OR REPLACE FUNCTION public.create_telegram_invite(p_target_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT private.can_write_ops(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised to create Telegram invites';
  END IF;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  -- Supersede any unused invite for this person so only the newest link works.
  UPDATE public.telegram_invites
     SET used_at = now()
   WHERE target_id = p_target_id AND used_at IS NULL;

  INSERT INTO public.telegram_invites (token, target_id)
  VALUES (v_token, p_target_id);

  INSERT INTO public.audit_logs (user_email, action, target_type, target_id, details)
  VALUES (auth.jwt() ->> 'email', 'telegram_invite_created', 'staff', p_target_id,
          jsonb_build_object('expires_in_days', 7));

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_telegram_link(p_target_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT private.can_write_ops(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised to revoke Telegram links';
  END IF;

  UPDATE public.telegram_links
     SET revoked_at = now()
   WHERE target_id = p_target_id AND revoked_at IS NULL;

  UPDATE public.telegram_invites
     SET used_at = now()
   WHERE target_id = p_target_id AND used_at IS NULL;

  INSERT INTO public.audit_logs (user_email, action, target_type, target_id, details)
  VALUES (auth.jwt() ->> 'email', 'telegram_link_revoked', 'staff', p_target_id, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.create_telegram_invite(text) FROM public;
REVOKE ALL ON FUNCTION public.revoke_telegram_link(text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_telegram_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_telegram_link(text) TO authenticated;

-- Archiving a staff member kills their Telegram access with no human step.
CREATE OR REPLACE FUNCTION private.revoke_telegram_on_archive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.is_archived IS TRUE AND COALESCE(OLD.is_archived, false) IS FALSE THEN
    UPDATE public.telegram_links
       SET revoked_at = now()
     WHERE target_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER revoke_telegram_on_archive_trg
  AFTER UPDATE OF is_archived ON public.staff
  FOR EACH ROW EXECUTE FUNCTION private.revoke_telegram_on_archive();
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push --project-ref fgpthpxmiroyebrzjdzo`
Expected: migration applies with no error.

- [ ] **Step 3: Verify the guard rails hold**

Run this in the SQL editor as an anonymous/unauthenticated role:

```sql
SELECT public.create_telegram_invite('any-staff-id');
```

Expected: `ERROR: Not authorised to create Telegram invites`.

Then, signed in as a dispatcher, confirm a real call returns a 48-character hex token and that calling it twice leaves only one row with `used_at IS NULL`:

```sql
SELECT count(*) FROM public.telegram_invites
 WHERE target_id = '<staff id>' AND used_at IS NULL;
```

Expected: `1`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260813120000_add_telegram_tables.sql
git commit -m "feat(telegram): add invite and link tables with RLS and revoke triggers"
```

---

### Task 2: Handler routing logic

Pure functions only — no Deno imports, so Vitest can run them directly. `index.ts` in Task 3 imports this module.

**Files:**

- Create: `supabase/functions/telegram-handler/lib.ts`
- Test: `supabase/functions/telegram-handler/__tests__/lib.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `type BridgeRequest = { telegram_user_id: string; chat_id: string; message_id?: number; kind: "text" | "callback" | "file"; payload: { text?: string }; sender?: { username?: string; first_name?: string } }`
  - `type HandlerResponse = { text: string; keyboard?: unknown; ack?: { link_added?: string; link_revoked?: string } }`
  - `parseCommand(text: string): { command: string; argument: string } | null`
  - `isValidBridgeSecret(header: string | null, expected: string | undefined): boolean`
  - `renderWeek(shifts: Array<{ date: string; site_name: string; postcode: string | null }>): string`
  - `DENY_TEXT: string`

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/telegram-handler/__tests__/lib.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DENY_TEXT, isValidBridgeSecret, parseCommand, renderWeek } from "../lib";

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
    expect(isValidBridgeSecret("wrong", "s3cret")).toBe(false);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib.test`
Expected: FAIL — cannot resolve `../lib`.

- [ ] **Step 3: Write the implementation**

Create `supabase/functions/telegram-handler/lib.ts`:

```ts
// Pure helpers for the Telegram handler. Deliberately free of Deno imports so
// Vitest can exercise them directly.

export type BridgeRequest = {
  telegram_user_id: string;
  chat_id: string;
  message_id?: number;
  kind: "text" | "callback" | "file";
  payload: { text?: string };
  sender?: { username?: string; first_name?: string };
};

export type HandlerResponse = {
  text: string;
  keyboard?: unknown;
  ack?: { link_added?: string; link_revoked?: string };
};

export const DENY_TEXT = "This bot is invite only. Please contact your dispatcher.";

export function parseCommand(text: string): { command: string; argument: string } | null {
  const match = String(text ?? "")
    .trim()
    .match(/^\/([a-z_]+)(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  return {
    command: match[1].toLowerCase(),
    argument: (match[2] ?? "").trim(),
  };
}

export function isValidBridgeSecret(header: string | null, expected: string | undefined): boolean {
  if (!expected || !header) return false;
  if (header.length !== expected.length) return false;
  // Constant-time compare: a length-safe XOR accumulation, so a wrong secret
  // cannot be recovered by timing the response.
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function renderWeek(
  shifts: Array<{ date: string; site_name: string; postcode: string | null }>,
): string {
  if (shifts.length === 0) return "No shifts booked in the next 7 days.";
  const lines = shifts.map((shift) => {
    const day = new Date(`${shift.date}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    const where = shift.postcode ? `${shift.site_name} (${shift.postcode})` : shift.site_name;
    return `${day} — ${where}`;
  });
  return `Your next 7 days:\n${lines.join("\n")}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib.test`
Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/telegram-handler/lib.ts supabase/functions/telegram-handler/__tests__/lib.test.ts
git commit -m "feat(telegram): add handler routing helpers with tests"
```

---

### Task 3: Edge function with the link action

**Files:**

- Create: `supabase/functions/telegram-handler/index.ts`

**Interfaces:**

- Consumes: `lib.ts` exports from Task 2; `public.telegram_invites` and `public.telegram_links` from Task 1.
- Produces: deployed function `telegram-handler` accepting the bridge contract and handling `/start <token>`.

- [ ] **Step 1: Write the function**

Create `supabase/functions/telegram-handler/index.ts`:

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  BridgeRequest,
  DENY_TEXT,
  HandlerResponse,
  isValidBridgeSecret,
  parseCommand,
} from "./lib.ts";

// The bridge authenticates with a shared secret, not a user JWT — it acts for
// Telegram senders who have no Supabase session. Service role is required so
// the function can resolve links regardless of RLS.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function handleStart(body: BridgeRequest, token: string): Promise<HandlerResponse> {
  if (!token) return { text: DENY_TEXT };

  const { data: invite } = await supabase
    .from("telegram_invites")
    .select("token, target_id, expires_at, used_at, tenant_id")
    .eq("token", token)
    .maybeSingle();

  if (!invite || invite.used_at || new Date(invite.expires_at) < new Date()) {
    return { text: DENY_TEXT };
  }

  // One Telegram account binds to exactly one identity.
  const { data: existing } = await supabase
    .from("telegram_links")
    .select("telegram_user_id, target_id")
    .eq("telegram_user_id", body.telegram_user_id)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing && existing.target_id !== invite.target_id) {
    return {
      text: "This Telegram account is already linked to a different Opus Form user.",
    };
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("id, name")
    .eq("id", invite.target_id)
    .maybeSingle();

  if (!staff) return { text: DENY_TEXT };

  await supabase.from("telegram_links").upsert(
    {
      telegram_user_id: body.telegram_user_id,
      target_id: invite.target_id,
      class: "staff",
      telegram_username: body.sender?.username ?? null,
      linked_at: new Date().toISOString(),
      revoked_at: null,
      tenant_id: invite.tenant_id,
    },
    { onConflict: "telegram_user_id" },
  );

  await supabase
    .from("telegram_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  await supabase.from("audit_logs").insert({
    user_email: null,
    action: "telegram_link_created",
    target_type: "staff",
    target_id: invite.target_id,
    details: {
      telegram_user_id: body.telegram_user_id,
      telegram_username: body.sender?.username ?? null,
    },
  });

  return {
    text: `Linked as ${staff.name}. Send /myweek to see your shifts.`,
    ack: { link_added: body.telegram_user_id },
  };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (
    !isValidBridgeSecret(
      req.headers.get("x-opusform-bridge-secret"),
      Deno.env.get("OPUSFORM_BRIDGE_SECRET"),
    )
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = (await req.json()) as BridgeRequest;
  const command = parseCommand(body.payload?.text ?? "");

  let result: HandlerResponse = { text: DENY_TEXT };
  if (command?.command === "start") {
    result = await handleStart(body, command.argument);
  }

  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json" },
  });
});
```

- [ ] **Step 2: Deploy**

Run: `supabase functions deploy telegram-handler --project-ref fgpthpxmiroyebrzjdzo --no-verify-jwt`

`--no-verify-jwt` is required: the bridge presents a shared secret, not a user JWT. The secret check is the gate.

- [ ] **Step 3: Verify rejection without the secret**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://fgpthpxmiroyebrzjdzo.supabase.co/functions/v1/telegram-handler \
  -H "content-type: application/json" -d '{}'
```

Expected: `403`.

- [ ] **Step 4: Verify a real token links**

Mint a token via `SELECT public.create_telegram_invite('<staff id>');`, then:

```bash
curl -s -X POST https://fgpthpxmiroyebrzjdzo.supabase.co/functions/v1/telegram-handler \
  -H "content-type: application/json" \
  -H "x-opusform-bridge-secret: <secret>" \
  -d '{"telegram_user_id":"99999","chat_id":"99999","kind":"text","payload":{"text":"/start <token>"}}'
```

Expected: JSON containing `Linked as <name>` and `ack.link_added`. Replaying the same command returns the deny text, because the token is now used.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/telegram-handler/index.ts
git commit -m "feat(telegram): add telegram-handler edge function with link action"
```

---

### Task 4: The myweek action

**Files:**

- Modify: `supabase/functions/telegram-handler/index.ts`

**Interfaces:**

- Consumes: `renderWeek` from Task 2; `telegram_links` from Task 1.
- Produces: `/myweek` returning the sender's next seven days.

- [ ] **Step 1: Add the resolver and handler**

Add `renderWeek` to the import from `./lib.ts`, then insert above `serve(...)`:

```ts
async function resolveLink(telegramUserId: string) {
  const { data } = await supabase
    .from("telegram_links")
    .select("target_id")
    .eq("telegram_user_id", telegramUserId)
    .is("revoked_at", null)
    .maybeSingle();
  return data?.target_id ?? null;
}

async function handleMyWeek(targetId: string): Promise<HandlerResponse> {
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const { data: shifts } = await supabase
    .from("shifts")
    .select("date, jobs(site_name, postcode)")
    .eq("worker_id", targetId)
    .gte("date", today)
    .lte("date", weekEnd)
    .order("date");

  const rows = (shifts ?? []).map((shift: Record<string, unknown>) => {
    const job = shift.jobs as { site_name?: string; postcode?: string } | null;
    return {
      date: shift.date as string,
      site_name: job?.site_name ?? "Unassigned site",
      postcode: job?.postcode ?? null,
    };
  });

  return { text: renderWeek(rows) };
}
```

- [ ] **Step 2: Route to it**

Replace the routing block in `serve` with:

```ts
let result: HandlerResponse = { text: DENY_TEXT };
if (command?.command === "start") {
  result = await handleStart(body, command.argument);
} else {
  const targetId = await resolveLink(body.telegram_user_id);
  if (!targetId) {
    result = { text: DENY_TEXT };
  } else {
    await supabase
      .from("telegram_links")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("telegram_user_id", body.telegram_user_id);

    if (command?.command === "myweek") {
      result = await handleMyWeek(targetId);
    } else {
      result = { text: "Commands: /myweek" };
    }
  }
}
```

An unlinked sender gets `DENY_TEXT` and learns nothing about whether the command exists.

- [ ] **Step 3: Deploy and verify**

Run: `supabase functions deploy telegram-handler --project-ref fgpthpxmiroyebrzjdzo --no-verify-jwt`

Then, using the Telegram ID linked in Task 3:

```bash
curl -s -X POST https://fgpthpxmiroyebrzjdzo.supabase.co/functions/v1/telegram-handler \
  -H "content-type: application/json" \
  -H "x-opusform-bridge-secret: <secret>" \
  -d '{"telegram_user_id":"99999","chat_id":"99999","kind":"text","payload":{"text":"/myweek"}}'
```

Expected: either a shift list or `No shifts booked in the next 7 days.` Repeat with an unlinked ID and expect the deny text.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/telegram-handler/index.ts
git commit -m "feat(telegram): add myweek command to telegram-handler"
```

---

### Task 5: Portal invite and revoke control

**Files:**

- Create: `src/opus/components/TelegramLinkControl.tsx`
- Modify: the staff dossier drawer — locate it with `grep -rn "Dossier" src/opus` and mount the component in the profile section.

**Interfaces:**

- Consumes: RPCs `create_telegram_invite(text)` and `revoke_telegram_link(text)` from Task 1; tables `telegram_links`, `telegram_invites`.
- Produces: `<TelegramLinkControl staffId={string} />`.

- [ ] **Step 1: Write the component**

Create `src/opus/components/TelegramLinkControl.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const BOT_USERNAME = "OpusFormBot";

type LinkState =
  | { status: "loading" }
  | { status: "linked"; username: string | null; since: string }
  | { status: "invited"; expiresAt: string; token: string }
  | { status: "none" };

export function TelegramLinkControl({ staffId }: { staffId: string }) {
  const [state, setState] = useState<LinkState>({ status: "loading" });

  const load = useCallback(async () => {
    const { data: link } = await supabase
      .from("telegram_links")
      .select("telegram_username, linked_at")
      .eq("target_id", staffId)
      .is("revoked_at", null)
      .maybeSingle();

    if (link) {
      setState({
        status: "linked",
        username: link.telegram_username,
        since: link.linked_at,
      });
      return;
    }

    const { data: invite } = await supabase
      .from("telegram_invites")
      .select("token, expires_at")
      .eq("target_id", staffId)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    setState(
      invite
        ? {
            status: "invited",
            expiresAt: invite.expires_at,
            token: invite.token,
          }
        : { status: "none" },
    );
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async () => {
    const { data, error } = await supabase.rpc("create_telegram_invite", {
      p_target_id: staffId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await navigator.clipboard.writeText(`https://t.me/${BOT_USERNAME}?start=${data}`);
    toast.success("Invite link copied to clipboard");
    void load();
  };

  const revoke = async () => {
    const { error } = await supabase.rpc("revoke_telegram_link", {
      p_target_id: staffId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Telegram access revoked");
    void load();
  };

  if (state.status === "loading") return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Telegram</span>
      {state.status === "linked" && (
        <>
          <span className="text-sm">Linked{state.username ? ` @${state.username}` : ""}</span>
          <Button size="sm" variant="destructive" onClick={revoke}>
            Revoke
          </Button>
        </>
      )}
      {state.status === "invited" && (
        <>
          <span className="text-sm">
            Invited — expires {new Date(state.expiresAt).toLocaleDateString("en-GB")}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              navigator.clipboard.writeText(`https://t.me/${BOT_USERNAME}?start=${state.token}`)
            }
          >
            Copy link
          </Button>
          <Button size="sm" variant="ghost" onClick={revoke}>
            Cancel
          </Button>
        </>
      )}
      {state.status === "none" && (
        <Button size="sm" onClick={invite}>
          Invite to Telegram
        </Button>
      )}
    </div>
  );
}
```

Confirm the Supabase client import path first — run `grep -rn "from \"@/integrations/supabase/client\"" src/opus | head -3` and match whatever the neighbouring components use.

- [ ] **Step 2: Mount it in the dossier drawer**

Run: `grep -rn "Dossier" src/opus --include=*.tsx | head`

Import the component in the drawer and render `<TelegramLinkControl staffId={worker.id} />` in the profile detail section, alongside the existing postcode and role fields. Match the surrounding layout classes rather than introducing new spacing.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

Then in the running app, open a staff dossier as a dispatcher:

- "Invite to Telegram" appears for an unlinked operative and copies a `t.me/OpusFormBot?start=…` link.
- After inviting, the control shows "Invited — expires …".
- "Revoke" returns it to the invite state.

- [ ] **Step 4: Commit**

```bash
git add src/opus/components/TelegramLinkControl.tsx
git add -u
git commit -m "feat(telegram): add invite and revoke control to staff dossier"
```

---

### Task 6: End-to-end verification

No code. This is the stage gate, and it needs Jinn's bridge work landed.

- [ ] **Step 1: Confirm the bridge is forwarding**

The bridge must have the routing fork and POST client from the handoff document deployed, with `OPUSFORM_HANDLER_URL` pointing at the deployed function.

- [ ] **Step 2: Link a real account**

Invite a test staff member in the portal, open the copied link on a phone, and press Start.

Expected: "Linked as <name>. Send /myweek to see your shifts."

- [ ] **Step 3: Read a real week**

Send `/myweek`.

Expected: the same shifts the portal shows for that operative.

- [ ] **Step 4: Confirm revocation bites**

Revoke in the portal, then send `/myweek` again.

Expected: the deny text.

- [ ] **Step 5: Confirm the audit trail**

```sql
SELECT action, target_id, details, created_at
  FROM public.audit_logs
 WHERE action LIKE 'telegram%'
 ORDER BY created_at DESC LIMIT 10;
```

Expected: `telegram_invite_created`, `telegram_link_created`, and `telegram_link_revoked` rows.

---

## Notes for later stages

- **`job_notes` already exists** (`20260723120000_add_job_notes_table.sql`) with `job_id`, `user_id`, `user_email`, `body`, `reminder_at`, `tenant_id`, and ops-only RLS. Stage 3 needs an author/source column and an operative insert policy scoped to jobs they hold a `shifts` row for — not a new table. The design spec is wrong on this point and should be corrected when stage 3 is planned.
- QR generation needs a dependency and is deferred to stage 2 with the bulk invite sheet, per section 9.2 of the spec.
