// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Job, Worker, ScheduledShift } from '../types/erp';
import { INITIAL_ROSTER, INITIAL_SHIFTS } from '../data/roster';

const INITIAL_JOBS: Job[] = [
  { id: '1', jobRef: 'OP-4921-X', siteName: 'Riverside Phase 2', mainContractor: 'Balfour Beatty', postcode: 'SW1A 1AA', currentPours: 5, contractMaxPours: 4, status: 'in-progress', scheduleValue: 42500 },
  { id: '2', jobRef: 'OP-5102-Y', siteName: 'Oakwood Grounds', mainContractor: 'Laing O\'Rourke', postcode: 'M1 1AE', currentPours: 2, contractMaxPours: 6, status: 'pending', scheduleValue: 18200 },
  { id: '3', jobRef: 'OP-3884-Z', siteName: 'Brentwood Hub', mainContractor: 'Kier Group', postcode: 'CM14 4BA', currentPours: 8, contractMaxPours: 8, status: 'completed', scheduleValue: 65400 },
  { id: '4', jobRef: 'OP-2291-A', siteName: 'Central Square', mainContractor: 'Skanska', postcode: 'B1 1BB', currentPours: 1, contractMaxPours: 10, status: 'in-progress', scheduleValue: 89000 },
  { id: '5', jobRef: 'OP-9921-B', siteName: 'Marina Development', mainContractor: 'Morgan Sindall', postcode: 'EH1 1YZ', currentPours: 12, contractMaxPours: 10, status: 'in-progress', scheduleValue: 54000 },
];

export type AppRole = 'admin' | 'dispatcher' | 'operative';

// ---- Row <-> App mappers -----------------------------------------------
export const workerToRow = (w: Worker, tenantId?: string) => ({
  id: w.id,
  name: w.name,
  role: w.role,
  phone: w.phone ?? null,
  email: w.email ?? null,
  postcode: w.postcode ?? null,
  is_archived: w.isArchived ?? false,
  tickets: w.tickets ?? [],
  uploaded_certificates: w.uploadedCertificates ?? [],
  ...(tenantId ? { tenant_id: tenantId } : {}),
});
const rowToWorker = (r: any): Worker => ({
  id: r.id,
  name: r.name,
  role: r.role,
  phone: r.phone ?? undefined,
  email: r.email ?? undefined,
  postcode: r.postcode ?? undefined,
  isArchived: r.is_archived ?? false,
  tickets: r.tickets ?? [],
  uploadedCertificates: r.uploaded_certificates ?? [],
});

const jobToRow = (j: Job, tenantId?: string) => ({
  id: j.id,
  job_ref: j.jobRef,
  site_name: j.siteName,
  main_contractor: j.mainContractor ?? null,
  postcode: j.postcode ?? null,
  current_pours: j.currentPours ?? 0,
  contract_max_pours: j.contractMaxPours ?? 0,
  status: j.status,
  schedule_value: j.scheduleValue ?? 0,
  ...(tenantId ? { tenant_id: tenantId } : {}),
});
const rowToJob = (r: any): Job => ({
  id: r.id,
  jobRef: r.job_ref,
  siteName: r.site_name,
  mainContractor: r.main_contractor ?? '',
  postcode: r.postcode ?? '',
  currentPours: r.current_pours ?? 0,
  contractMaxPours: r.contract_max_pours ?? 0,
  status: r.status,
  scheduleValue: Number(r.schedule_value ?? 0),
});

const shiftToRow = (s: ScheduledShift, tenantId?: string) => ({
  id: s.id,
  worker_id: s.workerId,
  job_id: s.jobId,
  date: s.date,
  ...(tenantId ? { tenant_id: tenantId } : {}),
});
const rowToShift = (r: any): ScheduledShift => ({
  id: r.id,
  workerId: r.worker_id,
  jobId: r.job_id,
  date: r.date,
});

interface PortalContextType {
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  shifts: ScheduledShift[];
  setShifts: React.Dispatch<React.SetStateAction<ScheduledShift[]>>;
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  handleReloadDemoData: () => void;
  isAuthenticated: boolean;
  authLoading: boolean;
  dataLoading: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: { full_name: string; phone_number: string; avatar_url: string; tenant_id: string } | null;
  updateProfile: (updates: { full_name?: string; phone_number?: string; avatar_url?: string; tenant_id?: string }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfileState] = useState<{ full_name: string; phone_number: string; avatar_url: string; tenant_id: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Track previous ids per table so we can compute deletions on sync.
  const prevWorkerIdsRef = useRef<Set<string>>(new Set());
  const prevJobIdsRef = useRef<Set<string>>(new Set());
  const prevShiftIdsRef = useRef<Set<string>>(new Set());
  // Suppress the "sync-back" effect until we've hydrated from Supabase.
  const hydratedRef = useRef(false);
  
  // Track last saved state to prevent redundant updates (and initial load-time auto-saves)
  const lastSavedWorkersRef = useRef<string>('');
  const lastSavedJobsRef = useRef<string>('');
  const lastSavedShiftsRef = useRef<string>('');

  // Bootstrap session + subscribe to auth changes
  useEffect(() => {
    // Register listener FIRST so we never miss an event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (!newSession) {
        setRole(null);
        setProfileState(null);
        // Clear cached data on sign-out to avoid leaking one user's view.
        hydratedRef.current = false;
        prevWorkerIdsRef.current = new Set();
        prevJobIdsRef.current = new Set();
        prevShiftIdsRef.current = new Set();
        setWorkers([]);
        setJobs([]);
        setShifts([]);
        setDataLoading(true);
      }
    });

