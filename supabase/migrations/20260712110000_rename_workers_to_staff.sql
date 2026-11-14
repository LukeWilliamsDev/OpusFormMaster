-- Rename workers table to staff when replaying an older schema. Newer
-- environments already have staff, so this must be a safe no-op there.
DO $$
BEGIN
  IF to_regclass('public.workers') IS NOT NULL
     AND to_regclass('public.staff') IS NULL THEN
    ALTER TABLE public.workers RENAME TO staff;
  END IF;

  IF to_regclass('public.staff') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.staff'::regclass
        AND tgname = 'workers_set_updated_at'
    ) THEN
      ALTER TRIGGER workers_set_updated_at ON public.staff RENAME TO staff_set_updated_at;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff' AND policyname = 'workers_select_authenticated') THEN
      ALTER POLICY "workers_select_authenticated" ON public.staff RENAME TO "staff_select_authenticated";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff' AND policyname = 'workers_insert_ops') THEN
      ALTER POLICY "workers_insert_ops" ON public.staff RENAME TO "staff_insert_ops";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff' AND policyname = 'workers_update_ops') THEN
      ALTER POLICY "workers_update_ops" ON public.staff RENAME TO "staff_update_ops";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff' AND policyname = 'workers_delete_ops') THEN
      ALTER POLICY "workers_delete_ops" ON public.staff RENAME TO "staff_delete_ops";
    END IF;
  END IF;
END $$;
