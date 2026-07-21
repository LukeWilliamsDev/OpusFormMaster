-- Enable Realtime on quotes (Quote Management pipeline) and audit_logs
-- (Scheduled Pours on the job page are audit_logs rows, see logPourAudit
-- in JobDetails.tsx) for the same reason jobs/shifts/staff are subscribed.
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
