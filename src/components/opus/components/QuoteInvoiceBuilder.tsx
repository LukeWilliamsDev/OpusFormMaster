import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Download,
  Printer,
  FileText,
  X,
  CheckCircle2,
  History
} from 'lucide-react';

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
  vatRate: number;
  totals: {
    netTotal: number;
    vatAmount: number;
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

const INITIAL_ITEMS: MeasuredItem[] = [];

export const QuoteInvoiceBuilder: React.FC<ValuationBuilderProps> = ({ onBack, quoteToLoadId, onQuoteLoaded }) => {
  const [clientInfo, setClientInfo] = useState({
    entity: '',
    email: '',
    site: '',
    postcode: ''
  });
  const [items, setItems] = useState<MeasuredItem[]>(INITIAL_ITEMS);
  const [terms, setTerms] = useState<string[]>([
    "Assumed total pours up to 1, additional pours shall be charged minimum of £3,500",
    "Cancelled pours with less than 24hrs notice shall be charged",
    "Day rate per operative is £240 per day and Supervisor rate is £280 per day",
    "All the materials, telehandler and pump to be provided by Client",
    "Rate includes provision of licenced Telehandler/Forklift Operative"
  ]);

  useEffect(() => {
    setTerms(prev => prev.map(t => {
      if (t.includes("to be provided by")) {
        return `All the materials, telehandler and pump to be provided by ${clientInfo.entity || 'Client'}`;
      }
      return t;
    }));
  }, [clientInfo.entity]);

  const [vatRate, setVatRate] = useState(20);
  const [showSavedQuotes, setShowSavedQuotes] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [quoteReference, setQuoteReference] = useState(`JOB-${Math.floor(1000 + Math.random() * 9000)}`);

  // Load saved quotes on mount
  useEffect(() => {
    const stored = localStorage.getItem('opus_saved_quotes');
    if (stored) {
      try {
        setSavedQuotes(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved quotes", e);
      }
    }
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

  const totals = useMemo(() => {
    const netTotal = items.reduce((acc, item) => {
      const rateValue = typeof item.rate === 'string' && (item.rate.toUpperCase() === 'INCLUDED' || item.rate.toUpperCase() === 'INCL') 
        ? 0 
        : Number(item.rate || 0);
      return acc + (item.quantity * rateValue);
    }, 0);
    const vatAmount = netTotal * (vatRate / 100);
    const grossTotal = netTotal + vatAmount;
    return { netTotal, vatAmount, grossTotal };
  }, [items, vatRate]);

  const generateNewReference = () => `JOB-${Math.floor(1000 + Math.random() * 9000)}`;

  const handleSave = () => {
    if (items.length === 0 && !clientInfo.entity) return;

    const existing = savedQuotes.find(q => q.reference === quoteReference);
    const newQuote: Quote = {
      id: existing ? existing.id : Date.now().toString(),
      reference: quoteReference,
      date: existing ? existing.date : new Date().toLocaleDateString('en-GB'),
      clientInfo,
      items,
      vatRate,
      totals,
      isSavedLocal: true,
      isSent: false
    };

    const updated = [newQuote, ...savedQuotes.filter(q => q.reference !== quoteReference)];
    setSavedQuotes(updated);
    localStorage.setItem('opus_saved_quotes', JSON.stringify(updated));
    setLastSaved(new Date().toLocaleTimeString());

    // Do NOT reset inputs. Just clear the "Saved" message on button after a short delay
    setTimeout(() => {
      setLastSaved(null);
    }, 2000);
  };

  const loadQuote = (quote: Quote) => {
    setClientInfo(quote.clientInfo);
    setItems(quote.items);
    setVatRate(quote.vatRate);
    setQuoteReference(quote.reference);
    setShowSavedQuotes(false);
  };

  useEffect(() => {
    if (quoteToLoadId) {
      const stored = localStorage.getItem('opus_saved_quotes');
      if (stored) {
        try {
          const quotes: Quote[] = JSON.parse(stored);
          const found = quotes.find(q => q.id === quoteToLoadId);
          if (found) {
            loadQuote(found);
            if (onQuoteLoaded) onQuoteLoaded();
          }
        } catch (e) {
          console.error("Failed to load quote via quoteToLoadId", e);
        }
      }
    }
  }, [quoteToLoadId]);

  const deleteQuote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = savedQuotes.filter(q => q.id !== id);
    setSavedQuotes(updated);
    localStorage.setItem('opus_saved_quotes', JSON.stringify(updated));
  };

  const handleSend = () => {
    if (items.length === 0 && !clientInfo.entity) return;

    const existing = savedQuotes.find(q => q.reference === quoteReference);
    const sentQuote: Quote = {
      id: existing ? existing.id : Date.now().toString(),
      reference: quoteReference,
      date: existing ? existing.date : new Date().toLocaleDateString('en-GB'),
      clientInfo,
      items,
      vatRate,
      totals,
      isSavedLocal: true,
      isSent: true
    };

    const updated = [sentQuote, ...savedQuotes.filter(q => q.reference !== quoteReference)];
    setSavedQuotes(updated);
    localStorage.setItem('opus_saved_quotes', JSON.stringify(updated));

    const subject = encodeURIComponent(`Quote: ${quoteReference} - ${clientInfo.site || 'Project'}`);
    const body = encodeURIComponent(`
Hi ${clientInfo.entity || 'Team'},

Please find the quote summary for ${clientInfo.site || 'the project'} below:

Reference: ${quoteReference}
Total Value: £${totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}

Items Summary:
${items.map(item => `- ${item.description}: ${item.quantity} ${item.unit} @ ${typeof item.rate === 'string' && item.rate.toUpperCase() === 'INCLUDED' ? 'INCLUDED' : '£' + Number(item.rate || 0).toFixed(2)}`).join('\n')}

Kind regards,
Opus Form Operations
    `);
    
    window.location.href = `mailto:${clientInfo.email}?subject=${subject}&body=${body}`;
  };

  const addItem = () => {
    const newItem: MeasuredItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      unit: '',
      rate: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<MeasuredItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  return (
    <div className="min-h-screen bg-[#1A1B1E] text-white font-sans selection:bg-brand-accent/30 flex flex-col pt-16">
      {/* Workspace Sub-Header Navigation */}
      <div className="bg-[#222428] border-b border-white/5 py-8 px-4 sm:px-6 relative z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest font-archivo text-white leading-tight">
              Quote
            </h1>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Left: Input Controls */}
          <div className="space-y-3">
            {/* CARD SOLO: Reference & Save & History */}
            <div className="bg-[#242424] border border-[#333] overflow-hidden rounded-xl mb-3">
              <div className="p-4">
                <div className="flex items-center gap-[10px]">
                  <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#383838] rounded-lg p-2.5 px-3 flex-1">
                    <span className="text-[9px] font-bold tracking-widest text-[#555] uppercase whitespace-nowrap">Ref</span>
                    <input 
                      className="bg-transparent border-none outline-none text-[#b0b8c4] text-xs font-semibold tracking-wider w-full"
                      value={quoteReference}
                      onChange={e => setQuoteReference(e.target.value)}
                      placeholder="JOB-0000"
                    />
                  </div>
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-[7px] bg-[#2e2e2e] border border-[#3a3a3a] rounded-lg p-2.5 px-4 text-[#e0e0e0] text-[10px] font-extrabold tracking-wider hover:bg-[#383838] transition-colors whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{lastSaved ? 'SAVED' : 'SAVE'}</span>
                  </button>
                </div>
              </div>
              <div className="h-[1px] bg-[#2e2e2e] mx-4"></div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-[#e0e0e0]">
                    <History className="w-3.5 h-3.5 text-[#b0b8c4] shrink-0" />
                    Saved History
                  </div>
                </div>
                <div className="flex flex-col gap-[5px] max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {savedQuotes.filter(q => q.isSavedLocal && q.isSent !== true).length === 0 ? (
                    <div className="bg-[#1e1e1e] border border-dashed border-[#2a2a2a] rounded-lg p-7 px-4 text-center">
                      <div className="text-[9px] font-bold tracking-widest text-[#333] uppercase">No saved quotes found</div>
                    </div>
                  ) : (
                    savedQuotes
                      .filter(q => q.isSavedLocal && q.isSent !== true)
                      .map((q) => (
                        <div 
                          key={q.id}
                          onClick={() => loadQuote(q)}
                          className="flex items-center justify-between bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 px-3 hover:border-brand-accent/30 cursor-pointer transition-all duration-200"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-[#e0e0e0]">{q.reference}</span>
                              <span className="text-[10px] text-[#555]">{q.date}</span>
                            </div>
                            <div className="text-[10px] text-[#555] mt-[2px] uppercase">
                              {q.clientInfo?.entity || 'Unnamed Client'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] font-semibold text-[#888]">
                              £{q.totals?.grossTotal?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
                            </span>
                            <button 
                              onClick={(e) => deleteQuote(e, q.id)}
                              className="bg-transparent border-none cursor-pointer text-[#3a3a3a] p-0.5 flex items-center hover:text-red-500 transition-colors"
                              title="Delete saved quote"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* CARD GROUP WRAPPER: stacks children directly with no spacing */}
            <div className="flex flex-col mt-3">
              {/* CARD GROUP: Client Info + Line Items + Terms + Auth */}
              <div className="bg-[#242424] border border-[#333] overflow-hidden rounded-t-xl">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-[#e0e0e0]">
                    <Building2 className="w-3.5 h-3.5 text-[#b0b8c4] shrink-0" />
                    Client Information
                  </div>
                </div>
                
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold tracking-widest text-[#555] uppercase">Client</span>
                    <div className="flex items-center gap-[7px] bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 px-3 focus-within:border-[#444] transition-colors">
                      <input 
                        type="text"
                        className="w-full bg-transparent border-none outline-none text-[#e0e0e0] text-[11px] placeholder:text-[#333]"
                        value={clientInfo.entity}
                        onChange={e => setClientInfo({ ...clientInfo, entity: e.target.value })}
                        placeholder="e.g. ABC CONSTRUCTIONS LTD"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold tracking-widest text-[#555] uppercase">Email</span>
                    <div className="flex items-center gap-[7px] bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 px-3 focus-within:border-[#444] transition-colors">
                      <Mail className="w-3.5 h-3.5 text-[#3a3a3a] shrink-0" />
                      <input 
                        type="email"
                        className="w-full bg-transparent border-none outline-none text-[#e0e0e0] text-[11px] placeholder:text-[#333]"
                        value={clientInfo.email}
                        onChange={e => setClientInfo({ ...clientInfo, email: e.target.value })}
                        placeholder="accounts@client.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold tracking-widest text-[#555] uppercase">Project</span>
                      <div className="flex items-center gap-[7px] bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 px-3 focus-within:border-[#444] transition-colors">
                        <LayoutGrid className="w-3.5 h-3.5 text-[#3a3a3a] shrink-0" />
                        <input 
                          type="text"
                          className="w-full bg-transparent border-none outline-none text-[#e0e0e0] text-[11px] placeholder:text-[#333]"
                          value={clientInfo.site}
                          onChange={e => setClientInfo({ ...clientInfo, site: e.target.value })}
                          placeholder="Project Titan"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold tracking-widest text-[#555] uppercase">Postcode</span>
                      <div className="flex items-center gap-[7px] bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 px-3 focus-within:border-[#444] transition-colors">
                        <MapPin className="w-3.5 h-3.5 text-[#3a3a3a] shrink-0" />
                        <input 
                          type="text"
                          className="w-full bg-transparent border-none outline-none text-[#e0e0e0] text-[11px] placeholder:text-[#333]"
                          value={clientInfo.postcode}
                          onChange={e => setClientInfo({ ...clientInfo, postcode: e.target.value })}
                          placeholder="SW1A 1AA"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-[1px] bg-[#2e2e2e] mx-4"></div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-[#e0e0e0]">
                    <ClipboardList className="w-3.5 h-3.5 text-[#b0b8c4] shrink-0" />
                    Line Items
                  </div>
                  <button 
                    onClick={addItem}
                    className="flex items-center gap-1.5 bg-[#2e2e2e] border border-[#3a3a3a] rounded-lg p-1.5 px-3 text-[#e0e0e0] text-[10px] font-extrabold tracking-wider hover:bg-[#383838] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    ADD LINE
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 p-3 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg relative group">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <input 
                            type="text"
                            className="w-full bg-transparent border-none outline-none text-[#e0e0e0] text-[11px] placeholder:text-[#333] font-bold"
                            value={item.description}
                            onChange={e => updateItem(item.id, { description: e.target.value })}
                            placeholder="Description of item..."
                          />
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-[#3a3a3a] hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-bold tracking-widest text-[#555] uppercase">Qty</span>
                          <div className="flex items-center bg-[#242424] border border-[#2e2e2e] rounded-lg h-10 px-3">
                            <input 
                              type="number"
                              className="w-full bg-transparent border-none outline-none text-[#e0e0e0] text-[11px]"
                              value={item.quantity}
                              onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-bold tracking-widest text-[#555] uppercase">Unit</span>
                          <div className="flex items-center bg-[#242424] border border-[#2e2e2e] rounded-lg h-10 px-3 gap-2">
                            <input 
                              type="text"
                              className="w-full bg-transparent border-none outline-none text-[#e0e0e0] text-[11px] uppercase placeholder:text-[#555]"
                              value={item.unit}
                              onChange={e => updateItem(item.id, { unit: e.target.value })}
                              placeholder="e.g. m²"
                            />
                            <div className="flex gap-1.5 shrink-0">
                              {['m²', 'Sum'].map(u => {
                                const isSelected = item.unit.toUpperCase() === u.toUpperCase() || (u === 'm²' && item.unit === 'm2');
                                return (
                                  <button
                                    key={u}
                                    type="button"
                                    onClick={() => {
                                      updateItem(item.id, { unit: isSelected ? '' : u });
                                    }}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide transition-all ${
                                      isSelected 
                                        ? 'bg-[#5c7285] text-white shadow-sm font-extrabold' 
                                        : 'bg-[#1a1a1a] text-[#a0a0a0] border border-[#383838] hover:bg-[#333] hover:text-white'
                                    }`}
                                  >
                                    {u}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-bold tracking-widest text-[#555] uppercase">Rate (£)</span>
                          <div className="flex items-center bg-[#242424] border border-[#2e2e2e] rounded-lg h-10 px-3 gap-2">
                            <input 
                              type="text"
                              className="w-full bg-transparent border-none outline-none text-[#e0e0e0] text-[11px] placeholder:text-[#555]"
                              value={item.rate}
                              onChange={e => updateItem(item.id, { rate: e.target.value })}
                              placeholder="0.00"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const isIncluded = typeof item.rate === 'string' && (item.rate.toUpperCase() === 'INCLUDED' || item.rate.toUpperCase() === 'INCL');
                                updateItem(item.id, { rate: isIncluded ? 0 : 'INCLUDED' });
                              }}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide transition-all shrink-0 ${
                                typeof item.rate === 'string' && (item.rate.toUpperCase() === 'INCLUDED' || item.rate.toUpperCase() === 'INCL')
                                  ? 'bg-[#5c7285] text-white shadow-sm font-extrabold'
                                  : 'bg-[#1a1a1a] text-[#a0a0a0] border border-[#383838] hover:bg-[#333] hover:text-white'
                              }`}
                            >
                              INCL
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {items.length === 0 && (
                    <div className="bg-[#1e1e1e] border border-dashed border-[#2a2a2a] rounded-lg p-7 px-4 text-center mt-4">
                      <div className="text-[9px] font-bold tracking-widest text-[#333] uppercase mb-2.5">No billable items defined</div>
                      <span className="text-[10px] font-bold tracking-wide text-[#b0b8c4] underline cursor-pointer uppercase" onClick={addItem}>Initialize First Line</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#242424] border border-[#333] border-t-0 overflow-hidden rounded-none">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-[#e0e0e0]">
                    <FileText className="w-3.5 h-3.5 text-[#b0b8c4] shrink-0" />
                    Terms & Conditions
                  </div>
                  <button 
                    onClick={() => setTerms([...terms, ''])}
                    className="bg-transparent border border-[#333] rounded-md w-[26px] h-[26px] flex items-center justify-center cursor-pointer text-[#555] hover:bg-[#2e2e2e] hover:text-[#e0e0e0] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="flex flex-col gap-[5px] mt-4">
                  {terms.map((term, index) => (
                    <div key={index} className="flex items-start justify-between gap-2.5 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-2.5 px-3">
                      <textarea
                        value={term}
                        onChange={(e) => {
                          const newTerms = [...terms];
                          newTerms[index] = e.target.value;
                          setTerms(newTerms);
                        }}
                        className="w-full bg-transparent border-none outline-none text-[11px] text-[#999] leading-relaxed resize-none h-14"
                        placeholder="Enter condition..."
                      />
                      <button 
                        onClick={() => setTerms(terms.filter((_, i) => i !== index))}
                        className="bg-transparent border-none cursor-pointer text-[#333] text-[11px] p-[1px] shrink-0 hover:text-red-500 transition-colors mt-[1px]"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#242424] border border-[#333] border-t-0 overflow-hidden rounded-b-xl">
              <div className="flex items-center justify-between gap-3.5 p-4">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-extrabold tracking-wider uppercase text-[#e0e0e0]">Authorization Required</h4>
                  <p className="text-[9px] text-[#555] tracking-wide uppercase leading-normal">
                    Confirm that all billable items, units, and standard terms have been verified.
                  </p>
                </div>
                <button 
                  onClick={handleSend}
                  className="flex items-center gap-2 bg-[#4a5568] border-none rounded-lg p-[11px] px-4 text-[#e0e0e0] text-[10px] font-extrabold tracking-wider cursor-pointer uppercase hover:bg-[#5a6578] transition-colors whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  Authorize & Send
                </button>
              </div>
            </div>
          </div>
        </div>

          {/* Right: PDF Live Mirror View */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
              <div className="flex items-center space-x-2 text-white/20">
                <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Live Mirror View</span>
              </div>
              <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 text-white/40 hover:text-brand-accent transition-colors cursor-pointer group"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Print / Save PDF</span>
                </button>
                <div className="w-px h-3 bg-white/10 hidden sm:block" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center text-white/20">
                  <LayoutGrid className="w-3 h-3 mr-1.5" /> A4 Preview
                </span>
              </div>
            </div>

            <div 
              ref={containerRef}
              className="w-full relative flex justify-center items-start overflow-hidden bg-[#E8E5DF] rounded-xl border border-white/5 min-h-[400px] sm:min-h-[800px] font-archivo no-scrollbar"
            >
              <div 
                className="bg-white shadow-2xl text-[#333] flex flex-col origin-top print-area shrink-0"
                style={{ 
                  width: '794px', 
                  minHeight: '1123px', 
                  transform: `scale(${scale})`,
                  marginLeft: `${(794 * scale - 794) / 2}px`,
                  marginRight: `${(794 * scale - 794) / 2}px`,
                  marginBottom: `${(1123 * scale - 1123)}px`
                }}
              >
                {/* HEADER */}
                <div className="bg-[#26262B] p-8 sm:p-12 flex justify-between items-start">
                  <div className="flex flex-col">
                    <div className="font-archivo text-[32px] sm:text-[40px] font-black text-white tracking-tight leading-none">
                      OPUS FORM
                    </div>
                    <div className="h-1 bg-[#426E91] mt-2 w-full"></div>
                  </div>
                  <div className="text-right">
                    <div className="text-[28px] sm:text-[32px] font-extrabold text-[#F4F4F0] tracking-[0.04em] leading-none mb-3">QUOTE</div>
                    <table className="ml-auto border-collapse">
                      <tbody className="text-[11px] tracking-[0.05em]">
                        <tr>
                          <td className="text-[#A8A8A0] py-0.5 px-4">REFERENCE</td>
                          <td className="text-[#F4F4F0] font-semibold text-right">#{quoteReference}</td>
                        </tr>
                        <tr>
                          <td className="text-[#A8A8A0] py-0.5 px-4">DATE</td>
                          <td className="text-[#F4F4F0] font-semibold text-right">{new Date().toLocaleDateString('en-GB')}</td>
                        </tr>
                        <tr>
                          <td className="text-[#A8A8A0] py-0.5 px-4">VALID UNTIL</td>
                          <td className="text-[#F4F4F0] font-semibold text-right">
                            {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ACCENT LINE */}
                <div className="h-1 bg-[#526E8C]"></div>

                {/* COMPANY META */}
                <div className="bg-[#F8F7F4] px-12 py-3.5 flex flex-wrap gap-10 border-b border-[#E4E0D8]">
                  <span className="text-[10px] text-[#888] tracking-[0.06em] uppercase">Company No. 14902188</span>
                  <span className="text-[10px] text-[#888] tracking-[0.06em] uppercase">VAT Reg No. GB 412 8876 21</span>
                  <span className="text-[10px] text-[#888] tracking-[0.06em] uppercase">operations@opusform.co.uk</span>
                </div>

                {/* BODY */}
            <div className="px-12 py-8 flex-1 flex flex-col">
                  {/* BILL TO / PROJECT */}
                  <div className="mb-7 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-[#526E8C] mb-1.5">Client</div>
                      <div className="border border-[#E4E0D8] p-4 min-h-[72px] text-xs">
                        {clientInfo.entity ? (
                          <div className="space-y-1">
                            <p className="font-bold text-gray-900 uppercase text-sm">{clientInfo.entity}</p>
                            <p className="text-gray-600 uppercase tracking-wide">{clientInfo.email || '...'}</p>
                          </div>
                        ) : (
                          <span className="text-[#AAA]">No client data entered</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-[#526E8C] mb-1.5">Project</div>
                      <div className="border border-[#E4E0D8] p-4 min-h-[72px] text-xs">
                        {clientInfo.site ? (
                          <div className="space-y-1">
                            <p className="font-bold text-gray-900 uppercase text-sm">{clientInfo.site}</p>
                            <p className="text-gray-600 uppercase tracking-wide">{clientInfo.postcode || '...'}</p>
                          </div>
                        ) : (
                          <span className="text-[#AAA]">No project data entered</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* TABLE */}
                  <div className="flex-1">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#26262B]">
                          <th className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-left w-[42%]">Description of Structural Elements</th>
                          <th className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-right w-[16%]">Volume / Qty</th>
                          <th className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-left w-[10%]">Unit</th>
                          <th className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-right w-[16%]">Unit Rate</th>
                          <th className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-right w-[16%]">Net Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length > 0 ? items.map((item, idx) => (
                          <tr key={item.id} className={`border-b border-[#EDEAE4] ${idx % 2 === 1 ? 'bg-[#FAFAF8]' : ''}`}>
                            <td className="p-3 text-xs leading-relaxed text-[#333]">{item.description || '...'}</td>
                            <td className="p-3 text-xs text-right text-[#333] font-medium">{item.quantity}</td>
                            <td className="p-3 text-[11px] text-[#BBB] italic uppercase tracking-wide">{item.unit}</td>
                            <td className="p-3 text-xs text-right text-[#333]">
                              {typeof item.rate === 'string' && (item.rate.toUpperCase() === 'INCLUDED' || item.rate.toUpperCase() === 'INCL') 
                                ? 'INCLUDED' 
                                : `£${Number(item.rate || 0).toFixed(2)}`}
                            </td>
                            <td className="p-3 text-xs text-right text-[#333] font-bold">
                              {typeof item.rate === 'string' && (item.rate.toUpperCase() === 'INCLUDED' || item.rate.toUpperCase() === 'INCL') 
                                ? 'INCLUDED' 
                                : `£${(item.quantity * Number(item.rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                            </td>
                          </tr>
                        )) : (
                          <tr className="border-b border-[#EDEAE4]">
                            <td colSpan={5} className="p-10 text-center text-[#BBB] italic text-[11px] uppercase tracking-widest">No billable items added</td>
                          </tr>
                        )}
                        <tr className="h-4 bg-[#FAFAF8]"><td colSpan={5}></td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* TOTALS */}
                  <div className="flex justify-end border-t-2 border-[#26262B]">
                    <div className="w-[280px]">
                      <div className="flex justify-between p-2 px-3 text-xs border-b border-[#EDEAE4] text-[#666]">
                        <span className="uppercase tracking-widest">NET SUBTOTAL</span>
                        <span className="font-semibold text-[#333]">£{totals.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between p-2 px-3 text-xs border-b border-[#EDEAE4] text-[#666]">
                        <span className="uppercase tracking-widest text-[10px]">UK STANDARD VAT ({vatRate}%)</span>
                        <span className="font-semibold text-[#333]">£{totals.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between p-3.5 px-3 bg-[#26262B] text-[#F4F4F0] font-extrabold text-[15px]">
                        <span className="uppercase tracking-widest">Concrete Works Total</span>
                        <span>£{totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FOOTER BODY */}
                <div className="px-12 pt-7">
                  <div className="bg-[#F4F3F0] border-l-[3px] border-[#526E8C] p-4 mb-6">
                    <div className="text-[9px] font-extrabold tracking-[0.12em] uppercase text-[#526E8C] mb-2.5">Standard Terms & Pour Conditions</div>
                    <ul className="list-disc pl-3.5 space-y-1.5">
                      {terms.map((term, index) => term.trim() && (
                        <li key={index} className="text-[10.5px] text-[#555] leading-relaxed">{term}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-8">
                    <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-[#888] mb-2">Banking Details</div>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-2">
                      <div className="text-[10px]">
                        <div className="text-[9px] text-[#AAA] uppercase tracking-[0.06em]">Bank</div>
                        <div className="font-semibold text-[#333]">Barclays Business Banking</div>
                      </div>
                      <div className="text-[10px]">
                        <div className="text-[9px] text-[#AAA] uppercase tracking-[0.06em]">Account Name</div>
                        <div className="font-semibold text-[#333]">Opus Form Ltd</div>
                      </div>
                      <div className="text-[10px]">
                        <div className="text-[9px] text-[#AAA] uppercase tracking-[0.06em]">Sort Code</div>
                        <div className="font-semibold text-[#333]">20-00-00</div>
                      </div>
                      <div className="text-[10px]">
                        <div className="text-[9px] text-[#AAA] uppercase tracking-[0.06em]">Account No.</div>
                        <div className="font-semibold text-[#333]">13319268</div>
                      </div>
                      <div className="text-[10px]">
                        <div className="text-[9px] text-[#AAA] uppercase tracking-[0.06em]">IBAN</div>
                        <div className="font-semibold text-[#333]">GB29 NWBK 6016 1331 9268 19</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DOC FOOTER */}
                <div className="bg-[#26262B] px-8 sm:px-12 py-3.5 flex justify-between items-center mt-auto">
                  <span className="text-[9px] text-[#666] tracking-[0.1em] uppercase">Opus Form Ltd</span>
                  <span className="text-[9px] text-[#666] tracking-[0.1em] uppercase">operations@opusform.co.uk</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
