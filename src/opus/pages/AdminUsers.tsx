import React, { useEffect, useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { usePortal } from "../context/PortalContext";
import { CardGrid } from "../components/CardGrid";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NoticeModal } from "@/components/ui/notice-modal";
import { toast } from "sonner";
import {
  UserPlus,
  Pencil,
  Ban,
  Archive,
  RotateCcw,
  X,
  Loader2,
  Trash2,
  Search,
  Users2,
} from "lucide-react";

const ROLES = [
  "admin",
  "director",
  "logistics_coordinator",
  "logistics_assistant",
  "site_foreman",
  "labourer",
] as const;

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: (typeof ROLES)[number];
  status: "active" | "disabled" | "archived";
};

const STATUS_STYLE: Record<ProfileRow["status"], string> = {
  active: "bg-success/10 text-success border-success/20",
  disabled: "bg-warning/10 text-warning border-warning/20",
  archived: "bg-destructive/10 text-destructive border-destructive/20",
};

const inputClass =
  "bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

const callManageUser = async (body: Record<string, unknown>) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data, error: fnError } = await supabase.functions.invoke("admin-manage-user", {
    body,
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
  });
  if (fnError || data?.error) {
    let message = data?.error ?? fnError?.message ?? "Action failed.";
    if (!data?.error && fnError && "context" in fnError) {
      try {
        const respBody = await (fnError as { context: Response }).context.json();
        if (respBody?.error) message = respBody.error;
      } catch {
        // response body wasn't JSON, fall back to fnError.message
      }
    }
    throw new Error(message);
  }
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="bg-card border border-border rounded-xl w-full max-w-md">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-xs font-black uppercase tracking-wider text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const CreateUserModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({
  onClose,
  onCreated,
}) => {
  const { profile } = usePortal();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("labourer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!profile?.tenant_id) {
      setError("Your profile is still loading. Please try again in a moment.");
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
    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <NoticeModal
        open
        onOpenChange={() => onCreated()}
        tone="success"
        title="Invite sent"
        message={`${sentTo} will receive an email to set their password before they can sign in.`}
      />
    );
  }

  return (
    <Modal title="New account" onClose={onClose}>
      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground -mt-1">
          Sends an invite email. No access until they set their own password.
        </p>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
            className={inputClass}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send invite"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const EditUserModal: React.FC<{
  user: ProfileRow;
  onClose: () => void;
  onSaved: () => void;
}> = ({ user, onClose, onSaved }) => {
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await callManageUser({
        user_id: user.id,
        action: "update",
        full_name: fullName,
        role,
        email: email.trim(),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal title={`Edit ${user.email}`} onClose={onClose}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
              className={inputClass}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={saving}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        tone="neutral"
        title="Save changes to this account?"
        message={`${user.email} will be updated to role "${role}"${fullName !== (user.full_name ?? "") ? ` with name "${fullName}"` : ""}${email.trim() !== user.email ? ` and email "${email.trim()}"` : ""}.`}
        confirmLabel="Save"
        onConfirm={() => {
          setConfirmOpen(false);
          handleSave();
        }}
      />
    </>
  );
};

type StatusAction = "disable" | "archive" | "reactivate" | "delete";

const STATUS_ACTION_COPY: Record<
  StatusAction,
  {
    title: string;
    message: (email: string) => string;
    confirmLabel: string;
    tone: "neutral" | "destructive";
    pastTense: string;
  }
> = {
  disable: {
    title: "Disable this account?",
    message: (email) => `${email} will immediately lose access until reactivated.`,
    confirmLabel: "Disable",
    tone: "destructive",
    pastTense: "disabled",
  },
  archive: {
    title: "Archive this account?",
    message: (email) => `${email} will be locked out and hidden from active views.`,
    confirmLabel: "Archive",
    tone: "destructive",
    pastTense: "archived",
  },
  reactivate: {
    title: "Reactivate this account?",
    message: (email) => `${email} will regain access immediately.`,
    confirmLabel: "Reactivate",
    tone: "neutral",
    pastTense: "reactivated",
  },
  delete: {
    title: "Permanently delete this account?",
    message: (email) =>
      `${email} and their login will be permanently deleted. This cannot be undone.`,
    confirmLabel: "Delete forever",
    tone: "destructive",
    pastTense: "deleted",
  },
};

export const AdminUsers: React.FC = () => {
  const { user } = usePortal();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<ProfileRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: StatusAction } | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    user: ProfileRow;
    action: StatusAction;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | (typeof ROLES)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProfileRow["status"]>("all");

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, status")
      .order("email");
    setUsers((data as ProfileRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleStatusAction = async (target: ProfileRow, action: StatusAction) => {
    setActionError(null);
    setBusy({ id: target.id, action });
    try {
      await callManageUser({ user_id: target.id, action });
      await loadUsers();
      toast.success(`${target.email} ${STATUS_ACTION_COPY[action].pastTense}.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Action failed.";
      setActionError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      u.email.toLowerCase().includes(term) ||
      (u.full_name ?? "").toLowerCase().includes(term);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-6 animate-fade-in text-foreground flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border pb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Users2 className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-archivo tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground sm:whitespace-nowrap">
            Create, edit, disable, or archive accounts. All actions are logged in the site log.
          </p>
        </div>
      </div>

      {actionError && <p className="text-sm text-red-500">{actionError}</p>}

      <div className="flex-grow bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-border bg-secondary/50">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              className="min-w-0 bg-background border border-border rounded-lg px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="min-w-0 bg-background border border-border rounded-lg px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="archived">Archived</option>
            </select>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-wider shrink-0 hover:opacity-90 transition-opacity"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">New user</span>
            </button>
          </div>
        </div>
        {loading ? (
          <div className="py-20 text-center text-xs font-mono text-muted-foreground">
            Loading users...
          </div>
        ) : (
          <CardGrid
            items={filteredUsers}
            className="divide-y divide-border px-4"
            emptyMessage="No users match your search."
            renderCard={(u) => {
              const actionButtons = (
                <>
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => setEditingUser(u)}
                    disabled={!!busy}
                    className="p-1.5 sm:p-1.5 rounded bg-secondary border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {u.status !== "disabled" &&
                    u.status !== "archived" &&
                    u.email !== user?.email && (
                      <button
                        type="button"
                        title="Disable"
                        onClick={() => setPendingAction({ user: u, action: "disable" })}
                        disabled={!!busy}
                        className="p-1.5 rounded bg-secondary border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
                      >
                        {busy?.id === u.id && busy.action === "disable" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  {u.status !== "archived" && u.email !== user?.email && (
                    <button
                      type="button"
                      title="Archive"
                      onClick={() => setPendingAction({ user: u, action: "archive" })}
                      disabled={!!busy}
                      className="p-1.5 rounded bg-secondary border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
                    >
                      {busy?.id === u.id && busy.action === "archive" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  {u.status !== "active" && (
                    <button
                      type="button"
                      title="Reactivate"
                      onClick={() => setPendingAction({ user: u, action: "reactivate" })}
                      disabled={!!busy}
                      className="p-1.5 rounded bg-secondary border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
                    >
                      {busy?.id === u.id && busy.action === "reactivate" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  {u.email !== user?.email && (
                    <button
                      type="button"
                      title="Delete permanently"
                      onClick={() => setPendingAction({ user: u, action: "delete" })}
                      disabled={!!busy}
                      className="p-1.5 rounded bg-secondary border border-border text-muted-foreground hover:text-red-400 disabled:opacity-30 transition-all min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    >
                      {busy?.id === u.id && busy.action === "delete" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </>
              );

              return (
                <div
                  key={u.id}
                  className={`py-3.5 transition-opacity ${busy?.id === u.id ? "opacity-50" : "opacity-100"}`}
                >
                  {/* Desktop / tablet row */}
                  <div className="hidden sm:flex sm:items-center gap-3">
                    <div className="min-w-0 flex-1 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_100px] items-center gap-x-6">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-foreground truncate">
                          {u.full_name || u.email}
                        </div>
                        {u.full_name && (
                          <div className="text-[12px] text-muted-foreground truncate">
                            {u.email}
                          </div>
                        )}
                      </div>
                      <div className="text-[12px] font-mono text-muted-foreground truncate">
                        {u.role.replace(/_/g, " ")}
                      </div>
                      <span
                        key={u.status}
                        className={`inline-flex w-fit text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 animate-in fade-in zoom-in-95 duration-300 ${STATUS_STYLE[u.status]}`}
                      >
                        {u.status}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0 w-[168px] justify-end">{actionButtons}</div>
                  </div>

                  {/* Mobile row */}
                  <div className="flex sm:hidden flex-col gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-foreground truncate">
                          {u.full_name || u.email}
                        </div>
                        {u.full_name && (
                          <div className="text-[12px] text-muted-foreground truncate">
                            {u.email}
                          </div>
                        )}
                      </div>
                      <span
                        key={u.status}
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${STATUS_STYLE[u.status]}`}
                      >
                        {u.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-mono text-muted-foreground truncate min-w-0 flex-1">
                        {u.role.replace(/_/g, " ")}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
                        {actionButtons}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadUsers();
          }}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            loadUsers();
          }}
        />
      )}

      {pendingAction && (
        <ConfirmDialog
          open={!!pendingAction}
          onOpenChange={(open) => !open && setPendingAction(null)}
          tone={STATUS_ACTION_COPY[pendingAction.action].tone}
          title={STATUS_ACTION_COPY[pendingAction.action].title}
          message={STATUS_ACTION_COPY[pendingAction.action].message(pendingAction.user.email)}
          confirmLabel={STATUS_ACTION_COPY[pendingAction.action].confirmLabel}
          onConfirm={() => {
            const { user, action } = pendingAction;
            setPendingAction(null);
            handleStatusAction(user, action);
          }}
        />
      )}
    </div>
  );
};
