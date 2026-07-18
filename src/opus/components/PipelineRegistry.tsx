// @ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  History,
  Trash2,
  Check,
  Search,
  SlidersHorizontal,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Plus,
} from "lucide-react";
import { Job } from "../types/erp";
import { usePortal } from "../context/PortalContext";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface MeasuredItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number | string;
  isIncluded?: boolean;
}

interface Quote {
  id: string;
  reference: string;
  date: string;
  clientInfo: {
    entity: string;
    email: string;
    site: string;
    postcode: string;
  };
  items: MeasuredItem[];
  vatRate: number;
  totals: {
    netTotal: number;
    vatAmount: number;
    grossTotal: number;
  };
  isSavedLocal?: boolean;
  isSent?: boolean;
}

interface PipelineRegistryProps {
  onEditQuote: (quoteId: string) => void;
  onNewQuote: () => void;
  onBack: () => void;
}

export const PipelineRegistry: React.FC<PipelineRegistryProps> = ({
  onEditQuote,
  onNewQuote,
  onBack,
}) => {
  const { jobs, setJobs } = usePortal();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuoteToDelete, setSelectedQuoteToDelete] = useState<Quote | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<Quote | null>(null);
  const [selectedQuoteForControl, setSelectedQuoteForControl] = useState<Quote | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Sort states
  const [sortField, setSortField] = useState<"ref" | "client" | "date" | "value" | "status">(
    "date",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: "ref" | "client" | "date" | "value" | "status") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Load quotes from Supabase
  const loadQuotes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const loadedQuotes: Quote[] = (data || []).map((row) => ({
        id: row.id,
        reference: row.reference,
        date: row.date,
        clientInfo: row.client_info,
        items: row.items,
        vatRate: Number(row.vat_rate),
        totals: row.totals,
        isSent: row.is_sent,
      }));
      setQuotes(loadedQuotes);
    } catch (e) {
      console.error("Failed to load quotes from Supabase", e);
      triggerToast("Failed to load quotes", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleDelete = async () => {
    if (!selectedQuoteToDelete) return;
    try {
      const { error } = await supabase.from("quotes").delete().eq("id", selectedQuoteToDelete.id);

      if (error) throw error;

      setQuotes(quotes.filter((q) => q.id !== selectedQuoteToDelete.id));
      setSelectedQuoteToDelete(null);
      triggerToast("Quote deleted successfully", "success");
    } catch (e) {
      console.error("Failed to delete quote", e);
      triggerToast("Failed to delete quote", "error");
    }
  };

  const handleConvertToJob = async () => {
    if (!convertingQuote) return;

    // Create a new active Job object
    const newJob: Job = {
      id: Math.random().toString(36).substr(2, 9),
      jobRef: convertingQuote.reference.replace("QTE", "OP").replace("JOB", "OP"),
      siteName: convertingQuote.clientInfo.site || "New Unassigned Site",
      mainContractor: convertingQuote.clientInfo.entity || "Contractor",
      postcode: convertingQuote.clientInfo.postcode || "N/A",
      currentPours: 0,
      contractMaxPours: 10,
      status: "in-progress",
      scheduleValue: convertingQuote.totals?.grossTotal || 0,
    };

    // Prepend new job and persist through the portal context (Supabase-backed).
    setJobs((prev) => [newJob, ...prev]);

    try {
      const { error } = await supabase.from("quotes").delete().eq("id", convertingQuote.id);

      if (error) throw error;

      setQuotes(quotes.filter((q) => q.id !== convertingQuote.id));
      setConvertingQuote(null);
      triggerToast(`Converted ${convertingQuote.reference} to Active Job ${newJob.jobRef}`);
    } catch (e) {
      console.error("Failed to remove converted quote from database", e);
      triggerToast("Failed to complete conversion", "error");
    }
  };

  // Filter quotes based on search term
  const filteredQuotes = quotes.filter(
    (q) =>
      q.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.clientInfo?.entity || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.clientInfo?.site || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Sort filtered quotes
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortField) {
      case "ref":
        aVal = a.reference || "";
        bVal = b.reference || "";
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case "client":
        aVal = (a.clientInfo?.entity || "").toLowerCase();
        bVal = (b.clientInfo?.entity || "").toLowerCase();
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case "date":
        const parseDate = (dStr: string) => {
          if (!dStr || dStr.toLowerCase() === "pending") return 0;
          const parsed = Date.parse(dStr);
          return isNaN(parsed) ? 0 : parsed;
        };
        aVal = parseDate(a.date);
        bVal = parseDate(b.date);
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      case "value":
        aVal = a.totals?.grossTotal || 0;
        bVal = b.totals?.grossTotal || 0;
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      case "status":
        aVal = a.isSent ? 1 : 0;
        bVal = b.isSent ? 1 : 0;
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      default:
        return 0;
    }
  });

  return (
    <div className="flex flex-col flex-1 w-full text-brand-white pb-24">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-6 z-[200] bg-brand-charcoal border-l-4 border-primary p-4 rounded shadow-2xl flex items-center space-x-3 animate-in slide-in-from-right duration-300">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span className="text-[11px] font-black uppercase tracking-widest text-brand-white">
            {showToast.message}
          </span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quote Management
          </h1>

          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search quotes..."
              className="bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>
        </div>

        {/* New Quote Button */}
        <button
          onClick={onNewQuote}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-lg text-xs font-bold transition-all shadow-lg select-none"
        >
          <Plus className="w-4 h-4" />
          <span>New Quote</span>
        </button>
      </div>

      <main className="mt-0 pb-8 space-y-6">
        {!isLoading && sortedQuotes.length === 0 && (
          <div className="bg-card border border-border rounded-xl px-4 py-12 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
            No matching pipeline estimates found
          </div>
        )}

        {/* Desktop Table (lg and up) */}
        <div className="hidden lg:block space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-[110px_1.6fr_1fr_120px_110px] gap-4 px-5 py-3 border-b border-border bg-background">
              <button
                onClick={() => handleSort("ref")}
                className="flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors focus:outline-none select-none text-left"
              >
                Ref
                {sortField === "ref" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  ))}
              </button>
              <button
                onClick={() => handleSort("client")}
                className="flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors focus:outline-none select-none text-left"
              >
                Client / Site
                {sortField === "client" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  ))}
              </button>
              <button
                onClick={() => handleSort("date")}
                className="flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors focus:outline-none select-none text-left"
              >
                Date
                {sortField === "date" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  ))}
              </button>
              <button
                onClick={() => handleSort("value")}
                className="flex items-center justify-end gap-1 text-[11px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors focus:outline-none select-none text-right w-full"
              >
                Value
                {sortField === "value" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  ))}
              </button>
              <button
                onClick={() => handleSort("status")}
                className="flex items-center justify-end gap-1 text-[11px] font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors focus:outline-none select-none text-right w-full"
              >
                Status
                {sortField === "status" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  ))}
              </button>
            </div>

            <div className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {sortedQuotes.map((quote) => (
                  <motion.div
                    key={quote.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    layout
                    className="grid grid-cols-[110px_1.6fr_1fr_120px_110px] gap-4 px-5 py-4 items-center hover:bg-secondary/50 transition-colors duration-150 cursor-pointer"
                    onClick={() => setSelectedQuoteForControl(quote)}
                  >
                    {/* Quote Ref */}
                    <div className="font-mono text-[13px] font-semibold text-primary">
                      {quote.reference || `QTE-${quote.id.substring(0, 4).toUpperCase()}`}
                    </div>

                    {/* Site / Contractor */}
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-foreground">
                        {quote.clientInfo?.entity || "No Contractor Data"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {quote.clientInfo?.site || "No site info"}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-muted-foreground font-medium">
                      {quote.date || "Pending"}
                    </div>

                    {/* Estimated Value */}
                    <div className="text-right">
                      <span className="text-[14px] font-mono font-bold text-foreground tracking-wide">
                        £
                        {(quote.totals?.grossTotal || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="text-right">
                      <span
                        className={`px-2 py-1 rounded text-[11px] font-bold ${
                          quote.isSent
                            ? "bg-[#162230] border border-[#2a4a6a] text-primary"
                            : "bg-[#2a2a10] border border-[#4a4a20] text-[#c0c040]"
                        }`}
                      >
                        {quote.isSent ? "Sent" : "Draft"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Card List (below lg) */}
        <div className="lg:hidden space-y-3">
          {sortedQuotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-card border border-border rounded-xl p-4 space-y-3 cursor-pointer active:bg-secondary/50 transition-colors"
              onClick={() => setSelectedQuoteForControl(quote)}
            >
              {/* Ref + Status */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] font-semibold text-primary">
                  {quote.reference || `QTE-${quote.id.substring(0, 4).toUpperCase()}`}
                </span>
                <span
                  className={`px-2 py-1 rounded text-[11px] font-bold ${
                    quote.isSent
                      ? "bg-[#162230] border border-[#2a4a6a] text-primary"
                      : "bg-[#2a2a10] border border-[#4a4a20] text-[#c0c040]"
                  }`}
                >
                  {quote.isSent ? "Sent" : "Draft"}
                </span>
              </div>

              {/* Contractor / Site */}
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-foreground">
                  {quote.clientInfo?.entity || "No Contractor Data"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {quote.clientInfo?.site || "No site info"}
                </div>
              </div>

              {/* Date + Value */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{quote.date || "Pending"}</span>
                <span className="text-[14px] font-mono font-bold text-foreground tracking-wide">
                  £
                  {(quote.totals?.grossTotal || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!selectedQuoteToDelete}
        onOpenChange={(open) => {
          if (!open) setSelectedQuoteToDelete(null);
        }}
        tone="destructive"
        tag="This Cannot Be Undone"
        title="Delete Quote"
        message={
          <>
            Are you sure you want to delete the quote{" "}
            <span className="font-bold text-foreground">{selectedQuoteToDelete?.reference}</span> for{" "}
            <span className="font-bold text-foreground">
              {selectedQuoteToDelete?.clientInfo?.entity}
            </span>
            ?
            <div className="mt-3 p-4 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-red-400 leading-relaxed">
              This action is irreversible and will permanently delete this quote.
            </div>
          </>
        }
        confirmLabel="Delete Quote"
        onConfirm={handleDelete}
      />

      {/* Convert to Job Confirmation Modal */}
      <ConfirmDialog
        open={!!convertingQuote}
        onOpenChange={(open) => {
          if (!open) setConvertingQuote(null);
        }}
        tone="neutral"
        tag="Create a Job From This Quote"
        title="Job Creation"
        message={
          <>
            You are about to create a job from quote{" "}
            <span className="font-bold text-foreground">{convertingQuote?.reference}</span>.
            <div className="mt-3 bg-white/5 border border-white/5 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-white/50">Main Contractor:</span>
                <span className="text-sm font-semibold text-foreground">
                  {convertingQuote?.clientInfo?.entity}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-white/50">Site Name:</span>
                <span className="text-sm font-semibold text-foreground max-w-[180px] text-right truncate">
                  {convertingQuote?.clientInfo?.site}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-xs font-medium text-white/50">Schedule Value:</span>
                <span className="text-sm font-bold text-primary">
                  £
                  {(convertingQuote?.totals?.grossTotal || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </>
        }
        confirmLabel="Accept Job"
        onConfirm={handleConvertToJob}
      />

      {/* Quote Control Center Drawer Overlay */}
      <AnimatePresence>
        {selectedQuoteForControl && (
          <div className="fixed inset-0 z-[150] flex justify-end">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedQuoteForControl(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-card border-l border-white/10 shadow-2xl h-full flex flex-col z-10"
            >
              {/* Sticky Header */}
              <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                    Quote Control Center
                  </h3>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-black uppercase tracking-widest ${
                      selectedQuoteForControl.isSent
                        ? "bg-[#162230] border border-[#2a4a6a] text-primary"
                        : "bg-[#2a2a10] border border-[#4a4a20] text-[#c0c040]"
                    }`}
                  >
                    {selectedQuoteForControl.isSent ? "Sent" : "Draft"}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedQuoteForControl(null)}
                  className="p-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-4 rounded-xl">
                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
                      Contractor
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {selectedQuoteForControl.clientInfo?.entity || "N/A"}
                    </span>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-xl">
                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
                      Reference
                    </span>
                    <span className="text-xs font-mono font-semibold text-primary">
                      {selectedQuoteForControl.reference}
                    </span>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-xl">
                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
                      Site / Project
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {selectedQuoteForControl.clientInfo?.site || "N/A"}
                    </span>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-xl">
                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
                      Postcode
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {selectedQuoteForControl.clientInfo?.postcode || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest block">
                    Bill of Quantities
                  </span>
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="hidden sm:grid sm:grid-cols-[1fr_60px_60px_80px] gap-2 p-3 bg-background border-b border-border text-[11px] font-black uppercase text-muted-foreground tracking-widest">
                      <span>Description</span>
                      <span className="text-right">Qty</span>
                      <span>Unit</span>
                      <span className="text-right">Rate</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {selectedQuoteForControl.items && selectedQuoteForControl.items.length > 0 ? (
                        selectedQuoteForControl.items.map((item) => {
                          const rateDisplay =
                            typeof item.rate === "string" &&
                            (item.rate.toUpperCase() === "INCLUDED" ||
                              item.rate.toUpperCase() === "INCL")
                              ? "INCL"
                              : `£${Number(item.rate || 0).toFixed(2)}`;
                          return (
                            <div
                              key={item.id}
                              className="p-3 text-xs sm:grid sm:grid-cols-[1fr_60px_60px_80px] sm:gap-2 sm:items-center"
                            >
                              <span className="text-white/80 font-medium block">
                                {item.description}
                              </span>
                              <div className="flex items-center justify-between gap-2 mt-1.5 sm:hidden text-[11px]">
                                <span className="text-white/50 font-mono">
                                  {item.quantity} <span className="text-white/40 italic">{item.unit}</span>
                                </span>
                                <span className="font-mono font-semibold text-foreground">
                                  {rateDisplay}
                                </span>
                              </div>
                              <span className="hidden sm:block text-right font-mono font-semibold text-white/50">
                                {item.quantity}
                              </span>
                              <span className="hidden sm:block text-white/40 italic">{item.unit}</span>
                              <span className="hidden sm:block text-right font-mono font-semibold text-foreground">
                                {rateDisplay}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-white/30 italic">
                          No billable items added
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary Totals */}
                <div className="bg-card border border-border p-4 rounded-xl grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[7.5px] font-black text-muted-foreground uppercase tracking-widest block mb-0.5">
                      Net Subtotal
                    </span>
                    <span className="text-xs font-mono font-semibold text-foreground">
                      £
                      {(selectedQuoteForControl.totals?.netTotal || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[7.5px] font-black text-muted-foreground uppercase tracking-widest block mb-0.5">
                      VAT ({selectedQuoteForControl.vatRate || 20}%)
                    </span>
                    <span className="text-xs font-mono font-semibold text-foreground">
                      £
                      {(selectedQuoteForControl.totals?.vatAmount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="bg-secondary border border-white/10 rounded-lg p-2">
                    <span className="text-[7.5px] font-black text-primary uppercase tracking-widest block mb-0.5">
                      Gross Total
                    </span>
                    <span className="text-xs font-mono font-black text-brand-white">
                      £
                      {(selectedQuoteForControl.totals?.grossTotal || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sticky Footer Actions */}
              <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setSelectedQuoteForControl(null);
                    onEditQuote(selectedQuoteForControl.id);
                  }}
                  className="flex-1 py-3 bg-secondary hover:bg-secondary/80 border border-white/10 text-foreground rounded-lg text-[11px] font-black uppercase tracking-widest transition-all text-center focus:outline-none"
                >
                  Edit Quote
                </button>
                <button
                  onClick={() => {
                    const quote = selectedQuoteForControl;
                    setSelectedQuoteForControl(null);
                    setConvertingQuote(quote);
                  }}
                  className="flex-1 py-3 bg-primary hover:brightness-110 text-primary-foreground rounded-lg text-[11px] font-black uppercase tracking-widest transition-all text-center focus:outline-none"
                >
                  Convert to Job
                </button>
                <button
                  onClick={() => {
                    const quote = selectedQuoteForControl;
                    setSelectedQuoteForControl(null);
                    setSelectedQuoteToDelete(quote);
                  }}
                  className="py-3 px-4 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all focus:outline-none"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
