export type UserRole = 'founder' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Client {
  id: string
  company_name: string
  contact_person: string
  phone: string
  email: string
  gst_number?: string
  address?: string
  notes?: string
  created_at: string
}

export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high'

export interface Project {
  id: string
  name: string
  description?: string
  client_id?: string
  client?: Client
  status: ProjectStatus
  priority: Priority
  budget: number
  upfront_received: number
  deadline?: string
  created_by: string
  created_at: string
  members?: string[] // profile ids
  progress?: number
}

export interface ProjectExpense {
  id: string
  project_id: string
  category: string
  description: string
  amount: number
  date: string
  added_by: string
  created_at: string
}

export type TaskStatus = 'todo' | 'in-progress' | 'testing' | 'done'

export interface Task {
  id: string
  project_id: string
  title: string
  description?: string
  assignee_id?: string
  assignee?: Profile
  priority: Priority
  status: TaskStatus
  due_date?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  author?: Profile
  content: string
  created_at: string
}

export interface DailyLog {
  id: string
  founder_id: string
  founder?: Profile
  date: string
  project_id?: string
  project?: Project
  task_id?: string
  description: string
  hours: number
  created_at: string
}

export interface FollowUp {
  id: string
  project_id: string
  project?: Project
  title: string
  description?: string
  due_date: string
  assigned_to?: string
  assigned_user?: Profile
  is_done: boolean
  type: 'maintenance' | 'next-phase' | 'payment' | 'review' | 'other'
  created_at: string
}

export interface Expense {
  id: string
  project_id?: string
  project?: Project
  category: 'travel' | 'hosting' | 'server' | 'software' | 'office' | 'salary' | 'misc'
  description: string
  amount: number
  date: string
  added_by: string
  receipt_url?: string
  created_at: string
}

export type LeadStatus = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

export interface Lead {
  id: string
  company_name: string
  contact_person: string
  phone?: string
  email?: string
  status: LeadStatus
  value?: number
  notes?: string
  assigned_to?: string
  assigned_user?: Profile
  created_by: string
  created_at: string
  updated_at: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export interface Invoice {
  id: string
  project_id?: string
  project?: Project
  client_id: string
  client?: Client
  invoice_number: string
  amount: number
  due_date: string
  status: InvoiceStatus
  description?: string
  created_by: string
  created_at: string
  paid_at?: string
}

export interface DashboardStats {
  activeProjects: number
  totalRevenue: number
  pendingPayments: number
  completedProjects: number
  totalExpenses: number
  teamActivity: { founder: Profile; logsToday: number; lastSeen: string }[]
}

export interface FinancialEntry {
  id: string
  client_id: string
  client?: Client
  project_id?: string
  project?: { id: string; name?: string; title?: string }
  invoice_id?: string
  invoice?: Invoice
  service_name: string
  entry_date: string
  expense_amount: number
  charged_amount: number
  advance_amount: number
  balance_amount: number
  profit_amount: number
  remarks?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type CompanyExpenseCategory =
  | 'Domain'
  | 'Mailbox'
  | 'Business Meeting'
  | 'Return Filing'
  | 'CA Charges'
  | 'Food/Travel'
  | 'Software'
  | 'Office'
  | 'Salary'
  | 'Miscellaneous'

export interface CompanyExpense {
  id: string
  expense_date: string
  category: CompanyExpenseCategory | string
  description: string
  amount: number
  remarks?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface FinancialSummary {
  totalCharged: number
  totalAdvance: number
  totalBalance: number
  totalServiceExpenses: number
  totalCompanyExpenses: number
  totalExpenses: number
  grossProfit: number
  netProfit: number
  cashInHand: number
}

export interface Idea {
  id: string
  title: string
  description?: string | null
  image_url?: string | null
  created_by: string
  creator?: Profile
  created_at: string
  updated_at: string
}

export type CredentialCategory =
  | 'Database'
  | 'Email & Workspace'
  | 'Hosting & Domain'
  | 'Cloud & DevOps'
  | 'CMS & Web'
  | 'Payment & Gateway'
  | 'Repository'
  | 'Other'

export interface ClientCredential {
  id: string
  client_id: string
  client?: Client
  service_name: string
  service_category: CredentialCategory | string
  username_email: string
  encrypted_password: string
  url?: string | null
  notes?: string | null
  created_by?: string
  created_at: string
  updated_at: string
  last_accessed_at?: string | null
}

export interface CredentialAuditLog {
  id: string
  credential_id: string
  user_id?: string | null
  action: 'created' | 'revealed' | 'copied' | 'updated' | 'deleted'
  created_at: string
}