    // Then hydrate the initial session.
    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      setSession(initial);
      setUser(initial?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch role and profile details from profiles whenever the user changes
  useEffect(() => {
    if (!user) {
      setRole(null);
      setProfileState(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, full_name, phone_number, avatar_url, tenant_id')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('Failed to load profile', error);
        setRole('operative');
        setProfileState({ full_name: '', phone_number: '', avatar_url: '' });
      } else {
        setRole((data?.role as AppRole) ?? 'operative');
        setProfileState({
          full_name: data?.full_name ?? '',
          phone_number: data?.phone_number ?? '',
          avatar_url: data?.avatar_url ?? '',
          tenant_id: data?.tenant_id ?? '',
        });
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Load operational data from Supabase whenever we have a signed-in user.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      const [wRes, jRes, sRes] = await Promise.all([
        supabase.from('staff').select('*'),
        supabase.from('jobs').select('*'),
        supabase.from('shifts').select('*'),
      ]);
      if (cancelled) return;
      if (wRes.error) console.error('load workers', wRes.error);
      if (jRes.error) console.error('load jobs', jRes.error);
      if (sRes.error) console.error('load shifts', sRes.error);
      const wList = (wRes.data ?? []).map(rowToWorker);
      const jList = (jRes.data ?? []).map(rowToJob);
      const sList = (sRes.data ?? []).map(rowToShift);
      prevWorkerIdsRef.current = new Set(wList.map(w => w.id));
      prevJobIdsRef.current = new Set(jList.map(j => j.id));
      prevShiftIdsRef.current = new Set(sList.map(s => s.id));
      
      lastSavedWorkersRef.current = JSON.stringify(wList.map(w => workerToRow(w, profile?.tenant_id)));
      lastSavedJobsRef.current = JSON.stringify(jList.map(j => jobToRow(j, profile?.tenant_id)));
      lastSavedShiftsRef.current = JSON.stringify(sList.map(s => shiftToRow(s, profile?.tenant_id)));
      
      setWorkers(wList);
      setJobs(jList);
      setShifts(sList);
      
      // Delay enabling the sync triggers until React has flushed the state updates
      setTimeout(() => {
        hydratedRef.current = true;
        setDataLoading(false);
      }, 50);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!hydratedRef.current || !user) return;
    const rows = workers.map(w => workerToRow(w, profile?.tenant_id));
    const serialized = JSON.stringify(rows);
    if (serialized === lastSavedWorkersRef.current) return;
    lastSavedWorkersRef.current = serialized;

    const currentIds = new Set(workers.map(w => w.id));
    const removed = [...prevWorkerIdsRef.current].filter(id => !currentIds.has(id));
    prevWorkerIdsRef.current = currentIds;
    (async () => {
      if (workers.length > 0) {
        const { error } = await supabase.from('staff').upsert(rows);
        if (error) console.error('upsert staff', error);
      }
      if (removed.length > 0) {
        const { error } = await supabase.from('staff').delete().in('id', removed);
        if (error) console.error('delete workers', error);
      }
    })();
  }, [workers, user]);

  useEffect(() => {
    if (!hydratedRef.current || !user) return;
    const rows = jobs.map(j => jobToRow(j, profile?.tenant_id));
    const serialized = JSON.stringify(rows);
    if (serialized === lastSavedJobsRef.current) return;
    lastSavedJobsRef.current = serialized;

    const currentIds = new Set(jobs.map(j => j.id));
    const removed = [...prevJobIdsRef.current].filter(id => !currentIds.has(id));
    prevJobIdsRef.current = currentIds;
    (async () => {
      if (jobs.length > 0) {
        const { error } = await supabase.from('jobs').upsert(rows);
        if (error) console.error('upsert jobs', error);
      }
      if (removed.length > 0) {
        const { error } = await supabase.from('jobs').delete().in('id', removed);
        if (error) console.error('delete jobs', error);
      }
    })();
  }, [jobs, user]);

  useEffect(() => {
    if (!hydratedRef.current || !user) return;
    const rows = shifts.map(s => shiftToRow(s, profile?.tenant_id));
    const serialized = JSON.stringify(rows);
    if (serialized === lastSavedShiftsRef.current) return;
    lastSavedShiftsRef.current = serialized;

    const currentIds = new Set(shifts.map(s => s.id));
    const removed = [...prevShiftIdsRef.current].filter(id => !currentIds.has(id));
    prevShiftIdsRef.current = currentIds;
    (async () => {
      if (shifts.length > 0) {
        const { error } = await supabase.from('shifts').upsert(rows);
        if (error) console.error('upsert shifts', error);
      }
      if (removed.length > 0) {
        const { error } = await supabase.from('shifts').delete().in('id', removed);
        if (error) console.error('delete shifts', error);
      }
    })();
  }, [shifts, user]);

  const handleReloadDemoData = async () => {
    if (!(role === 'admin' || role === 'dispatcher')) {
      alert('Only admins or dispatchers can seed the demo dataset.');
      return;
    }
    if (!window.confirm("Restore default demo dataset? This will replace the workers, jobs and shifts stored in the backend.")) {
      return;
    }
    setDataLoading(true);
    // Wipe existing rows, then insert the canonical demo dataset.
    const [dw, dj, ds] = await Promise.all([
      supabase.from('staff').delete().neq('id', '__none__'),
      supabase.from('jobs').delete().neq('id', '__none__'),
      supabase.from('shifts').delete().neq('id', '__none__'),
    ]);
    if (dw.error || dj.error || ds.error) {
      console.error('demo wipe', dw.error, dj.error, ds.error);
      alert('Failed to reset demo data: ' + (dw.error?.message || dj.error?.message || ds.error?.message));
      setDataLoading(false);
      return;
    }
    const [iw, ij, is_] = await Promise.all([
      supabase.from('staff').insert(INITIAL_ROSTER.map(w => workerToRow(w, profile?.tenant_id))),
      supabase.from('jobs').insert(INITIAL_JOBS.map(j => jobToRow(j, profile?.tenant_id))),
      supabase.from('shifts').insert(INITIAL_SHIFTS.map(s => shiftToRow(s, profile?.tenant_id))),
    ]);
    if (iw.error || ij.error || is_.error) {
      console.error('demo seed', iw.error, ij.error, is_.error);
      alert('Failed to seed demo data: ' + (iw.error?.message || ij.error?.message || is_.error?.message));
      setDataLoading(false);
      return;
    }
    // Reflect the seeded state locally without re-triggering sync-back.
    hydratedRef.current = false;
    prevWorkerIdsRef.current = new Set(INITIAL_ROSTER.map(w => w.id));
    prevJobIdsRef.current = new Set(INITIAL_JOBS.map(j => j.id));
    prevShiftIdsRef.current = new Set(INITIAL_SHIFTS.map(s => s.id));
    setWorkers(INITIAL_ROSTER);
    setJobs(INITIAL_JOBS);
    setShifts(INITIAL_SHIFTS);
    // Re-enable sync on next tick, once the state updates have flushed.
    setTimeout(() => { hydratedRef.current = true; }, 0);
    setDataLoading(false);
    alert('Demo dataset successfully seeded.');
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      await supabase.rpc('log_anonymous_audit', {
        p_user_email: email,
        p_action: 'LOGIN_FAILURE',
        p_target_type: 'auth',
        p_target_id: 'unknown',
        p_details: { error: error.message }
      });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).maybeSingle();
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          user_email: email,
          tenant_id: prof?.tenant_id,
          action: 'LOGIN_SUCCESS',
          target_type: 'auth',
          target_id: user.id,
          details: { message: 'Successful user authentication' }
        });
      }
    }
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        tenant_id: profile?.tenant_id,
        action: 'LOGOUT',
        target_type: 'auth',
        target_id: user.id,
        details: { message: 'User terminated active session' }
      });
    }
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/portal`,
    });
    if (!error) {
      await supabase.rpc('log_anonymous_audit', {
        p_user_email: email,
        p_action: 'PASSWORD_RESET_REQUEST',
        p_target_type: 'auth',
        p_target_id: 'unknown',
        p_details: { message: 'Dispatched password reset recovery link' }
      });
    }
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          user_email: user.email,
          tenant_id: profile?.tenant_id,
          action: 'PASSWORD_RESET_SUCCESS',
          target_type: 'auth',
          target_id: user.id,
          details: { message: 'Successfully updated password credentials' }
        });
      }
    }
    return { error: error?.message ?? null };
  };

  const updateProfile = async (updates: { full_name?: string; phone_number?: string; avatar_url?: string }) => {
    if (!user) return { error: 'No authenticated user' };
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (!error) {
      setProfileState(prev => prev ? { ...prev, ...updates } : { full_name: '', phone_number: '', avatar_url: '', tenant_id: '', ...updates });
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        tenant_id: profile?.tenant_id,
        action: 'PROFILE_UPDATE',
        target_type: 'auth',
        target_id: user.id,
        details: { updates }
      });
    }
    return { error: error?.message ?? null };
  };

  return (
    <PortalContext.Provider value={{
      workers,
      setWorkers,
      shifts,
      setShifts,
      jobs,
      setJobs,
      handleReloadDemoData,
      isAuthenticated: !!session,
      authLoading,
      dataLoading,
      session,
      user,
      role,
      profile,
      updateProfile,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    }}>
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};
