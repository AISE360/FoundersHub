# FounderHub

Internal tool for 5 founders to track projects, tasks, daily work, finances, and leads.

## Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL + Row Level Security)
- **Hosting:** Netlify
- **Charts:** Recharts
- **Drag & Drop:** dnd-kit

## Modules
| Module | Description |
|---|---|
| Dashboard | Live overview — team activity, active projects, pending tasks, revenue |
| Projects | Create/edit projects with budget, upfront, deadline, progress |
| Tasks | Task management with assignee, priority, status |
| Kanban | Drag & drop kanban board (TODO → IN PROGRESS → TESTING → DONE) |
| Daily Log | Each founder logs what they worked on today with hours |
| Clients | Client directory with contact info and GST |
| Finance | Full P&L per project — budget, received, expenses, net profit |
| Expenses | Log expenses by category (travel, hosting, salary, etc.) |
| Invoices | Create invoices, mark paid, track overdue |
| Follow-Ups | Post-project reminders for maintenance, payments, next phase |
| CRM | Lead pipeline with stages (Lead → Qualified → Won/Lost) |
| Team | All founders — activity heatmap, hours this week, open tasks |

---

## Setup

### 1. Create Supabase Project
- Go to [supabase.com](https://supabase.com) and create a new project
- Copy your **Project URL** and **anon key**

### 2. Run Database Schema
- In your Supabase dashboard, go to **SQL Editor**
- Paste and run the entire contents of `supabase-schema.sql`

### 3. Configure Environment
```bash
cp .env.example .env
```
Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install & Run
```bash
npm install
npm run dev
```

### 5. Deploy to Netlify
- Push to GitHub
- Connect repo to Netlify
- Set environment variables in Netlify dashboard:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Build command: `npm run build`
- Publish directory: `dist`

### 6. Invite Your Founders
- Each founder goes to `/signup` and creates their account
- All 5 founders share the same Supabase project — everyone sees everything

---

## First Login Flow
1. Go to `/signup` → create your account
2. You'll be redirected to the Dashboard
3. Start by adding your first project in **Projects**
4. Log today's work in **Daily Log**
