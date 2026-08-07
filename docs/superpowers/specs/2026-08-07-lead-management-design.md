# Lead Management Feature Specification

## Overview
A modern, responsive Lead Management CRM component designed for React, TypeScript, and Tailwind CSS (Shadcn UI). It features a master-detail list layout with a slide-over side panel for lead details and timestamped activity logs. Built with self-contained client-side state (`localStorage`) so it starts with a clean empty state and can easily be exported to Lovable or connected to backend tables later.

---

## Technical Stack & Compatibility
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS, Lucide Icons, Shadcn UI primitives (`Sheet`, `Dialog`, `Select`, `Button`, `Input`, `Badge`, `Textarea`, `Table`)
- **State Management**: Self-contained React state + `localStorage` persistence
- **Export Target**: Lovable / standalone React component

---

## Data Model

```typescript
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Proposal Sent' | 'Won' | 'Lost';

export type LeadSource = 'Website' | 'Referral' | 'Cold Outreach' | 'Social Media' | 'Event' | 'Other';

export interface LeadNote {
  id: string;
  content: string;
  timestamp: string; // Formatted date string (e.g. "Aug 7, 2026, 10:00 AM")
  author?: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  source: LeadSource;
  status: LeadStatus;
  lastContactedDate: string; // YYYY-MM-DD
  notes: LeadNote[];
  createdAt: string;
}
```

---

## Layout & Components Architecture

### 1. Main View (`LeadManagement.tsx`)
- **Header Toolbar**:
  - Title & subtitle ("Lead Management — Track and manage client leads").
  - Search Bar (filters by Name, Company, Email).
  - Status Filter Select (All, New, Contacted, Qualified, Proposal Sent, Won, Lost).
  - "+ Add Lead" Button (opens `AddLeadModal`).
  - "Demo Data" button (optional toggle to quickly seed sample leads for preview).
- **Leads Table**:
  - Columns: Name & Avatar, Company, Email, Phone, Source Badge, Status Selector Dropdown, Last Contacted Date, Actions.
  - Interactive status dropdown per row allowing inline status change without opening the side panel.
  - Hover state indicating clickable row to open side panel.
- **Empty State**:
  - Icon graphic, friendly title ("No leads yet"), descriptive text, and "Add Your First Lead" CTA button when lead array is empty.

### 2. Slide-Over Side Panel (`LeadDetailPanel.tsx`)
- Appears on the right side of the screen when a lead is selected.
- **Header**: Lead name, company, quick status selector, delete action, close button.
- **Contact Details Card**:
  - Direct action buttons: Call (`tel:`), Email (`mailto:`).
  - Editable fields for Phone, Email, Source, and Last Contacted Date.
- **Timestamped Activity Notes Log**:
  - Textarea input with "Add Note" button (and keyboard shortcut `Ctrl+Enter`).
  - Scrollable feed of notes showing timestamp, content, author, and delete note button.
  - Notes are sorted chronologically with newest notes at the top.

### 3. Add Lead Modal (`AddLeadModal.tsx`)
- Dialog overlay with form inputs for: Name, Company, Email, Phone, Source dropdown, initial Status dropdown, and optional initial note.

---

## Routing Integration
- Route: `/portal/leads`
- Navigation item added to portal sidebar/header with icon (`Users` / `UserCheck`).

---

## Lovable Prompt (Ready to Copy)

```markdown
Build a modern Lead Management CRM component in React, TypeScript, and Tailwind CSS using Shadcn UI primitives and Lucide icons.

### Key Requirements:
1. **Layout**:
   - Master-detail view: Responsive table/list of leads on the main screen.
   - Slide-over Side Panel (Drawer/Sheet): Clicking any lead opens a slide-over panel on the right with full lead details and activity log.

2. **Data & Fields**:
   - Each lead has: Name, Company, Phone, Email, Source (Website, Referral, Cold Outreach, Social Media, Event, Other), Status (New, Contacted, Qualified, Proposal Sent, Won, Lost), Last Contacted Date, and Timestamped Notes.
   - Persistence: Save data to `localStorage` with a clean empty state by default. Include a subtle "Seed Sample Data" button in the header.

3. **Status UI**:
   - Every lead row features an inline dropdown select for Status so the user can change status directly from the table. Statuses should be styled with color-coded badges (e.g. New = Blue, Contacted = Yellow, Qualified = Purple, Proposal Sent = Indigo, Won = Emerald, Lost = Rose).

4. **Timestamped Notes Log**:
   - Inside the slide-over side panel, provide a note log section.
   - Users can type a note into a textarea and click "Add Note" (or press Ctrl+Enter).
   - Each note entry shows a human-readable timestamp (e.g., "Aug 7, 2026 at 10:00 AM"), the note content, and an option to delete the note.
   - Multiple notes can be accumulated over time per lead.

5. **Empty State**:
   - When no leads exist, show a centered empty state illustration with an "Add Your First Lead" CTA button.

6. **Add Lead Modal**:
   - Provide an "+ Add Lead" button in the top toolbar that opens a modal dialog to create a new lead with form validation.
```
