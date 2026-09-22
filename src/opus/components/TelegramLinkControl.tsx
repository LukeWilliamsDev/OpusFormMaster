import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { supabase } from "../../integrations/supabase/client";

const BOT_USERNAME = "OpusFormBot";

const inviteUrl = (token: string) => `https://t.me/${BOT_USERNAME}?start=${token}`;

type LinkState =
  | { status: "loading" }
  | { status: "linked"; username: string | null }
  | { status: "invited"; expiresAt: string; token: string }
  | { status: "none" };

// Matches the neutral outline buttons in the dossier action row (Edit).
const BUTTON_CLASS =
  "flex items-center justify-center gap-1 w-full sm:w-auto px-3 py-1.5 border border-border hover:bg-secondary rounded-lg text-[11px] font-bold text-foreground uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap";

export function TelegramLinkControl({
  staffId,
  staffName,
}: {
  staffId: string;
  staffName: string;
}) {
  const [state, setState] = useState<LinkState>({ status: "loading" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: link } = await supabase
      .from("telegram_links")
      .select("telegram_username")
      .eq("target_id", staffId)
      .is("revoked_at", null)
      .maybeSingle();

    if (link) {
      setState({ status: "linked", username: link.telegram_username });
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
        ? { status: "invited", expiresAt: invite.expires_at, token: invite.token }
        : { status: "none" },
    );
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(inviteUrl(token));
    toast.success("Invite link copied to clipboard");
  };

  const createInvite = async () => {
    if (busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_telegram_invite", {
      p_target_id: staffId,
    });
    setBusy(false);
    setDialogOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await copyLink(data as string);
    void load();
  };

  const revoke = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("revoke_telegram_link", {
      p_target_id: staffId,
    });
    setBusy(false);
    setDialogOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Telegram access revoked");
    void load();
  };

  if (state.status === "loading") return null;

  const label =
    state.status === "linked"
      ? state.username
        ? `Telegram @${state.username}`
        : "Telegram Linked"
      : state.status === "invited"
        ? "Telegram Invited"
        : "Invite to Telegram";

  return (
    <>
      <button type="button" onClick={() => setDialogOpen(true)} className={BUTTON_CLASS}>
        <Send className="w-3 h-3 text-muted-foreground" />
        <span>{label}</span>
      </button>

      {state.status === "none" && (
        <ConfirmDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tag="Telegram"
          title={`Invite ${staffName} to Telegram`}
          confirmLabel="Create invite link"
          onConfirm={() => void createInvite()}
          message={
            <div className="space-y-3 text-[12px] leading-relaxed">
              <p>
                This creates a single-use link that binds {staffName}&apos;s Telegram account to
                their staff record. The link is copied to your clipboard — you send it to them
                yourself. Nothing is sent automatically.
              </p>
              <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-1.5">
                <p className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                  Once linked they can
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>See their own next seven days of shifts</li>
                  <li>Nothing else — no other staff, no jobs, no financials</li>
                </ul>
              </div>
              <p className="text-muted-foreground">
                The link expires in 7 days, works once, and can be revoked at any time. Anyone who
                opens it becomes linked as {staffName}, so send it to them directly.
              </p>
            </div>
          }
        />
      )}

      {state.status === "invited" && (
        <ConfirmDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tone="destructive"
          tag="Telegram"
          title="Invite pending"
          confirmLabel="Cancel invite"
          cancelLabel="Close"
          onConfirm={() => void revoke()}
          message={
            <div className="space-y-3 text-[12px] leading-relaxed">
              <p>
                {staffName} has an unused invite, expiring{" "}
                <span className="font-semibold">
                  {new Date(state.expiresAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                . They have not opened it yet.
              </p>
              <button
                type="button"
                onClick={() => void copyLink(state.token)}
                className={BUTTON_CLASS}
              >
                Copy invite link again
              </button>
              <p className="text-muted-foreground">
                Cancelling makes the existing link dead immediately. You can issue a fresh one
                afterwards.
              </p>
            </div>
          }
        />
      )}

      {state.status === "linked" && (
        <ConfirmDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tone="destructive"
          tag="Telegram"
          title={`Revoke Telegram access for ${staffName}`}
          confirmLabel="Revoke access"
          cancelLabel="Close"
          onConfirm={() => void revoke()}
          message={
            <div className="space-y-3 text-[12px] leading-relaxed">
              <p>
                {staffName} is linked
                {state.username ? ` as @${state.username}` : ""} and can currently see their own
                shifts in Telegram.
              </p>
              <p>
                Revoking takes effect on their next message — the bot will stop responding to them
                entirely. Re-linking needs a fresh invite.
              </p>
            </div>
          }
        />
      )}
    </>
  );
}
