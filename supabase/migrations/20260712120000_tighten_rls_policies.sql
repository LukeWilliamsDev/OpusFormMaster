-- 1. Tighten Quotes RLS (Only admins/dispatchers can select quotes)
DROP POLICY IF EXISTS quotes_select_authenticated ON public.quotes;
CREATE POLICY quotes_select_authenticated ON public.quotes
  FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()));

-- 2. Tighten Jobs RLS (Only admins/dispatchers can select jobs)
DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;
CREATE POLICY jobs_select_authenticated ON public.jobs
  FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()));

-- 3. Tighten Staff RLS (Admins/dispatchers can see all; operatives can only see their own staff record)
DROP POLICY IF EXISTS staff_select_authenticated ON public.staff;
CREATE POLICY staff_select_authenticated ON public.staff
  FOR SELECT TO authenticated
  USING (
    private.can_write_ops(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.email = staff.email
    )
  );

-- 4. Tighten Shifts RLS (Admins/dispatchers can see all; operatives can only see their own shifts)
DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
CREATE POLICY shifts_select_authenticated ON public.shifts
  FOR SELECT TO authenticated
  USING (
    private.can_write_ops(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.staff s ON s.email = p.email
      WHERE p.id = auth.uid() AND s.id = shifts.worker_id
    )
  );
