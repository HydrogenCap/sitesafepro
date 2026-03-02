# SiteSafe — Construction Project Management Expansion

## The Opportunity

SiteSafe currently solves one half of a contractor's day: *compliance and safety*. The other half — *managing the actual build* — is still being done in spreadsheets, MS Project, WhatsApp, and email chains.

The contractors who would pay £99/month for H&S compliance software will pay £199/month for a platform that also runs their programme, tracks cost, manages drawings, logs RFIs, and handles variations. And they won't need three separate tools to do it.

No product in the UK SME construction market does both well. Procore and Viewpoint are too expensive and too complex. Buildertrend and CoConstruct are US-focused. Fieldwire is drawings-only. The gap is real.

**The repositioning:** Move from "H&S compliance software" to "Construction project control platform — with compliance built in."

---

## What You Already Have (More Than You Think)

Before building anything, several existing modules map directly onto project management needs:

| Existing feature | Project management equivalent |
|---|---|
| Site diary — work completed/planned | Daily progress tracking, basis for programme updates |
| Site diary — delays | Delay register, extension of time claims |
| Site diary — instructions | Precursor to a full RFI system |
| Site diary — workforce entries | Labour productivity tracking |
| Actions | Task management, punch list, snagging |
| Projects — start/end dates | Programme baseline dates |
| Contractors | Subcontractor management, resource scheduling |
| Documents | Drawings register foundation |
| Incidents | Delay events log |
| Activity log | Audit trail for programme changes |

The site diary in particular is already capturing the daily data that makes a Gantt chart meaningful — planned vs. actual work, delays, plant, labour. The programme just needs to exist so the diary can update it.

---

## New Modules to Build

---

### Module 1 — Programme (Gantt Chart)

The centrepiece. Everything else in this spec feeds into or is driven by the programme.

#### What it needs to do

A construction programme for a UK SME contractor is not complex. It is not critical path method (CPM) with resource histograms — that's what Primavera is for. What a site manager actually needs:

