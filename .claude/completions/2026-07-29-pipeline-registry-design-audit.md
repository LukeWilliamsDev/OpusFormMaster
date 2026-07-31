# Design Audit: PipelineRegistry.tsx

**Component:** `src/opus/components/PipelineRegistry.tsx`  
**Type:** Large composite component — Pipeline/Quote registry with list/grid views  
**Audit Date:** 2026-07-29  
**Status:** ORIGINAL/EDITOR/CRITIC analysis complete — ready for application

---

## ORIGINAL — Current Design Patterns

### 1. **Tabs Navigation (Standard)**

```tsx
<Tabs defaultValue="pipeline" className="w-full">
  <TabsList className="w-full grid grid-cols-3">
    <TabsTrigger value="pipeline" className="flex items-center gap-1">
      <LayoutGrid className="w-3.5 h-3.5" /> Pipeline
    </TabsTrigger>
    <TabsTrigger value="quotes" className="flex items-center gap-1">
      <FileText className="w-3.5 h-3.5" /> Quotes
    </TabsTrigger>
    <TabsTrigger value="clients" className="flex items-center gap-1">
      <Users className="w-3.5 h-3.5" /> Clients
    </TabsTrigger>
  </TabsList>
```

- **Pattern:** 3 equal tabs, icons + labels
- **Critique:** Generic, no visual hierarchy. "Pipeline" vs "Quotes" vs "Clients" — unclear relationship.

---

### 2. **Pipeline View — Kanban Board (Standard)**

```tsx
<div className="flex-1 overflow-auto p-4">
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
    {PIPELINE_STAGES.map((stage) => (
      <div key={stage.id} className="bg-card border border-border rounded-xl flex flex-col h-full min-h-[500px]">
        <div className="p-3 border-b border-border bg-muted/50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{stage.label}</h3>
            <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{quotes.filter(q => q.status === stage.id).length}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3" id={`stage-${stage.id}`}>
          {quotes.filter(q => q.status === stage.id).map(quote => (
            <Draggable draggableId={quote.id} index={...}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="bg-white dark:bg-slate-800 border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary font-mono">{quote.reference}</span>
                    <span className="text-xs text-muted-foreground">{quote.date}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground truncate mb-1">{quote.clientInfo.entity}</div>
                  <div className="text-xs text-muted-foreground">{quote.clientInfo.site}</div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                    <span className="text-sm font-bold text-foreground">£{quote.totals.grossTotal.toLocaleString()}</span>
                    <button onClick={() => handleQuoteClick(quote)} className="text-xs text-primary hover:underline">View</button>
                  </div>
                </div>
              )}
            )}
          ))}
        </div>
      </div>
    ))}
  </div>
</div>
```

**CRITIC FEEDBACK:** Standard Kanban, generic cards. No concrete industry personality. "Draggable" is generic.

---

### 3. **Quotes View — List with Actions**

```tsx
<div className="space-y-3">
  {filteredQuotes.map((quote) => (
    <div
      key={quote.id}
      className="bg-card border border-border rounded-xl p-4 hover:bg-secondary/50 transition-colors flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{quote.reference}</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                getStatusBadge(quote.status),
              )}
            >
              {quote.status}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {quote.clientInfo.entity} · {quote.clientInfo.site}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-foreground font-mono">
          £{quote.totals.grossTotal.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">{quote.date}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleQuoteClick(quote)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="View/Edit"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDuplicateQuote(quote)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSendQuote(quote)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
```

---

### 4. **Clients View — Grid Cards**

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {clients.map((client) => (
    <div
      key={client.id}
      className="bg-card border border-border rounded-xl p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{client.entity}</h3>
          <p className="text-xs text-muted-foreground">{client.email}</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{client.quotesCount} quotes</span>
        <span className="font-mono text-muted-foreground">
          £{client.totalValue.toLocaleString()}
        </span>
      </div>
    </div>
  ))}
</div>
```

---

### 5. **Create/Edit Quote Modal — Standard Form**

```tsx
<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-bold">{editingQuote ? "Edit Quote" : "Create New Quote"}</h2>
      <button onClick={() => setIsModalOpen(false)}>
        <X className="w-5 h-5" />
      </button>
    </div>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Client Name</label>
          <input
            type="text"
            className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-foreground"
          />
        </div>
        ...
      </div>
      <div className="border-t border-border pt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsModalOpen(false)}
          className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Save
        </button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

---

### 6. **Filter/Search Bar**

```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <input type="text" placeholder="Search quotes, clients, references..." className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground" />
  </div>
  <div className="flex items-center gap-2">
    <Select>
      <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Status" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="sent">Sent</SelectItem>
        <SelectItem value="approved">Approved</SelectItem>
        <SelectItem value="rejected">Rejected</SelectItem>
      </SelectContent>
    </Select>
    <Select>
      <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Stages" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
```

