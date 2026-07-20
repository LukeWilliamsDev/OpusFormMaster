// @ts-nocheck
import React, { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePortal } from "../context/PortalContext";
import { isValidUKPostcode } from "../utils/geo";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { NoticeModal } from "@/components/ui/notice-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Plus,
  Trash2,
  Mail,
  MapPin,
  Building2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  ClipboardList,
  Save,
  Send,
  Eye,
  Download,
  Printer,
  FileText,
  X,
  CheckCircle2,
  History,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

interface MeasuredItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number | string;
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
  totals: {
    netTotal: number;
    grossTotal: number;
  };
  isSavedLocal?: boolean;
  isSent?: boolean;
}

interface ValuationBuilderProps {
  onLogout: () => void;
  onBack: () => void;
  quoteToLoadId?: string | null;
  onQuoteLoaded?: () => void;
}

const SUGGESTED_ITEMS = [
  { description: "C30/37 Foundation Slab Pour", unit: "m³", rate: 145.0 },
  { description: "C40/50 Columns & Reinforced Beam Work", unit: "m³", rate: 185.0 },
  { description: "A393 Structural Rebar Steel Mesh", unit: "m²", rate: 12.5 },
  { description: "DPM & Sand Blinding Preparation", unit: "m²", rate: 8.0 },
  { description: "Double-Sided Formwork Shuttering", unit: "m²", rate: 45.0 },
  { description: "Concrete Pump Hire - 36m Boom Setup", unit: "Sum", rate: 450.0 },
  { description: "Operative Labor Day Rate", unit: "Day", rate: 240.0 },
  { description: "Site Supervisor Day Rate", unit: "Day", rate: 280.0 },
];

const COMMON_UNITS = ["m²", "m³", "m", "No.", "Sum"];

const COMPANY_INFO = {
  companyNumber: "17228356",
  bank: "Tide",
  accountName: "Opus Form Ltd",
  sortCode: "04-06-05",
  accountNumber: "31840773",
};

const INITIAL_ITEMS: MeasuredItem[] = [];

const capitalizeWords = (str: string) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

// html2canvas cannot parse modern CSS color functions and crashes the PDF render;
// strip them all to a safe hex fallback before the clone is rasterized.
const stripUnsupportedColorFunctions = (cssText: string) =>
  cssText.replace(/\b(oklch|oklab|lch|lab)\([^)]*\)/g, "#333333");

