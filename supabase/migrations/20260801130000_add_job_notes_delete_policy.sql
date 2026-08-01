-- job_notes had no DELETE policy, so the "remove note" feature being added
-- to FeedTab.tsx would silently no-op under RLS. Same can_write_ops+tenant
-- scoping as the existing select/insert policies.
CREATE POLICY job_notes_delete_ops ON public.job_notes FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
