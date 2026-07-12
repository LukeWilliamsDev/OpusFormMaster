-- Rename workers table to staff
ALTER TABLE public.workers RENAME TO staff;

-- Rename trigger
ALTER TRIGGER workers_set_updated_at ON public.staff RENAME TO staff_set_updated_at;

-- Rename RLS policies
ALTER POLICY "workers_select_authenticated" ON public.staff RENAME TO "staff_select_authenticated";
ALTER POLICY "workers_insert_ops" ON public.staff RENAME TO "staff_insert_ops";
ALTER POLICY "workers_update_ops" ON public.staff RENAME TO "staff_update_ops";
ALTER POLICY "workers_delete_ops" ON public.staff RENAME TO "staff_delete_ops";