// Shared by handleDownloadPDF and handleSend: clones the live print area into an
// off-screen container sized to exact A4 px dimensions, and builds the matching
// html2pdf options (including the onclone CSS sanitizer) so both call sites stay in sync.
const preparePdfClone = (quoteReference: string) => {
  const originalElement = document.querySelector(".print-area");
  if (!originalElement) {
    throw new Error("Print area not found.");
  }

  const element = originalElement.cloneNode(true) as HTMLElement;
  element.style.transform = "none";
  element.style.margin = "0";
  element.style.padding = "0";
  element.style.width = "794px";
  element.style.height = "1122px";
  element.style.minHeight = "1122px";
  element.style.maxHeight = "1122px";
  element.style.position = "relative";
  element.style.left = "0";
  element.style.top = "0";

  const tempContainer = document.createElement("div");
  tempContainer.style.position = "absolute";
  tempContainer.style.left = "-9999px";
  tempContainer.style.top = "-9999px";
  tempContainer.style.width = "794px";
  tempContainer.style.height = "1122px";
  tempContainer.style.overflow = "hidden";
  tempContainer.appendChild(element);
  document.body.appendChild(tempContainer);

  const opt = {
    margin: 0,
    filename: `Quote_${quoteReference}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      onclone: (_document: Document, clonedElement: HTMLElement) => {
        const cloneDoc = clonedElement.ownerDocument;
        if (cloneDoc && cloneDoc.body) {
          cloneDoc.body.style.margin = "0";
          cloneDoc.body.style.padding = "0";
          cloneDoc.body.style.background = "transparent";
        }
        let cssText = "";
        for (let i = 0; i < document.styleSheets.length; i++) {
          const sheet = document.styleSheets[i];
          try {
            const rules = sheet.cssRules || sheet.rules;
            for (let j = 0; j < rules.length; j++) {
              cssText += rules[j].cssText + "\n";
            }
          } catch (e) {
            console.warn("Could not read stylesheet rules: ", e);
          }
        }
        const safeCss = stripUnsupportedColorFunctions(cssText);
        const originalStyles = cloneDoc.querySelectorAll('link[rel="stylesheet"], style');
        originalStyles.forEach((el) => el.remove());
        const styleEl = cloneDoc.createElement("style");
        styleEl.textContent = safeCss;
        cloneDoc.head.appendChild(styleEl);
      },
    },
    jsPDF: {
      unit: "px" as const,
      format: [794, 1122] as [number, number],
      orientation: "portrait" as const,
      hotfixes: ["px_scaling"],
    },
    pagebreak: { mode: "avoid" },
  };

  return { element, tempContainer, opt };
};

export const QuoteInvoiceBuilder: React.FC<ValuationBuilderProps> = ({
  onBack,
  quoteToLoadId,
  onQuoteLoaded,
}) => {
  const { profile } = usePortal();
  const [clientInfo, setClientInfo] = useState({
    entity: "",
    email: "",
    site: "",
    postcode: "",
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [unitFocusedItemId, setUnitFocusedItemId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [items, setItems] = useState<MeasuredItem[]>(INITIAL_ITEMS);
  const [terms, setTerms] = useState<string[]>([
    "Assumed total pours up to 1, additional pours shall be charged minimum of £3,500",
    "Cancelled pours with less than 24hrs notice shall be charged",
    "Day rate per operative is £240 per day and Supervisor rate is £280 per day",
    "All the materials, telehandler and pump to be provided by Client",
    "Rate includes provision of licenced Telehandler/Forklift Operative",
  ]);

  useEffect(() => {
    setTerms((prev) =>
      prev.map((t) => {
        if (t.includes("to be provided by")) {
          return `All the materials, telehandler and pump to be provided by ${clientInfo.entity || "Client"}`;
        }
        return t;
      }),
    );
  }, [clientInfo.entity]);

  const [showSavedQuotes, setShowSavedQuotes] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [quoteReference, setQuoteReference] = useState(
    `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
  );
  const [currentQuoteId, setCurrentQuoteId] = useState<string>(
    () => quoteToLoadId || crypto.randomUUID(),
  );

  const loadSavedQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("is_sent", false)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const loadedQuotes: Quote[] = (data || []).map((row) => ({
        id: row.id,
        reference: row.reference,
        date: row.date,
        clientInfo: row.client_info,
        items: row.items,
        totals: row.totals,
        isSent: row.is_sent,
      }));
      setSavedQuotes(loadedQuotes);
    } catch (e) {
      console.error("Failed to load saved quotes from Supabase", e);
    }
  };

  // Load saved quotes on mount
  useEffect(() => {
    loadSavedQuotes();
  }, []);

  // Scaling logic for the PDF preview
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const baseWidth = 794; // A4 width in px at 96dpi
        setScale(containerWidth / baseWidth);
      }
    };

    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    updateScale();

    return () => resizeObserver.disconnect();
  }, []);

  // Full-screen PDF preview modal (tablet/mobile only)
  const [previewOpen, setPreviewOpen] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [modalScale, setModalScale] = useState(1);

  useEffect(() => {
    if (!previewOpen) return;
    const updateModalScale = () => {
      if (modalContainerRef.current) {
        const containerWidth = modalContainerRef.current.clientWidth;
        const baseWidth = 794;
        setModalScale(containerWidth / baseWidth);
      }
    };

    const resizeObserver = new ResizeObserver(updateModalScale);
    if (modalContainerRef.current) {
      resizeObserver.observe(modalContainerRef.current);
    }
    updateModalScale();

    return () => resizeObserver.disconnect();
  }, [previewOpen]);

  const totals = useMemo(() => {
    const netTotal = items.reduce((acc, item) => {
      let rateValue = 0;
      if (typeof item.rate === "string") {
        const uppercaseRate = item.rate.toUpperCase();
        if (uppercaseRate === "INCLUDED" || uppercaseRate === "INCL") {
          rateValue = 0;
        } else {
          const cleanRateStr = item.rate.replace(/[£$,\s]/g, "");
          const parsed = parseFloat(cleanRateStr);
          rateValue = isNaN(parsed) ? 0 : parsed;
        }
      } else {
        rateValue = Number(item.rate || 0);
      }
      return acc + item.quantity * rateValue;
    }, 0);
    return { netTotal, grossTotal: netTotal };
  }, [items]);

  const generateNewReference = () => `JOB-${Math.floor(1000 + Math.random() * 9000)}`;

  const handleSaveDraft = async () => {
    if (!clientInfo.entity.trim()) {
      toast.error("VALIDATION FAILURE", {
        description: "Please provide a Client Name to save a draft.",
      });
      return;
    }

    const quoteId = currentQuoteId;
    const newQuote = {
      id: quoteId,
      reference: quoteReference,
      date: new Date().toLocaleDateString("en-GB"),
      client_info: clientInfo,
      items,
      vat_rate: 0,
      totals,
      is_sent: false,
      tenant_id: profile?.tenant_id,
    };

    try {
      const { error } = await supabase.from("quotes").upsert(newQuote);

      if (error) throw error;

      setLastSaved(new Date().toLocaleTimeString("en-GB"));
      loadSavedQuotes();

      // Do NOT reset inputs. Just clear the "Saved" message on button after a short delay
      setTimeout(() => {
        setLastSaved(null);
      }, 2000);
    } catch (e) {
      console.error("Failed to save draft quote to Supabase", e);
      toast.error("SAVE FAILED", { description: "Failed to save draft to database." });
    }
  };

  const loadQuote = (quote: Quote) => {
    setClientInfo(quote.clientInfo);
    setItems(quote.items);
    setQuoteReference(quote.reference);
    setCurrentQuoteId(quote.id);
    setShowSavedQuotes(false);
  };

  useEffect(() => {
    if (quoteToLoadId) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from("quotes")
            .select("*")
            .eq("id", quoteToLoadId)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            const quote: Quote = {
              id: data.id,
              reference: data.reference,
              date: data.date,
              clientInfo: data.client_info,
              items: data.items,
              totals: data.totals,
              isSent: data.is_sent,
            };
            loadQuote(quote);
            if (onQuoteLoaded) onQuoteLoaded();
          }
        } catch (e) {
          console.error("Failed to load quote via quoteToLoadId from Supabase", e);
        }
      })();
    }
  }, [quoteToLoadId]);

  const confirmDeleteQuote = (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation();
    setQuoteToDelete(quote);
  };

  const deleteQuote = async () => {
    if (!quoteToDelete) return;
    const id = quoteToDelete.id;
    try {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;

      setSavedQuotes(savedQuotes.filter((q) => q.id !== id));
    } catch (e) {
      console.error("Failed to delete quote", e);
      toast.error("DELETE FAILED", { description: "Failed to delete quote draft from database." });
    } finally {
      setQuoteToDelete(null);
    }
  };

  const handleDownloadPDF = async () => {
    let tempContainer: HTMLElement | undefined;
    try {
      const prepared = preparePdfClone(quoteReference);
      tempContainer = prepared.tempContainer;

      const { default: html2pdf } = await import("html2pdf.js");
      await html2pdf().from(prepared.element).set(prepared.opt).save();
    } catch (err) {
      toast.error("PDF GENERATION FAILURE", {
        description: "Error generating PDF download: " + err.message,
      });
    } finally {
      if (tempContainer && tempContainer.parentNode) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  const handleSend = async () => {
    // Validation checks before sending
    const missingFields: string[] = [];
    if (!clientInfo.entity.trim()) missingFields.push("Client Name");
    if (!clientInfo.email.trim()) missingFields.push("Client Email");
    if (!clientInfo.site.trim()) missingFields.push("Project/Site Name");
    if (clientInfo.postcode.trim() && !isValidUKPostcode(clientInfo.postcode)) {
      missingFields.push("Invalid Site Postcode format (e.g. M1 1AE)");
    }
    if (items.length === 0) missingFields.push("Line Items (at least one is required)");

    const validTerms = terms.filter((t) => t.trim() !== "");
    if (validTerms.length === 0)
      missingFields.push("Terms & Summary Conditions (at least one condition is required)");

    if (missingFields.length > 0) {
      setValidationErrors(missingFields);
      return;
    }

    setIsSendingEmail(true);
    const sendingToastId = toast.loading("SENDING EMAIL", {
      description: "Generating PDF and sending to client...",
    });

    let tempContainer: HTMLElement | undefined;
    try {
      // 1 & 2. Clone the live print area (stripped of scaling transforms) into a hidden,
      // exact-A4-sized container — same helper used by handleDownloadPDF.
      const prepared = preparePdfClone(quoteReference);
      tempContainer = prepared.tempContainer;

      // Dynamically import html2pdf.js to avoid packaging issues on non-browser environments
      const { default: html2pdf } = await import("html2pdf.js");

      // Generate PDF data uri
      const pdfDataUri = await html2pdf()
        .from(prepared.element)
        .set(prepared.opt)
        .outputPdf("datauristring");
      const base64 = pdfDataUri.split(",")[1];

      // Invoke Supabase Edge Function send-quote-pdf
      const { data, error } = await supabase.functions.invoke("send-quote-pdf", {
        body: {
          toEmail: clientInfo.email,
          clientName: clientInfo.entity,
          siteName: clientInfo.site,
          postcode: clientInfo.postcode,
          quoteRef: quoteReference,
          pdfBase64: base64,
          logoUrl:
            typeof window !== "undefined"
              ? `${window.location.origin}/opus-form-primary-light.svg`
              : undefined,
          netTotal: totals.netTotal,
          grossTotal: totals.grossTotal,
        },
      });

      if (error) {
        let errMsg = error.message;
        try {
          const errBody = await error.context?.json();
          if (errBody && errBody.error) {
            errMsg = errBody.error;
          }
        } catch (_) {
          // Fallback to default message
        }
        throw new Error(errMsg);
      }

      // Update this quote in database to mark it as sent
      const quoteId = currentQuoteId;
      const updatedQuote = {
        id: quoteId,
        reference: quoteReference,
        date: new Date().toLocaleDateString("en-GB"),
        client_info: clientInfo,
        items,
        vat_rate: 0,
        totals,
        is_sent: true,
        tenant_id: profile?.tenant_id,
      };

      const { error: upsertError } = await supabase.from("quotes").upsert(updatedQuote);

      if (upsertError) throw upsertError;

      loadSavedQuotes();
      toast.success("EMAIL SENT", { id: sendingToastId, description: "Email sent successfully." });
      onBack();
    } catch (err) {
      console.error("Failed to send quote PDF:", err);
      toast.error("EMAIL FAILED", {
        id: sendingToastId,
        description: "Email failed. Please get in contact with admin@opusform.co.uk",
      });
    } finally {
      if (tempContainer && tempContainer.parentNode) {
        document.body.removeChild(tempContainer);
      }
      setIsSendingEmail(false);
    }
  };

  const addItem = () => {
    const newItem: MeasuredItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: "",
      quantity: 1,
      unit: "",
      rate: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<MeasuredItem>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const isIncludedRate = (rate: number | string) =>
    typeof rate === "string" &&
    (rate.toUpperCase() === "INCLUDED" || rate.toUpperCase() === "INCL");

  const getLineTotal = (item: MeasuredItem) => {
    if (isIncludedRate(item.rate)) return 0;
    let rateValue = 0;
    if (typeof item.rate === "string") {
      const cleanRateStr = item.rate.replace(/[£$,\s]/g, "");
      const parsed = parseFloat(cleanRateStr);
      rateValue = isNaN(parsed) ? 0 : parsed;
    } else {
      rateValue = Number(item.rate || 0);
    }
    return item.quantity * rateValue;
  };

  const pdfDocument = (scaleValue: number, isPrintTarget = false) => (
    <div
      className={`bg-white shadow-2xl text-[#333] flex flex-col origin-top shrink-0 ${isPrintTarget ? "print-area" : ""}`}
      style={{
        width: "794px",
        height: "1122px",
        minHeight: "1122px",
        maxHeight: "1122px",
        transform: `scale(${scaleValue})`,
        marginLeft: `${(794 * scaleValue - 794) / 2}px`,
        marginRight: `${(794 * scaleValue - 794) / 2}px`,
        marginBottom: `${1122 * scaleValue - 1122}px`,
      }}
    >
      {/* PDF CONTENT — header */}
      <div className="bg-[#26262B] px-8 sm:px-12 py-9 flex justify-between items-center">
        <img src="/opus-form-primary-dark.svg" alt="Opus Form" className="h-9 sm:h-10 w-auto" />
        <div className="text-right">
          <div className="text-[26px] sm:text-[30px] font-black text-[#F4F4F0] tracking-[0.08em] leading-none mb-4">
            QUOTE
          </div>
          <div className="flex items-center justify-end gap-5">
            <div className="text-right">
              <div className="text-[9.5px] text-[#8A8A82] uppercase tracking-[0.12em]">
                Reference
              </div>
              <div className="text-[12.5px] text-[#F4F4F0] font-black mt-0.5">
                #{quoteReference}
              </div>
            </div>
            <div className="w-px h-7 bg-[#3A3A40]" />
            <div className="text-right">
              <div className="text-[9.5px] text-[#8A8A82] uppercase tracking-[0.12em]">Date</div>
              <div className="text-[12.5px] text-[#F4F4F0] font-black mt-0.5">
                {new Date().toLocaleDateString("en-GB")}
              </div>
            </div>
            <div className="w-px h-7 bg-[#3A3A40]" />
            <div className="text-right">
              <div className="text-[9.5px] text-[#8A8A82] uppercase tracking-[0.12em]">
                Valid Until
              </div>
              <div className="text-[12.5px] text-[#F4F4F0] font-black mt-0.5">
                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB")}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-1 bg-primary" />
      <div className="px-12 py-8 flex-1 flex flex-col">
        <div className="mb-7 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.14em] uppercase text-primary mb-1.5">
              Client
            </div>
            <div className="border border-[#E4E0D8] p-4 min-h-[72px] text-xs">
              {clientInfo.entity ? (
                <div className="space-y-1">
                  <p className="font-black text-gray-900 text-sm">{clientInfo.entity}</p>
                  <p className="text-muted-foreground tracking-wide">
                    {clientInfo.email ? clientInfo.email.toLowerCase() : "..."}
                  </p>
                </div>
              ) : (
                <span className="text-[#AAA]">No client data entered</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-black tracking-[0.14em] uppercase text-primary mb-1.5">
              Project
            </div>
            <div className="border border-[#E4E0D8] p-4 min-h-[72px] text-xs">
              {clientInfo.site ? (
                <div className="space-y-1">
                  <p className="font-black text-gray-900 text-sm">{clientInfo.site}</p>
                  <p className="text-muted-foreground tracking-wide">{clientInfo.postcode || "..."}</p>
                </div>
              ) : (
                <span className="text-[#AAA]">No project data entered</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#26262B]">
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-left w-[42%] whitespace-nowrap">
                  Description
                </th>
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-right w-[16%] whitespace-nowrap">
                  Volume / Qty
                </th>
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-left w-[10%]">
                  Unit
                </th>
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-right w-[16%]">
                  Unit Rate
                </th>
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-right w-[16%]">
                  Net Value
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-[#EDEAE4] ${idx % 2 === 1 ? "bg-[#FAFAF8]" : ""}`}
                  >
                    <td className="p-3 text-xs leading-relaxed text-[#333]">
                      {item.description || "..."}
                    </td>
                    <td className="p-3 text-xs text-right text-[#333] font-medium">
                      {item.quantity}
                    </td>
                    <td className="p-3 text-[11px] text-[#BBB] italic uppercase tracking-wide">
                      {item.unit}
                    </td>
                    <td className="p-3 text-xs text-right text-[#333]">
                      {isIncludedRate(item.rate)
                        ? "INCLUDED"
                        : `£${Number(item.rate || 0).toFixed(2)}`}
                    </td>
                    <td className="p-3 text-xs text-right text-[#333] font-black">
                      {isIncludedRate(item.rate)
                        ? "INCLUDED"
                        : `£${getLineTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-[#EDEAE4]">
                  <td
                    colSpan={5}
                    className="p-10 text-center text-[#BBB] italic text-[11px] uppercase tracking-widest"
                  >
                    No billable items added
                  </td>
                </tr>
              )}
              <tr className="h-4 bg-[#FAFAF8]">
                <td colSpan={5} />
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t-2 border-[#26262B]">
          <div className="w-[280px]">
            <div className="flex justify-between p-2 px-3 text-xs border-b border-[#EDEAE4] text-[#666]">
              <span className="uppercase tracking-widest">NET SUBTOTAL</span>
              <span className="font-black text-[#333]">
                £{totals.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between p-3.5 px-3 bg-[#26262B] text-[#F4F4F0] font-black text-[15px]">
              <span className="uppercase tracking-widest">Total</span>
              <span>
                £{totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-12 pt-7">
        <div className="bg-[#F4F3F0] border-l-[3px] border-primary p-4 mb-6">
          <div className="text-[11px] font-black tracking-[0.12em] uppercase text-primary mb-2.5">
            Standard Terms & Pour Conditions
          </div>
          <ul className="space-y-1.5">
            {terms.map(
              (term, index) =>
                term.trim() && (
                  <li
                    key={index}
                    className="text-[10.5px] text-[#555] leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[6px] before:w-[5px] before:h-[5px] before:bg-primary"
                  >
                    {term}
                  </li>
                ),
            )}
          </ul>
        </div>
        <div className="mb-8">
          <div className="text-[11px] font-black tracking-[0.14em] uppercase text-[#888] mb-2.5">
            Banking Details
          </div>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-[#E4E0D8] pt-3.5">
            {[
              { label: "Bank", value: COMPANY_INFO.bank },
              { label: "Account Name", value: COMPANY_INFO.accountName },
              { label: "Sort Code", value: COMPANY_INFO.sortCode },
              { label: "Account No.", value: COMPANY_INFO.accountNumber },
            ].map((field, idx, arr) => (
              <div key={field.label} className="flex items-start gap-6">
                <div>
                  <div className="text-[9.5px] text-[#AAA] uppercase tracking-[0.1em]">
                    {field.label}
                  </div>
                  <div className="font-black text-[#333] text-[11px] mt-0.5">{field.value}</div>
                </div>
                {idx < arr.length - 1 && <div className="w-px h-7 bg-[#E4E0D8]" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-[#26262B] px-8 sm:px-12 py-3.5 flex justify-between items-center mt-auto">
        <span className="text-[11px] text-[#B8B8B0] tracking-[0.1em] uppercase">
          Opus Form Ltd &middot; Company No. {COMPANY_INFO.companyNumber}
        </span>
        <span className="text-[11px] text-[#B8B8B0] tracking-[0.1em] uppercase">
          billing@opusform.co.uk
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 w-full text-foreground">
      {/* --- STICKY ACTION BAR --- */}
      <div className="sticky top-16 lg:top-0 z-40 bg-background/90 backdrop-blur border-b border-border mb-4">
        <div className="w-full py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-[11px] font-black uppercase tracking-widest shrink-0"
          >
            ← Back
          </button>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 flex-1 sm:flex-initial min-w-0">
            <span className="text-[11px] font-black tracking-widest text-muted-foreground uppercase whitespace-nowrap">
              Ref
            </span>
            <input
              className="bg-transparent border-none outline-none text-primary text-xs font-black tracking-widest uppercase font-mono w-full sm:w-24 min-w-0"
              value={quoteReference}
              onChange={(e) => setQuoteReference(e.target.value)}
              placeholder="JOB-0000"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="lg:hidden flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground/85 text-[11px] font-bold tracking-widest uppercase hover:bg-secondary/70 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            onClick={handleSaveDraft}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground/85 text-[11px] font-bold tracking-widest uppercase hover:bg-secondary/70 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lastSaved ? "SAVED" : "SAVE"}</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground/85 text-[11px] font-bold tracking-widest uppercase hover:bg-secondary/70 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSendingEmail}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-1.5 text-white text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all"
          >
            {isSendingEmail ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isSendingEmail ? "SENDING..." : "SEND"}</span>
          </button>
        </div>
        </div>
      </div>

      {/* --- MAIN TWO-PANEL BODY --- */}
      <div className="flex flex-col lg:flex-row gap-5 pb-10">
        {/* -- LEFT PANEL: Form -- */}
        <div className="flex flex-col gap-5 flex-1 min-w-0">
          {/* SAVED HISTORY (collapsed accordion) */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHistory((h) => !h)}
              className="w-full flex items-center justify-between p-4 text-[11px] font-black tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                Saved History ({savedQuotes.length})
              </div>
              {showHistory ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showHistory && (
              <div className="px-4 pb-4 flex flex-col gap-[5px] max-h-52 overflow-y-auto custom-scrollbar">
                {savedQuotes.length === 0 ? (
                  <div className="bg-background border border-dashed border-border rounded-lg p-6 text-center">
                    <div className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">
                      No saved quotes found
                    </div>
                  </div>
                ) : (
                  savedQuotes.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => loadQuote(q)}
                      className="flex items-center justify-between bg-background border border-border rounded-lg p-2.5 px-3 hover:border-primary/30 cursor-pointer transition-all duration-200"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/85">
                            {q.reference}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{q.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-mono font-black uppercase tracking-widest text-muted-foreground">
                          £
                          {q.totals?.grossTotal?.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          }) || "0"}
                        </span>
                        <button
                          onClick={(e) => confirmDeleteQuote(e, q)}
                          className="bg-transparent border-none cursor-pointer text-muted-foreground p-0.5 flex items-center hover:text-red-500 transition-colors"
                          title="Delete saved quote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* CLIENT DETAILS */}
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                Client & Project
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Client Name
                </span>
                <div className="flex items-center bg-secondary border border-border rounded-xl p-2.5 px-3 focus-within:border-primary transition-colors">
                  <input
                    type="text"
                    className="w-full bg-transparent border-none outline-none text-foreground text-[11px] placeholder:text-muted-foreground/50 font-medium"
                    value={clientInfo.entity}
                    onChange={(e) => setClientInfo({ ...clientInfo, entity: e.target.value })}
                    placeholder="e.g. ABC CONSTRUCTIONS LTD"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Email
                </span>
                <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl p-2.5 px-3 focus-within:border-primary transition-colors">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="email"
                    className="w-full bg-transparent border-none outline-none text-foreground text-[11px] placeholder:text-muted-foreground/50 font-medium"
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                    placeholder="accounts@client.com"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Project / Site Name
                </span>
                <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl p-2.5 px-3 focus-within:border-primary transition-colors">
                  <LayoutGrid className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    className="w-full bg-transparent border-none outline-none text-foreground text-[11px] placeholder:text-muted-foreground/50 font-medium"
                    value={clientInfo.site}
                    onChange={(e) => setClientInfo({ ...clientInfo, site: e.target.value })}
                    placeholder="e.g. Project Titan"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Site Postcode
                </span>
                <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl p-2.5 px-3 focus-within:border-primary transition-colors">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    className="w-full bg-transparent border-none outline-none text-foreground text-[11px] placeholder:text-muted-foreground/50 font-medium tracking-wide"
                    value={clientInfo.postcode}
                    onChange={(e) => setClientInfo({ ...clientInfo, postcode: e.target.value })}
                    placeholder="e.g. SW1A 1AA"
                  />
                </div>
                {clientInfo.postcode.trim() && !isValidUKPostcode(clientInfo.postcode) && (
                  <p className="text-[11px] font-black text-red-500 uppercase tracking-widest">
                    Invalid UK Postcode format
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* LINE ITEMS */}
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Line Items
                </h3>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 bg-secondary border border-border rounded-lg p-1.5 px-3 text-foreground/85 text-[11px] font-bold tracking-widest uppercase hover:bg-secondary/70 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                ADD LINE
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-background border border-border rounded-xl relative group"
                >
                  {/* Delete button (always visible in corner on all screen sizes) */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-red-400 transition-colors p-1 cursor-pointer z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col gap-2.5">
                    {/* Description */}
                    <div className="relative flex-1 pr-7">
                      <input
                        type="text"
                        className="w-full bg-transparent border-none outline-none text-foreground text-xs placeholder:text-muted-foreground font-bold tracking-wider py-1.5"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        onFocus={() => setFocusedItemId(item.id)}
                        onBlur={() => {
                          setTimeout(() => setFocusedItemId(null), 200);
                        }}
                        placeholder="Description of item..."
                      />
                      <AnimatePresence>
                        {focusedItemId === item.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto no-scrollbar"
                          >
                            {SUGGESTED_ITEMS.filter(
                              (s) =>
                                !item.description ||
                                s.description
                                  .toLowerCase()
                                  .includes(item.description.toLowerCase()),
                            ).map((suggestion) => (
                              <button
                                key={suggestion.description}
                                type="button"
                                onClick={() => {
                                  updateItem(item.id, {
                                    description: suggestion.description,
                                    unit: suggestion.unit,
                                    rate: suggestion.rate,
                                  });
                                }}
                                className="w-full text-left px-3 py-2 text-[11px] uppercase font-bold tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-b border-border/30 last:border-none"
                              >
                                <div className="flex justify-between items-center">
                                  <span>{suggestion.description}</span>
                                  <span className="text-primary/70 font-mono text-[11px]">
                                    £{suggestion.rate}/{suggestion.unit}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Labeled grid for inputs on all screen sizes */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">
                          Qty
                        </span>
                        <div className="flex items-center bg-card border border-border rounded-lg h-9 px-2">
                          <input
                            type="number"
                            className="w-full bg-transparent border-none outline-none text-foreground text-xs font-mono font-bold"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, { quantity: Number(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">
                          Unit
                        </span>
                        <div className="relative flex items-center bg-card border border-border rounded-lg h-9 px-2">
                          <input
                            type="text"
                            className="w-full bg-transparent border-none outline-none text-foreground text-[11px] font-bold uppercase"
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                            onFocus={() => setUnitFocusedItemId(item.id)}
                            onBlur={() => {
                              setTimeout(() => setUnitFocusedItemId(null), 200);
                            }}
                            placeholder="Unit..."
                          />
                          <AnimatePresence>
                            {unitFocusedItemId === item.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto no-scrollbar"
                              >
                                {COMMON_UNITS.filter(
                                  (u) =>
                                    !item.unit || u.toLowerCase().includes(item.unit.toLowerCase()),
                                ).map((u) => (
                                  <button
                                    key={u}
                                    type="button"
                                    onClick={() => updateItem(item.id, { unit: u })}
                                    className="w-full text-left px-3 py-2 text-[11px] uppercase font-bold tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-b border-border/30 last:border-none"
                                  >
                                    {u}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">
                          Rate (£)
                        </span>
                        <div className="flex items-center bg-card border border-border rounded-lg h-9 px-2 gap-1.5">
                          <input
                            type="text"
                            className="w-full bg-transparent border-none outline-none text-foreground text-xs font-mono font-bold"
                            value={item.rate}
                            onChange={(e) => updateItem(item.id, { rate: e.target.value })}
                            placeholder="0.00"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.id, {
                                rate: isIncludedRate(item.rate) ? 0 : "INCLUDED",
                              })
                            }
                            className={`px-1.5 py-1 rounded text-[10px] font-black tracking-wide shrink-0 ${
                              isIncludedRate(item.rate)
                                ? "bg-primary text-white shadow-sm"
                                : "bg-background text-muted-foreground border border-border hover:bg-secondary"
                            }`}
                          >
                            INCL
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">
                          Total
                        </span>
                        <div className="flex items-center h-9 px-1 text-xs font-black font-mono text-primary">
                          {isIncludedRate(item.rate)
                            ? "INCL"
                            : `£${getLineTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="bg-background border border-dashed border-border/60 rounded-xl p-8 text-center">
                  <div className="text-[11px] font-black tracking-widest text-muted-foreground uppercase mb-3">
                    No line items added yet
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-[11px] font-black tracking-wide text-primary hover:brightness-110 uppercase bg-secondary px-4 py-2 rounded-lg border border-border"
                  >
                    Initialize First Line
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* TERMS */}
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Terms & Conditions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTerms([...terms, ""])}
                className="bg-secondary border border-border hover:border-muted-foreground/40 rounded-md w-[26px] h-[26px] flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {terms.map((term, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 bg-background border border-border rounded-xl p-3"
                >
                  <textarea
                    value={term}
                    onChange={(e) => {
                      const newTerms = [...terms];
                      newTerms[index] = e.target.value;
                      setTerms(newTerms);
                    }}
                    rows={2}
                    className="w-full bg-transparent border-none outline-none text-[11px] text-foreground leading-relaxed resize-none min-h-0 font-medium"
                    placeholder="Enter condition..."
                  />
                  <button
                    type="button"
                    onClick={() => setTerms(terms.filter((_, i) => i !== index))}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* TOTALS + SEND */}
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                Summary & Authorization
              </h3>
            </div>

            {/* Totals grid */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[13px] border-b border-border pb-2">
                <span className="text-muted-foreground">Net Total</span>
                <span className="font-semibold font-mono">
                  £{totals.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-[16px] pt-1">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-extrabold text-primary font-mono">
                  £{totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* end left panel */}

        {/* -- RIGHT PANEL: Live PDF Mirror -- */}
        <div className="w-full lg:w-[440px] xl:w-[500px] 2xl:w-[580px] shrink-0">
          {/* Desktop: sticky PDF mirror. Always mounted (hidden via CSS, not unmounted) so it
              remains the single canonical .print-area target at every breakpoint. */}
          <div className="hidden lg:block sticky top-[58px]">
            <div className="flex items-center gap-2 text-muted-foreground px-1 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                PDF Live Mirror
              </span>
            </div>
            <div
              ref={containerRef}
              className="w-full relative flex justify-center items-start overflow-hidden bg-background border border-border py-6 rounded-xl font-archivo no-scrollbar"
            >
              {pdfDocument(scale, true)}
            </div>
          </div>
        </div>
        {/* end right panel */}
      </div>
      {/* end two-panel body */}

      {/* --- TABLET/MOBILE: FULL-SCREEN PDF PREVIEW MODAL --- */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-[95] bg-black/85 backdrop-blur-sm flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/85 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                PDF Live Preview
              </span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              ref={modalContainerRef}
              className="flex-1 overflow-y-auto flex justify-center items-start bg-background py-6 px-3 font-archivo no-scrollbar"
            >
              {pdfDocument(modalScale)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- VALIDATION ERROR MODAL --- */}
      <NoticeModal
        open={validationErrors.length > 0}
        onOpenChange={(open) => {
          if (!open) setValidationErrors([]);
        }}
        tone="error"
        tag="VALIDATION FAILURE"
        title="VALIDATION FAILURE"
        message={
          <>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider leading-relaxed mb-4">
              The following fields are required before sending:
            </p>
            <ul className="space-y-2">
              {validationErrors.map((error, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-[11px] text-gray-300 uppercase font-black tracking-widest bg-card border border-border p-2.5 rounded-lg"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
                  {error}
                </li>
              ))}
            </ul>
          </>
        }
        actionLabel="DISMISS"
      />

      {/* --- DELETE QUOTE CONFIRMATION --- */}
      <ConfirmDialog
        open={!!quoteToDelete}
        onOpenChange={(open) => {
          if (!open) setQuoteToDelete(null);
        }}
        tone="destructive"
        tag="This Cannot Be Undone"
        title="Delete Quote"
        message={
          <>
            Are you sure you want to delete the quote{" "}
            <span className="font-bold text-foreground">{quoteToDelete?.reference}</span>?
            <div className="mt-3 p-4 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-red-400 leading-relaxed">
              This action is irreversible and will permanently delete this quote draft from the database.
            </div>
          </>
        }
        confirmLabel="Delete Quote"
        onConfirm={deleteQuote}
      />
    </div>
  );
};