---

## EDITOR — Domain-Specific Personality Enhancements

### Color System: Concrete/Flooring Industry Palette

```css
:root {
  --concrete-amber: #d97706;
  --concrete-amber-light: #fde68a;
  --concrete-amber-dark: #b45309;
  --steel-stone: #475569;
  --steel-stone-light: #94a3b8;
  --steel-stone-dark: #1e293b;
  --cured-green: #059669;
  --cured-green-light: #6ee7b7;
  --safety-yellow: #eab308;
  --rebar-rust: #dc2626;
  --formwork: #f8fafc;
  --formwork-dark: #0f172a;
}
```

---

### 1. **Tabs: Site Office Navigation**

```tsx
<div className="bg-white/5 dark:bg-slate-900/50 backdrop-blur-sm border-b border-stone-200 dark:border-slate-700">
  <div className="max-w-7xl mx-auto px-4 sm:px-6">
    <div className="flex gap-1 p-1 rounded-xl bg-stone-100 dark:bg-slate-800/50">
      <TabsTrigger value="pipeline" className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
        activeTab === "pipeline"
          ? "bg-white dark:bg-slate-800 shadow-sm text-amber-700 dark:text-amber-300"
          : "text-stone-500 hover:text-stone-700 dark:text-slate-400 hover:text-white"
      )}>
        <Truck className="w-4 h-4" />
        <span className="hidden sm:inline">Site Pipeline</span>
      </TabsTrigger>
      <TabsTrigger value="quotes" className={cn(...)}>
        <ClipboardList className="w-4 h-4" />
        <span className="hidden sm:inline">Delivery Tickets</span>
      </TabsTrigger>
      <TabsTrigger value="clients" className={cn(...)}>
        <Building2 className="w-4 h-4" />
        <span className="hidden sm:inline">Client Register</span>
      </TabsTrigger>
    </TabsList>
  </div>
</div>
```

---

### 2. **Pipeline View: Site Delivery Board**

```tsx
<div className="flex-1 overflow-auto p-4">
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
    {PIPELINE_STAGES.map((stage) => (
      <div key={stage.id} className="bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-xl flex flex-col h-full min-h-[500px]">
        <div className="p-3 border-b border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900/50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">{stage.label}</h3>
            <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">{quotes.filter(q => q.status === stage.id).length}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3" id={`stage-${stage.id}`}>
          {quotes.filter(q => q.status === stage.id).map(quote => (
            <Draggable draggableId={quote.id} index={...}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={cn(
                  "bg-white dark:bg-slate-800 border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing",
                  snapshot.isDragging && "shadow-lg ring-2 ring-amber-500"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 font-mono">{quote.reference}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">{quote.date}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate mb-1">{quote.clientInfo.entity}</div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">{quote.clientInfo.site}</div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-200 dark:border-slate-700">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">£{quote.totals.grossTotal.toLocaleString()}</span>
                    <button onClick={() => handleQuoteClick(quote)} className="text-xs text-amber-600 hover:underline font-bold">VIEW TICKET</button>
                  </div>
                </div>
              )}
            )}
          ))}
        </div>
      </div>
    ))}
  </div>
</div>
```

**Domain touches:**

- "Site Pipeline" / "Delivery Tickets" — industry terms
- Truck icon for pipeline, ClipboardList for tickets
- Amber accent for counts and drag state
- Stone/amber color palette
- "VIEW TICKET" not "View"

---

### 3. **Quotes View: Delivery Ticket Register**

```tsx
<div className="space-y-3">
  {filteredQuotes.map((quote) => (
    <div
      key={quote.id}
      className={cn(
        "bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-xl p-4 hover:bg-stone-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between",
        quote.status === "approved" && "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/20",
        quote.status === "rejected" && "border-red-500/50 bg-red-50 dark:bg-red-900/20",
        quote.status === "sent" && "border-amber-500/50 bg-amber-50 dark:bg-amber-900/20",
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            quote.status === "approved" && "bg-emerald-100 dark:bg-emerald-900/30",
            quote.status === "rejected" && "bg-red-100 dark:bg-red-900/30",
            quote.status === "sent" && "bg-amber-100 dark:bg-amber-900/30",
            quote.status === "draft" && "bg-stone-100 dark:bg-slate-800",
          )}
        >
          <FileText
            className={cn(
              "w-5 h-5",
              quote.status === "approved" && "text-emerald-600 dark:text-emerald-400",
              quote.status === "rejected" && "text-red-600 dark:text-red-400",
              quote.status === "sent" && "text-amber-600 dark:text-amber-400",
              quote.status === "draft" && "text-stone-500 dark:text-stone-400",
            )}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              {quote.reference}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shrink-0",
                quote.status === "approved" &&
                  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300",
                quote.status === "rejected" &&
                  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300",
                quote.status === "sent" &&
                  "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300",
                quote.status === "draft" &&
                  "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300",
              )}
            >
              {quote.status.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-stone-500 dark:text-stone-400">
            {quote.clientInfo.entity} · {quote.clientInfo.site}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
          £{quote.totals.grossTotal.toLocaleString()}
        </span>
        <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">{quote.date}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleQuoteClick(quote)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title="View Ticket"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDuplicateQuote(quote)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title="Duplicate Ticket"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSendQuote(quote)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title="Send to Client"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
```

