// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  Search, 
  Clock, 
  User, 
  Database,
  ArrowRight,
  X,
  FileJson,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { computeDiff } from '../utils/auditDiff';
import { AuditDiffTable } from '../components/AuditDiffTable';

interface AuditLog {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
}

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleRestore = async (log: AuditLog) => {
    if (!window.confirm(`Are you sure you want to restore the state of the ${log.target_type} record? This action will overwrite current data.`)) {
      return;
    }

    setRestoring(true);
    try {
      const table = log.target_type;
      const targetId = log.target_id;
      
      let error = null;

      if (log.action === 'CREATE') {
        // Restoring a creation means deleting the record
        const { error: err } = await supabase
          .from(table)
          .delete()
          .eq('id', targetId);
        error = err;
      } else if (log.action === 'DELETE') {
        // Restoring a deletion means inserting the details payload
        const { error: err } = await supabase
          .from(table)
          .upsert(log.details);
        error = err;
      } else if (log.action === 'UPDATE') {
        // Restoring an update means applying the "old" values
        if (!log.details?.old) {
          throw new Error('No old state payload found in this audit log.');
        }
        const { error: err } = await supabase
          .from(table)
          .upsert(log.details.old);
        error = err;
      }

      if (error) {
        throw error;
      }

      alert('Record successfully restored to its previous state!');
      setSelectedLog(null);
      fetchLogs();
    } catch (err: any) {
      console.error('Failed to restore record:', err);
      alert(`Restoration failed: ${err.message || 'Unknown error'}`);
    } finally {
      setRestoring(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      setSelectedLog(null);
    }
  };

  const [staffList, setStaffList] = useState<any[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    const [logsRes, staffRes] = await Promise.all([
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }),
      supabase.from('staff').select('id, name')
    ]);

    if (logsRes.error) {
      console.error('Error fetching audit logs:', logsRes.error);
    } else {
      setLogs(logsRes.data || []);
    }

    if (staffRes.error) {
      console.error('Error fetching staff list for mapping:', staffRes.error);
    } else {
      setStaffList(staffRes.data || []);
    }
    setLoading(false);
  };

  const getTargetDisplayName = (targetType: string, targetId: string, details?: any) => {
    if (targetType === 'staff') {
      const match = staffList.find(s => s.id === targetId);
      if (match) return match.name;
      
      // Fallback strategies for archived or deleted workers
      if (details?.new?.name) return details.new.name;
      if (details?.old?.name) return details.old.name;
      if (details?.name) return details.name;
    }
    return targetId;
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter, typeFilter]);

  const filteredLogs = logs.filter(log => {
    // 1. Text Search Filter
    const term = search.toLowerCase();
    const textMatches = (
      (log.user_email || '').toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.target_type.toLowerCase().includes(term) ||
      log.target_id.toLowerCase().includes(term)
    );

    // 2. Action Filter
    const actionMatches = actionFilter === 'ALL' || log.action === actionFilter;

    // 3. Type Filter
    const typeMatches = typeFilter === 'ALL' || log.target_type.toLowerCase() === typeFilter.toLowerCase();

    return textMatches && actionMatches && typeMatches;
  });

  // Paginated Slicing
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
      case 'LOGIN_SUCCESS':
      case 'PASSWORD_RESET_SUCCESS':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'UPDATE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'INSPECT':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'DELETE':
      case 'LOGIN_FAILURE':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'LOGOUT':
      case 'PASSWORD_RESET_REQUEST':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 animate-fade-in text-white flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2a2a2a] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-brand-accent uppercase font-mono mb-1">
            <Activity className="w-4 h-4" />
            <span>Compliance & Security</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-archivo tracking-tight">System Audit Trail</h1>
          <p className="text-[11px] text-zinc-400 font-mono mt-1">ISO 9001:2015 Clause 7.5.3 Compliance Log</p>
        </div>
        
        <button 
          onClick={fetchLogs}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold uppercase rounded-lg border border-white/5 transition-all"
        >
          Refresh Log
        </button>
      </div>

      {/* Search & Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
        {/* Search */}
        <div className="md:col-span-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by ID, email or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#1e1e20] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-brand-accent/30 transition-all font-mono"
          />
        </div>

        {/* Action Type Filter */}
        <div className="relative">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-[#1e1e20] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-brand-accent/30 appearance-none cursor-pointer"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN_SUCCESS">LOGIN SUCCESS</option>
            <option value="LOGIN_FAILURE">LOGIN FAILURE</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="PASSWORD_RESET_REQUEST">RESET REQUEST</option>
            <option value="PASSWORD_RESET_SUCCESS">RESET SUCCESS</option>
          </select>
        </div>

        {/* Table Type Filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-[#1e1e20] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-brand-accent/30 appearance-none cursor-pointer"
          >
            <option value="ALL">All Modules</option>
            <option value="staff">Staff</option>
            <option value="jobs">Jobs</option>
            <option value="shifts">Shifts</option>
            <option value="quotes">Quotes</option>
            <option value="auth">Auth</option>
          </select>
        </div>

        {/* Stats */}
        <div className="bg-[#1e1e20] border border-white/5 rounded-xl p-2 flex flex-col justify-center text-center h-[42px]">
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider">Filtered Count</span>
          <span className="text-sm font-black font-archivo mt-0.5">{filteredLogs.length}</span>
        </div>
      </div>

      {/* Logs Table Container */}
      <div className="flex-grow flex flex-col justify-between bg-[#1e1e20] border border-white/5 rounded-xl overflow-hidden min-h-[480px]">
        <div>
          {loading ? (
            <div className="py-20 text-center text-xs font-mono text-zinc-500">Loading audit trail...</div>
          ) : paginatedLogs.length === 0 ? (
            <div className="py-20 text-center text-xs font-mono text-zinc-500">No logs matching filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black uppercase text-zinc-500 tracking-wider bg-black/10">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4 text-right">Resource</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-mono">
                  {paginatedLogs.map((log) => {
                    const isRecordChange = log.action === 'UPDATE' && computeDiff(log.details?.old, log.details?.new).length > 0;
                    const friendlyEventName = isRecordChange ? 'Record Change' : 
                                              log.action === 'INSPECT' ? 'Record Inspection' : 
                                              log.action === 'CREATE' ? 'Record Created' : 
                                              log.action === 'DELETE' ? 'Record Deleted' : 
                                              log.action === 'APPROVE_DOCUMENT' ? 'Document Approved' : 
                                              log.action === 'REJECT_DOCUMENT' ? 'Document Rejected' : 
                                              log.action === 'SUBMIT_DOCUMENTS' ? 'Document Uploaded' :
                                              log.action === 'RESEND_DOCUMENT_REQUEST' ? 'Link Renewed' : 'System Event';

                    return (
                      <tr 
                        key={log.id} 
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-white/5 cursor-pointer transition-all"
                      >
                        <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-600" />
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-zinc-600" />
                            <span className="text-zinc-300">{log.user_email || 'System'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300 font-sans font-bold text-[11px]">
                          <span className={isRecordChange ? 'text-[#ffb86c]' : log.action === 'INSPECT' ? 'text-purple-400' : 'text-zinc-450'}>
                            {friendlyEventName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300 text-right">
                          <div className="flex flex-col items-end gap-0.5 justify-center">
                            <div className="flex items-center gap-1.5 justify-end">
                              <Database className="w-3.5 h-3.5 text-zinc-600" />
                              <span className="uppercase text-[11px] font-bold text-zinc-400">{log.target_type}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-sans tracking-normal font-bold">
                              {getTargetDisplayName(log.target_type, log.target_id, log.details)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls - Always Locked to the Bottom of this container */}
        <div className="border-t border-white/5 px-4 py-3 flex items-center justify-between bg-black/10 mt-auto">
          <span className="text-[10px] font-mono text-zinc-500">
            Showing <span className="text-zinc-300">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="text-zinc-300">{filteredLogs.length}</span> actions
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-zinc-300 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Details Drawer */}
      {selectedLog && (
        <div 
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in text-white"
        >
          <div className="w-full max-w-2xl bg-[#18181a] border-l border-white/5 h-full p-6 flex flex-col justify-between shadow-2xl animate-slide-in-right">
            <div className="space-y-6 overflow-y-auto pr-1">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      {selectedLog.target_type}
                    </span>
                  </div>
                  <h3 className="text-lg font-black font-archivo tracking-tight">
                    {selectedLog.action === 'UPDATE' && 
                     computeDiff(selectedLog.details?.old, selectedLog.details?.new).length > 0
                      ? 'Record Change'
                      : 'Record Inspection'}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 rounded-xl p-4 text-[11px] font-mono">
                <div>
                  <p className="text-zinc-500 uppercase font-black text-[9px] tracking-wider">Timestamp</p>
                  <p className="text-zinc-300 mt-0.5">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-zinc-500 uppercase font-black text-[9px] tracking-wider">Operator</p>
                  <p className="text-zinc-300 mt-0.5">{selectedLog.user_email || 'System / Automated'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-zinc-500 uppercase font-black text-[9px] tracking-wider">Target Resource</p>
                  <p className="text-zinc-300 mt-0.5 select-all font-sans font-bold text-sm">
                    {getTargetDisplayName(selectedLog.target_type, selectedLog.target_id, selectedLog.details)}
                  </p>
                  {selectedLog.target_type === 'staff' && selectedLog.target_id.startsWith('worker-') && (
                    <span className="text-[9px] text-zinc-650 font-mono tracking-normal block mt-0.5">
                      ID: {selectedLog.target_id}
                    </span>
                  )}
                </div>
              </div>

              {/* Data Diff */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Payload Details</span>
                </div>

                {selectedLog.action === 'UPDATE' && selectedLog.details?.old ? (
                  <AuditDiffTable diff={computeDiff(selectedLog.details.old, selectedLog.details.new)} />
                ) : (
                  <pre className="p-4 bg-black/20 border border-white/5 rounded-xl text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-[400px]">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 mt-6 flex justify-between gap-4">
              <button
                onClick={() => handleRestore(selectedLog)}
                disabled={restoring}
                className="px-4 py-2 bg-brand-accent/80 hover:bg-brand-accent text-xs font-mono font-bold uppercase rounded-lg transition-all text-white disabled:opacity-50"
              >
                {restoring ? 'Restoring...' : 'Restore to this State'}
              </button>
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold uppercase rounded-lg border border-white/5 transition-all text-zinc-300"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