- A list of work packages (tasks) with start and end dates
- Milestones (key dates: groundworks complete, frame up, watertight, fit-out start, handover)
- A visual bar chart showing everything on a timeline
- The ability to drag bars to reschedule
- A baseline (the original programme, locked) versus current (what's actually happening)
- Dependencies between tasks (optional but valuable)
- A simple indication of what's on time, late, or at risk

#### Database Schema

```sql
CREATE TABLE programme_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES programme_tasks(id),  -- WBS nesting
  
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'task',  -- 'task' | 'milestone' | 'summary'
  
  -- Baseline dates (locked on programme approval)
  baseline_start DATE,
  baseline_finish DATE,
  
  -- Current planned dates (updated as programme changes)
  planned_start DATE NOT NULL,
  planned_finish DATE NOT NULL,
  
  -- Actuals (updated from site diary or manually)
  actual_start DATE,
  actual_finish DATE,
  
  -- Progress
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Status
  status TEXT DEFAULT 'not_started',
  -- 'not_started' | 'in_progress' | 'complete' | 'delayed' | 'at_risk'
  
  -- Classification
  trade TEXT,          -- 'groundworks' | 'structure' | 'envelope' | 'mep' | 'finishes' etc.
  is_critical BOOLEAN DEFAULT FALSE,
  
  -- Sorting
  sort_order INTEGER DEFAULT 0,
  
  -- Constraints
  early_start DATE,
  late_finish DATE,
  constraint_type TEXT,  -- 'asap' | 'must_start_on' | 'must_finish_on'
  constraint_date DATE,
  
  -- Links
  assigned_contractor_id UUID REFERENCES contractors(id),
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE programme_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  from_task_id UUID REFERENCES programme_tasks(id) ON DELETE CASCADE,
  to_task_id UUID REFERENCES programme_tasks(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'FS',  -- 'FS' (finish-start) | 'SS' | 'FF' | 'SF'
  lag INTEGER DEFAULT 0,   -- lag in working days
  UNIQUE(from_task_id, to_task_id)
);

CREATE TABLE programme_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- 'Baseline 1', 'Revised Programme March 2026'
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Snapshot of tasks at time of baseline stored as JSONB
  -- (a separate baseline_tasks table is cleaner for large programmes)
);
```

#### Frontend — Gantt Component

**Recommended library:** `gantt-task-react` (MIT licence, actively maintained, TypeScript support, drag-to-reschedule built in). Install with:

```bash
npm install gantt-task-react
```

**New page:** `src/pages/Programme.tsx`

Route: `/projects/:id/programme`

The page has two views toggled at the top:

**1. Gantt View** — the visual bar chart. Features:
- Zoomable timeline: Day / Week / Month / Quarter views
- Collapsible task groups (summary rows with sub-tasks)
- Drag to move bars, drag edges to resize (changes planned dates)
- Milestone diamonds at key dates
- Progress fill inside bars (drives from the `progress` field)
- Baseline bars shown as grey outlines behind current bars
- Delay highlighting: bars past their baseline finish shown in amber/red
- Today line
- Dependency arrows between tasks

**2. Task List View** — spreadsheet-style editing. Columns:
- WBS number (auto-calculated)
- Task name (editable inline)
- Trade
- Duration (calculated from dates)
- Planned start / finish
- Actual start / finish
- Progress % (slider)
- Contractor assigned
- Status badge
- Baseline variance (days early/late)

**New tab in `ProjectDetail.tsx`:**

```tsx
<TabsTrigger value="programme">Programme</TabsTrigger>
```

This tab embeds a mini Gantt (read-only, 4-week window, 10 tasks max) linking to the full Programme page. Acts as a health check for the project — red/amber/green at a glance.

#### Integration with Site Diary

The site diary `work_completed` and `work_planned_tomorrow` fields already record task-level progress in free text. In the enhanced version, when a diary entry is created, a "Link to Programme" panel allows the site manager to:
- Select which programme tasks were worked on that day
- Update the progress % directly from the diary
- Mark tasks as started or completed

This creates a live connection between daily site records and the programme — something most platforms don't do.

#### Auto-Update Rules

When a task's `actual_start` is recorded:
- Set `status` to `in_progress`
- Check if this is after `planned_start` — if so, flag as delayed

When `actual_finish` is recorded:
- Set `progress` to 100
- Set `status` to `complete`
- Check if this is after `planned_finish` — calculate delay in days
- Cascade: check if any dependent tasks are now at risk

---

### Module 2 — Budget & Cost Management

The second most important module. A Gantt without cost is half a picture.

#### What UK contractors actually track

- **Contract sum**: The agreed value with the client
- **Variations**: Agreed additional/reduced scope with cost
- **Anticipated Final Cost (AFC)**: What you expect to spend
- **Subcontractor packages**: Each trade as a line item with contract value and payments certified
- **Applications for payment**: Monthly valuation process (UK-specific)
- **Cash flow**: S-curve of spend vs programme

#### Database Schema

```sql
CREATE TABLE project_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Contract values
  contract_sum DECIMAL(12,2),
  contract_currency TEXT DEFAULT 'GBP',
  contract_type TEXT,  -- 'JCT_SBC' | 'JCT_Minor' | 'NEC4_ECC' | 'NEC4_ShortForm' | 'Bespoke'
  
  -- Running totals (recalculated on any change)
  approved_variations DECIMAL(12,2) DEFAULT 0,
  current_contract_sum DECIMAL(12,2),  -- contract_sum + approved_variations
  anticipated_final_cost DECIMAL(12,2),
  contingency DECIMAL(12,2),
  
  -- Cost to date
  certified_to_date DECIMAL(12,2) DEFAULT 0,
  paid_to_date DECIMAL(12,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  code TEXT,           -- 'A', 'B', '01', etc. - user-defined cost codes
  description TEXT NOT NULL,
  category TEXT,       -- 'prelims' | 'groundworks' | 'structure' | 'envelope' | 'mep' | 'finishes' | 'external' | 'contingency'
  
  budget_value DECIMAL(12,2),
  committed_value DECIMAL(12,2) DEFAULT 0,  -- value of placed orders/contracts
  certified_value DECIMAL(12,2) DEFAULT 0,  -- certified to date
  forecast_final DECIMAL(12,2),             -- user's current forecast
  
  contractor_id UUID REFERENCES contractors(id),  -- assigned subcontractor
  linked_task_id UUID REFERENCES programme_tasks(id),  -- link to programme task
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  variation_number TEXT NOT NULL,  -- 'VOI 001', 'CE001' for NEC
  title TEXT NOT NULL,
  description TEXT,
  
  type TEXT,  -- 'addition' | 'omission' | 'substitution'
  status TEXT DEFAULT 'submitted',
  -- 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'
  
  -- NEC Early Warning / Compensation Event fields
  is_compensation_event BOOLEAN DEFAULT FALSE,
  early_warning_reference TEXT,
  
  -- Financial
  quoted_value DECIMAL(12,2),
  agreed_value DECIMAL(12,2),
  time_impact_days INTEGER DEFAULT 0,
  
  -- Dates
  submitted_date DATE,
  approved_date DATE,
  
  submitted_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  
  linked_task_id UUID REFERENCES programme_tasks(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  application_number INTEGER NOT NULL,
  valuation_date DATE NOT NULL,
  submission_date DATE,
  due_date DATE,  -- typically 28 days from valuation date
  
  -- Values
  gross_value DECIMAL(12,2),     -- value of work done
  retention DECIMAL(12,2),
  net_value DECIMAL(12,2),       -- gross - retention
  previous_certified DECIMAL(12,2),
  this_application DECIMAL(12,2),  -- net_value - previous_certified
  
  -- Certification
  certified_value DECIMAL(12,2),
  certified_date DATE,
  
  -- Payment
  paid_value DECIMAL(12,2),
  paid_date DATE,
  
  status TEXT DEFAULT 'draft',
  -- 'draft' | 'submitted' | 'certified' | 'disputed' | 'paid'
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Frontend

**New page:** `src/pages/Budget.tsx`

Route: `/projects/:id/budget`

Four tabs:
1. **Summary** — contract sum, approved variations, AFC, certified to date, remaining. Progress bar showing spend curve.
2. **Cost Plan** — spreadsheet view of `budget_items` with inline editing. Totals row. Category grouping.
3. **Variations** — table of all variations with status badges, filter by status, quick approve/reject workflow.
4. **Applications** — monthly payment schedule, application vs. certified vs. paid.

**New tab in `ProjectDetail.tsx`:**
```tsx
<TabsTrigger value="budget">Budget</TabsTrigger>
```

Mini budget widget in the tab: contract sum, current AFC, and a single variance figure (over/under budget in £ and %).

---

### Module 3 — Drawings Register & RFIs

Construction information management. Drawings, specifications, and the process for resolving questions about them.

#### What's different from the existing Documents module

The existing `Documents` module is for H&S and compliance documents (RAMS, gas certs, F10, etc.). Drawings are a different beast:
- They have revision numbers (A, B, C... or P1, P2... or numbered revisions)
- They are issued by the design team, not the contractor
- Multiple stakeholders issue drawings simultaneously (architect, structural, M&E)
- Superceded revisions must be tracked but not deleted
- "Issued For Construction" (IFC) status is a formal milestone
- They generate questions (RFIs) that must be formally answered

#### Database Schema

```sql
CREATE TABLE drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  drawing_number TEXT NOT NULL,   -- e.g. 'SK-001', '101', 'S-200'
  title TEXT NOT NULL,
  discipline TEXT,   -- 'architectural' | 'structural' | 'mechanical' | 'electrical' | 'civil' | 'landscape'
  
  current_revision TEXT,  -- 'A', 'B', 'P3', '3'
  status TEXT DEFAULT 'information',
  -- 'preliminary' | 'information' | 'coordination' | 'construction' | 'as_built' | 'superseded'
  
  scale TEXT,          -- '1:50', '1:100', etc.
  paper_size TEXT,     -- 'A1', 'A3'
  
  file_url TEXT,       -- current revision file
  file_name TEXT,
  
  issued_by TEXT,      -- architect, engineer, contractor
  issued_date DATE,
  
  -- For IFC tracking
  ifc_date DATE,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE drawing_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  status TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  issued_by TEXT,
  issued_date DATE,
  revision_description TEXT,  -- what changed
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  rfi_number TEXT NOT NULL,  -- 'RFI-001', 'RFI-002'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Classification
  discipline TEXT,
  priority TEXT DEFAULT 'normal',  -- 'low' | 'normal' | 'high' | 'critical'
  
  -- Routing
  raised_by UUID REFERENCES profiles(id),
  assigned_to_name TEXT,   -- often external (architect, engineer) — not a profile
  assigned_to_email TEXT,
  
  -- Dates
  raised_date DATE DEFAULT CURRENT_DATE,
  required_by DATE,
  response_date DATE,
  
  -- Resolution
  status TEXT DEFAULT 'open',
  -- 'open' | 'pending_response' | 'answered' | 'closed' | 'void'
  response TEXT,
  
  -- Impact
  cost_impact BOOLEAN DEFAULT FALSE,
  time_impact BOOLEAN DEFAULT FALSE,
  linked_variation_id UUID REFERENCES variations(id),
  
  -- References
  linked_drawing_ids UUID[],   -- drawings this RFI relates to
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Frontend

**New page:** `src/pages/DrawingsRegister.tsx`

Route: `/projects/:id/drawings`

Three tabs:
1. **Drawings** — filterable table by discipline/status. Upload new revision. Download current IFC set. Mark as superseded.
2. **Transmittals** — formal record of drawing issues (who sent what to whom and when)
3. **RFIs** — table of open and closed RFIs with status badges, assigned to, required by dates. Create new RFI with linked drawings.

**Integration with Documents tab in ProjectDetail:** Add a "Drawing" category option to the existing document upload dialog that routes to the drawings register instead.

---

### Module 4 — Procurement Schedule

Tracking orders and deliveries for long-lead items and subcontractor packages. Currently the site diary records deliveries that have arrived. This module manages what needs to arrive and when.

#### Database Schema

```sql
CREATE TABLE procurement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  category TEXT,  -- 'plant' | 'materials' | 'subcontract' | 'specialist'
  
  -- Supplier/Contractor
  supplier_name TEXT,
  contractor_id UUID REFERENCES contractors(id),
  
  -- Timeline
  design_info_required_date DATE,  -- date design info needed to proceed
  order_date DATE,
  lead_time_weeks INTEGER,
  required_on_site_date DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Financial
  budget_value DECIMAL(12,2),
  order_value DECIMAL(12,2),
  purchase_order_number TEXT,
  
  -- Status
  status TEXT DEFAULT 'not_ordered',
  -- 'not_ordered' | 'enquiry_sent' | 'quotes_received' | 'ordered' | 'delivered' | 'cancelled'
  
  notes TEXT,
  linked_task_id UUID REFERENCES programme_tasks(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Frontend

**New page:** `src/pages/Procurement.tsx`

Route: `/projects/:id/procurement`

A single table view with traffic light status system. Filter by category and status. Highlight items where `required_on_site_date` is within 2 weeks and `status` is not `ordered` or `delivered` — these are the risks.

Key integration: Link procurement items to programme tasks. If a task has a `linked_procurement_item` that is at risk of late delivery, flag the programme task as at risk too.

---

### Module 5 — Meeting Minutes

Formal records of site meetings, design team meetings, and pre-start meetings. Every construction project generates dozens of these and they are frequently lost in email.

#### Database Schema

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  meeting_type TEXT,
  -- 'site_progress' | 'design_team' | 'pre_start' | 'pre_contract' | 'client_review' | 'safety' | 'other'
  
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  location TEXT,
  
  chair_name TEXT,
  minute_taker_id UUID REFERENCES profiles(id),
  
  -- Attendees (mix of internal profiles and external contacts)
  attendees JSONB DEFAULT '[]',
  -- [{name, company, role, present: boolean}]
  
  apologies JSONB DEFAULT '[]',
  
  agenda_items JSONB DEFAULT '[]',
  -- [{item_number, heading, notes, actions}]
  
  general_notes TEXT,
  
  -- Previous meeting actions carried forward
  previous_meeting_id UUID REFERENCES meetings(id),
  
  status TEXT DEFAULT 'draft',  -- 'draft' | 'issued' | 'agreed'
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meeting_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  
  action_number TEXT,  -- 'A001', 'A002'
  description TEXT NOT NULL,
  responsible_name TEXT,
  responsible_profile_id UUID REFERENCES profiles(id),
  due_date DATE,
  status TEXT DEFAULT 'open',  -- 'open' | 'in_progress' | 'complete' | 'carried_forward'
  completion_notes TEXT,
  
  -- These can also be created as a main Actions record
  linked_action_id UUID REFERENCES actions(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Frontend

**New page:** `src/pages/Meetings.tsx`

Route: `/projects/:id/meetings`

List of all meetings with type badge and date. Create meeting opens a structured form. Meeting detail page shows agenda, minutes, and actions table. "Issue Minutes" button generates a PDF and optionally emails attendees.

**Key integration:** Actions raised in meeting minutes can optionally be pushed to the main Actions module (`/actions`), where they'll appear in the Actions dashboard and trigger notifications.

---

## Technical Approach for the Gantt Chart

The Gantt is the most technically demanding component. Practical implementation guide:

### Recommended: `gantt-task-react`

```bash
npm install gantt-task-react
```

This library (MIT licence) provides:
- Drag-to-move and drag-to-resize bars
- Dependency arrows
- Milestone diamonds
- Progress fill
- TypeScript support
- Mobile-friendly (touch events)

It does not provide: baseline display, multi-level grouping collapse, resource view. These require custom additions.

### Data transformation

The library expects a flat array of `Task` objects. Transform from the DB schema:

```typescript
import { Task } from 'gantt-task-react';

function toGanttTask(dbTask: ProgrammeTask): Task {
  return {
    id: dbTask.id,
    name: dbTask.title,
    start: new Date(dbTask.planned_start),
    end: new Date(dbTask.planned_finish),
    progress: dbTask.progress,
    type: dbTask.task_type === 'milestone' ? 'milestone' 
        : dbTask.task_type === 'summary' ? 'project' 
        : 'task',
    project: dbTask.parent_id || undefined,
    dependencies: [], // populated from programme_dependencies query
    isDisabled: false,
    styles: {
      progressColor: dbTask.status === 'delayed' ? '#ef4444' 
                   : dbTask.status === 'at_risk' ? '#f59e0b' 
                   : '#0F766E',
      progressSelectedColor: '#0d6660',
    }
  };
}
```

### Baseline overlay

`gantt-task-react` does not natively support baseline bars. Add them as a custom `TaskListTable` or by rendering an SVG overlay layer behind the main Gantt using absolute positioning. Each baseline bar is a translucent rectangle aligned to `baseline_start`/`baseline_finish` dates.

### Saving changes

When a bar is dragged, the library fires `onDateChange(task, children)`. Save the new dates:

```typescript
const handleDateChange = async (task: Task) => {
  await supabase
    .from('programme_tasks')
    .update({
      planned_start: task.start.toISOString().split('T')[0],
      planned_finish: task.end.toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id);
};
```

---

## Positioning and Pricing

### The pitch shift

| Before | After |
|---|---|
| "H&S compliance software" | "Construction project control platform" |
| Replaces paper-based safety systems | Replaces MS Project + Excel + WhatsApp |
| Justifies £99/month | Justifies £199–299/month |

### Recommended tier restructure

| Tier | Old | New | Price |
|---|---|---|---|
| Starter | H&S basics, 1 project | H&S basics, 1 project | £49/month |
| Professional | Full H&S, 5 projects | Full H&S + Programme (Gantt) + Budget summary, 5 projects | £99/month |
| Business *(new)* | — | Full H&S + Full PM (Gantt, Budget, Drawings, RFIs, Procurement, Meetings) | £179/month |
| Enterprise | Full H&S + client portal | Full platform + client portal + API + unlimited | £299/month |

The "Business" tier is targeted at main contractors running 2–10 projects who currently use MS Project and Excel alongside a separate H&S system. Consolidating both into one tool at £179/month is a straightforward sell.

### Feature access additions to `FEATURE_ACCESS` in `useSubscription.ts`

```typescript
programme_gantt: ['professional', 'business', 'enterprise'],
budget_management: ['business', 'enterprise'],
drawings_register: ['business', 'enterprise'],
rfi_management: ['business', 'enterprise'],
procurement_schedule: ['business', 'enterprise'],
meeting_minutes: ['professional', 'business', 'enterprise'],
variations: ['business', 'enterprise'],
payment_applications: ['business', 'enterprise'],
```

---

## Phased Roadmap

Build in this order. Each phase is shippable independently.

---

### Phase 1 — Programme Foundation (6–8 weeks)

Delivers the Gantt chart as a standalone feature. This alone justifies the price increase.

1. Database migration — `programme_tasks` and `programme_dependencies` tables
2. Basic CRUD API (Supabase queries, no edge functions needed)
3. Programme page with Gantt view using `gantt-task-react`
4. Task list view (spreadsheet editing)
5. Add "Programme" tab to `ProjectDetail.tsx`
6. Integrate with site diary — link diary `work_completed` items to tasks
7. Basic PDF export of the programme

**Deliverable:** Contractors can build a programme, view it as a Gantt, and update it as work progresses.

---

### Phase 2 — Budget & Variations (4–6 weeks)

Financial control alongside the programme.

1. Database migration — `project_budget`, `budget_items`, `variations`, `payment_applications`
2. Budget page with 4 tabs
3. Add "Budget" tab to `ProjectDetail.tsx`
4. Variation workflow (submit → review → approve/reject)
5. Payment application generator with PDF export
6. Connect budget items to programme tasks (cost/schedule integration)

**Deliverable:** Contractors can track contract value, variations, and monthly applications alongside the programme.

---

### Phase 3 — Drawings & RFIs (4–5 weeks)

Information management.

1. Database migration — `drawings`, `drawing_revisions`, `rfis`
2. Drawings register page with upload and revision tracking
3. RFI creation and tracking
4. PDF transmittal generator
5. Integrate IFC dates with programme milestones

**Deliverable:** Contractors have a formal drawings register and RFI log replacing email chains.

---

### Phase 4 — Procurement & Meetings (3–4 weeks)

The remaining modules.

1. Database migration — `procurement_items`, `meetings`, `meeting_actions`
2. Procurement schedule page
3. Meeting minutes page with PDF export
4. Push meeting actions to main Actions module
5. Link procurement items to programme tasks (delivery date risk flagging)

---

### Phase 5 — Integration Layer (2–3 weeks)

Making everything talk to each other.

1. Programme health widget on Dashboard
2. "At risk" task detection (based on procurement delays, variation time impacts, late diary updates)
3. Extended client portal — read-only access to programme and drawings register for the client
4. Handover pack generator (from previous spec) upgraded to include programme, budget summary, and drawings list
5. Enhanced Analytics — programme S-curve, budget S-curve, RFI response time trends

---

## Quick Wins Available Right Now

These don't require new modules — they improve project management using what already exists:

**1. Project % complete field**
Add a `progress_percentage` integer to the `projects` table. Show on project cards and the dashboard. Can be manually entered or auto-calculated from programme task completion once Phase 1 is built.

**2. Project overview improvements**
The `ProjectDetail.tsx` header currently shows status, start date, and end date. Add: days remaining, client name prominent, contract value (once budget module exists), and a programme health indicator (on track / at risk / delayed).

**3. Delay register from site diary**
The site diary already has a `delays` JSONB array (cause, duration, impact, mitigation). Build a simple "Delay Register" view that aggregates all delays across all diary entries for a project. This is useful for extension of time claims and is already there in the data.

**4. Instructions log**
The site diary already records `instructions` (from whom, the instruction, reference, action required). Aggregate these into a per-project "Instructions Register" — a formal log of all verbal and written instructions. Critical for NEC contracts where instructions are compensation events.

---

## What This Competes With

Once Phases 1–3 are complete, SiteSafe competes directly with:

| Competitor | Their weakness | Your advantage |
|---|---|---|
| Procore | £500+/month, complex, US-focused | Fraction of the price, UK-specific, CDM built in |
| Viewpoint / Trimble | Desktop-first, enterprise only | Mobile-first, SME pricing |
| Fieldwire | Drawings only, no PM or H&S | All-in-one platform |
| MS Project + Excel | No mobile, no collaboration | Real-time, multi-user, site-accessible |
| Buildertrend | US residential focus | UK commercial/industrial, CDM aware |

The unique position: **the only UK SME construction platform where the programme, budget, drawings, and H&S compliance all live in one place and talk to each other.**

---

*Specification compiled March 2026*