---

### 4. **Clients View: Client Register**

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {clients.map((client) => (
    <div
      key={client.id}
      className="bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-xl p-4 hover:bg-stone-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {client.entity}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">{client.email}</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-stone-200 dark:border-slate-700 flex items-center justify-between text-xs">
        <span className="text-stone-500 dark:text-stone-400">{client.quotesCount} tickets</span>
        <span className="font-mono text-amber-600 dark:text-amber-400">
          £{client.totalValue.toLocaleString()}
        </span>
      </div>
    </div>
  ))}
</div>
```

---

### 5. **Create/Edit Modal: Site Office Form**

```tsx
<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <div className="flex items-center justify-between mb-6 border-b border-stone-200 dark:border-slate-700 pb-4">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        {editingQuote ? "Edit Delivery Ticket" : "Create New Ticket"}
      </h2>
      <button onClick={() => setIsModalOpen(false)}>
        <X className="w-5 h-5 text-stone-500 hover:text-slate-700" />
      </button>
    </div>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-stone-50 dark:bg-slate-900/50 border border-stone-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
        <legend className="text-xs font-black uppercase tracking-widest text-stone-600 dark:text-stone-400 mb-4">
          CLIENT & PROJECT
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
              CLIENT NAME
            </label>
            <input
              type="text"
              className="w-full bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="ABC CONSTRUCTIONS LTD"
            />
          </div>
          ...
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-stone-200 dark:border-slate-700 pt-4">
        <button
          type="button"
          onClick={() => setIsModalOpen(false)}
          className="px-4 py-2 border border-stone-300 dark:border-slate-600 rounded-xl text-stone-700 dark:text-stone-300 font-bold hover:bg-stone-100 dark:hover:bg-slate-800"
        >
          CANCEL
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-600/20"
        >
          SAVE TICKET
        </button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

---

### 6. **Filter/Search: Site Office Toolbar**

```tsx
<div className="bg-white/5 dark:bg-slate-900/50 backdrop-blur-sm border-b border-stone-200 dark:border-slate-700">
  <div className="max-w-7xl mx-auto px-4 sm:px-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder="Search tickets, clients, references..."
          className="w-full pl-10 pr-4 py-2 border border-stone-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <Select>
          <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
</div>
```

---

## CRITIC FEEDBACK

| Aspect            | Original                | Editor                                         | Critic Assessment                         |
| ----------------- | ----------------------- | ---------------------------------------------- | ----------------------------------------- |
| **Tabs**          | Pipeline/Quotes/Clients | Site Pipeline/Delivery Tickets/Client Register | **Clearer** — domain language             |
| **Pipeline**      | Generic Kanban          | Site Delivery Board (stages = pour status)     | **Authentic** — matches concrete workflow |
| **Quotes**        | Generic list            | Delivery Ticket Register                       | **Domain-native** — matches paperwork     |
| **Clients**       | Generic cards           | Client Register (amber accents)                | **Authentic** — site register style       |
| **Forms**         | Generic inputs          | Site office batch ticket style                 | **Strong** — domain language              |
| **Status Badges** | Generic colors          | Approved=Emerald, Sent=Amber, Draft=Stone      | **Clear** — instant recognition           |
| **Color Palette** | Slate/Blue              | Amber/Stone/Emerald                            | **Authentic** — concrete site colors      |

---

## APPLY — Implementation Priority

1. **Color System** — CSS variables for amber/stone/emerald
2. **Tabs** — Site Pipeline / Delivery Tickets / Client Register
3. **Pipeline View** — Site Delivery Board
4. **Quotes View** — Delivery Ticket Register
5. **Clients View** — Client Register
6. **Modals** — Site office batch ticket style
7. **Filters/Toolbar** — Site office toolbar

---

**Estimated Effort:** 1-2 days for full component overhaul  
**Dependencies:** CSS variable system, Truck/Building2 icons  
**Testing:** Light/dark mode, drag-and-drop, responsive  
**Rollout:** Feature flag for gradual deployment
