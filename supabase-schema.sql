-- FounderHub Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  avatar_url text,
  role text not null default 'founder' check (role in ('founder', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_person text not null,
  phone text not null,
  email text not null,
  gst_number text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  client_id uuid references clients(id) on delete set null,
  status text not null default 'active' check (status in ('active','on-hold','completed','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  budget numeric not null default 0,
  upfront_received numeric not null default 0,
  deadline date,
  progress integer not null default 0 check (progress between 0 and 100),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references profiles(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'todo' check (status in ('todo','in-progress','testing','done')),
  due_date date,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- DAILY LOGS
-- ─────────────────────────────────────────
create table if not exists daily_logs (
  id uuid primary key default uuid_generate_v4(),
  founder_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  project_id uuid references projects(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  description text not null,
  hours numeric not null default 1,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete set null,
  category text not null default 'misc' check (category in ('travel','hosting','server','software','office','salary','misc')),
  description text not null,
  amount numeric not null,
  date date not null default current_date,
  added_by uuid not null references profiles(id),
  receipt_url text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete set null,
  client_id uuid not null references clients(id) on delete cascade,
  invoice_number text not null unique,
  amount numeric not null,
  due_date date not null,
  status text not null default 'draft' check (status in ('draft','sent','paid','overdue')),
  description text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- ─────────────────────────────────────────
-- FOLLOW-UPS
-- ─────────────────────────────────────────
create table if not exists follow_ups (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete set null,
  title text not null,
  description text,
  due_date date not null,
  assigned_to uuid references profiles(id) on delete set null,
  is_done boolean not null default false,
  type text not null default 'other' check (type in ('maintenance','next-phase','payment','review','other')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- LEADS (CRM)
-- ─────────────────────────────────────────
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_person text not null,
  phone text,
  email text,
  status text not null default 'lead' check (status in ('lead','qualified','proposal','negotiation','won','lost')),
  value numeric,
  notes text,
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table profiles enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table daily_logs enable row level security;
alter table expenses enable row level security;
alter table invoices enable row level security;
alter table follow_ups enable row level security;
alter table leads enable row level security;

-- Allow authenticated users full access to all tables
create policy "Authenticated users can do everything on profiles"
  on profiles for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on clients"
  on clients for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on projects"
  on projects for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on tasks"
  on tasks for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on daily_logs"
  on daily_logs for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on expenses"
  on expenses for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on invoices"
  on invoices for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on follow_ups"
  on follow_ups for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on leads"
  on leads for all to authenticated using (true) with check (true);
