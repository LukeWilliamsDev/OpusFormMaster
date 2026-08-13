-- Daily shift reminders. 17:00 UTC = 18:00 BST / 17:00 GMT — late enough that
-- the day's roster changes have settled.
--
-- The shared secret is read from Vault rather than written inline, so it never
-- appears in cron.job, which is readable by anyone with database access. The
-- Vault entry is created once, by hand, and is deliberately not in this file:
--
--   select vault.create_secret('<value>', 'telegram_handler_secret');
--
-- Re-running this migration is safe: the schedule is unscheduled first.
-- telegram_notifications claims each send before dispatch, so a duplicate or
-- mistimed run cannot produce a duplicate message.

select cron.unschedule('telegram-shift-reminders')
where exists (select 1 from cron.job where jobname = 'telegram-shift-reminders');

select cron.schedule('telegram-shift-reminders', '0 17 * * *', $job$
  select net.http_post(
    url := 'https://fgpthpxmiroyebrzjdzo.supabase.co/functions/v1/telegram-notify',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-opusform-bridge-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'telegram_handler_secret')
    ),
    body := '{}'::jsonb
  );
$job$);
