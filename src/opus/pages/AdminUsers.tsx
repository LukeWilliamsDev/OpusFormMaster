import React, { useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { usePortal } from "../context/PortalContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { UserPlus } from "lucide-react";

const ROLES = [
  "admin",
  "director",
  "logistics_coordinator",
  "logistics_assistant",
  "site_foreman",
  "labourer",
] as const;

export const AdminUsers: React.FC = () => {
  const { profile } = usePortal();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("labourer");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setSubmitting(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const baseUrl = window.location.origin + window.location.pathname;
    const { data, error: fnError } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: email.trim(),
        full_name: fullName.trim(),
        role,
        tenant_id: profile?.tenant_id,
        redirectTo: baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl,
      },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    setSubmitting(false);
    if (fnError || data?.error) {
      let message = data?.error ?? fnError?.message ?? "Failed to create user.";
      if (!data?.error && fnError && "context" in fnError) {
        try {
          const body = await (fnError as { context: Response }).context.json();
          if (body?.error) message = body.error;
        } catch {
          // response body wasn't JSON, fall back to fnError.message
        }
      }
      setError(message);
      return;
    }
    setResult({ email: email.trim() });
    setEmail("");
    setFullName("");
    setRole("labourer");
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 w-full">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white font-archivo uppercase">
          Create User
        </h2>
        <p className="text-muted-foreground mt-2">
          Sends an invite email. The account has no access until they set their own password.
        </p>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
            <UserPlus className="h-4 w-4" />
            New account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-background border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                className="bg-background border border-border rounded-md px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {submitting ? "Sending invite..." : "Create user"}
            </button>
          </form>

          {result && (
            <div className="mt-6 p-4 rounded-md border border-primary/40 bg-primary/5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Invite sent
              </p>
              <p className="text-sm">
                <span className="font-mono">{result.email}</span> will receive an email to set their
                password before they can sign in.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
