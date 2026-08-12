import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "../../integrations/supabase/client";

const BOT_USERNAME = "OpusFormBot";

const inviteUrl = (token: string) => `https://t.me/${BOT_USERNAME}?start=${token}`;

type LinkState =
  | { status: "loading" }
  | { status: "linked"; username: string | null }
  | { status: "invited"; expiresAt: string; token: string }
  | { status: "none" };

export function TelegramLinkControl({ staffId }: { staffId: string }) {
  const [state, setState] = useState<LinkState>({ status: "loading" });
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

  const invite = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("create_telegram_invite", {
      p_target_id: staffId,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await navigator.clipboard.writeText(inviteUrl(data as string));
    toast.success("Invite link copied to clipboard");
    void load();
  };

  const revoke = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("revoke_telegram_link", {
      p_target_id: staffId,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Telegram access revoked");
    void load();
  };

  if (state.status === "loading") return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
        Telegram
      </span>

      {state.status === "linked" && (
        <>
          <span className="text-[12px]">Linked{state.username ? ` @${state.username}` : ""}</span>
          <Button size="sm" variant="destructive" disabled={busy} onClick={revoke}>
            Revoke
          </Button>
        </>
      )}

      {state.status === "invited" && (
        <>
          <span className="text-[12px]">
            Invited — expires {new Date(state.expiresAt).toLocaleDateString("en-GB")}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(inviteUrl(state.token));
              toast.success("Invite link copied");
            }}
          >
            Copy link
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={revoke}>
            Cancel
          </Button>
        </>
      )}

      {state.status === "none" && (
        <Button size="sm" disabled={busy} onClick={invite}>
          Invite to Telegram
        </Button>
      )}
    </div>
  );
}
