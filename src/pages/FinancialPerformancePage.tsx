import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Building2,
  Plus,
  Search,
  Download,
  Upload,
  HelpCircle,
  Briefcase,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react'
import type { Client, FinancialEntry, CompanyExpense, Invoice } from '@/types'
import FinancialEntryModal from '@/components/finance/FinancialEntryModal'
import CompanyExpenseModal from '@/components/finance/CompanyExpenseModal'
import ExcelImportModal from '@/components/finance/ExcelImportModal'

type QuickDateRange = 'all' | 'today' | 'week' | 'month' | 'last_month' | 'year'

export default function FinancialPerformancePage() {
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [companyExpenses, setCompanyExpenses] = useState<CompanyExpense[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  // Active Tab: 'services' (Financial Entries) or 'company' (Company Expenses)
  const [activeTab, setActiveTab] = useState<'services' | 'company'>('services')

  // Modals state
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | undefined>()
  const [companyModalOpen, setCompanyModalOpen] = useState(false)
  const [selectedCompanyExpense, setSelectedCompanyExpense] = useState<CompanyExpense | undefined>()
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [quickDate, setQuickDate] = useState<QuickDateRange>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'cleared' | 'partial' | 'unpaid'>('all')

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'charged' | 'balance' | 'profit'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Load all initial data
  const loadData = async () => {
    try {
      const [
        { data: entData },
        { data: compData },
        { data: cliData },
        { data: projData },
        { data: invData },
      ] = await Promise.all([
        supabase
          .from('financial_entries')
          .select('*, client:clients(id, company_name, contact_person), project:projects(id, name, title)')
          .order('entry_date', { ascending: false }),
        supabase
          .from('company_expenses')
          .select('*')
          .order('expense_date', { ascending: false }),
        supabase.from('clients').select('*').order('company_name'),
        supabase.from('projects').select('id, name, title, client_id'),
        supabase.from('invoices').select('*'),
      ])

      setEntries((entData as any) ?? [])
      setCompanyExpenses(compData ?? [])
      setClients(cliData ?? [])
      setProjects(projData ?? [])
      setInvoices(invData ?? [])
    } catch (err) {
      console.error('Failed to load financial performance data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Quick date calculations
  const getDateRange = (preset: QuickDateRange) => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    if (preset === 'today') {
      return { from: todayStr, to: todayStr }
    }
    if (preset === 'week') {
      const day = now.getDay() || 7
      const mon = new Date(now)
      mon.setDate(now.getDate() - day + 1)
      return { from: mon.toISOString().split('T')[0], to: todayStr }
    }
    if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: firstDay.toISOString().split('T')[0], to: todayStr }
    }
    if (preset === 'last_month') {
      const firstPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastPrev = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        from: firstPrev.toISOString().split('T')[0],
        to: lastPrev.toISOString().split('T')[0],
      }
    }
    if (preset === 'year') {
      const firstOfYear = new Date(now.getFullYear(), 0, 1)
      return { from: firstOfYear.toISOString().split('T')[0], to: todayStr }
    }
    return { from: '', to: '' }
  }

  // Handle Quick Date click
  const handleQuickDateChange = (preset: QuickDateRange) => {
    setQuickDate(preset)
    const { from, to } = getDateRange(preset)
    setDateFrom(from)
    setDateTo(to)
  }

  // Filtered Financial Entries
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      // Search: client, service, project, remarks
      const clientName = e.client?.company_name?.toLowerCase() || ''
      const projName = ((e.project as any)?.title || e.project?.name || '').toLowerCase()
      const srvName = e.service_name.toLowerCase()
      const rem = (e.remarks || '').toLowerCase()
      const searchMatch =
        !search ||
        clientName.includes(search.toLowerCase()) ||
        projName.includes(search.toLowerCase()) ||
        srvName.includes(search.toLowerCase()) ||
        rem.includes(search.toLowerCase())

      // Date Range
      const entryD = e.entry_date
      const dateMatch =
        (!dateFrom || entryD >= dateFrom) && (!dateTo || entryD <= dateTo)

      // Client Filter
      const clientMatch = clientFilter === 'all' || e.client_id === clientFilter

      // Service Filter
      const serviceMatch = serviceFilter === 'all' || e.service_name === serviceFilter

      // Payment Status Filter
      const balance = Number(e.balance_amount ?? (e.charged_amount - e.advance_amount))
      const advance = Number(e.advance_amount ?? 0)
      let statusMatch = true
      if (paymentStatus === 'cleared') statusMatch = balance === 0
      if (paymentStatus === 'partial') statusMatch = balance > 0 && advance > 0
      if (paymentStatus === 'unpaid') statusMatch = advance === 0

      return searchMatch && dateMatch && clientMatch && serviceMatch && statusMatch
    })
  }, [entries, search, dateFrom, dateTo, clientFilter, serviceFilter, paymentStatus])

  // Sorted Entries
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      let valA: any = a.entry_date
      let valB: any = b.entry_date

      if (sortBy === 'client') {
        valA = a.client?.company_name || ''
        valB = b.client?.company_name || ''
      } else if (sortBy === 'charged') {
        valA = a.charged_amount
        valB = b.charged_amount
      } else if (sortBy === 'balance') {
        valA = a.balance_amount ?? (a.charged_amount - a.advance_amount)
        valB = b.balance_amount ?? (b.charged_amount - b.advance_amount)
      } else if (sortBy === 'profit') {
        valA = a.profit_amount ?? (a.charged_amount - a.expense_amount)
        valB = b.profit_amount ?? (b.charged_amount - b.expense_amount)
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredEntries, sortBy, sortOrder])

  // Filtered Company Expenses (respecting date range and search)
  const filteredCompanyExpenses = useMemo(() => {
    return companyExpenses.filter(ce => {
      const searchMatch =
        !search ||
        ce.description.toLowerCase().includes(search.toLowerCase()) ||
        ce.category.toLowerCase().includes(search.toLowerCase()) ||
        (ce.remarks && ce.remarks.toLowerCase().includes(search.toLowerCase()))

      const dateMatch =
        (!dateFrom || ce.expense_date >= dateFrom) &&
        (!dateTo || ce.expense_date <= dateTo)

      return searchMatch && dateMatch
    })
  }, [companyExpenses, search, dateFrom, dateTo])

  // Calculations for KPI Summary Cards (Respecting filtered dataset)
  const totalCharged = filteredEntries.reduce((s, e) => s + Number(e.charged_amount), 0)
  const totalAdvance = filteredEntries.reduce((s, e) => s + Number(e.advance_amount), 0)
  const totalBalance = filteredEntries.reduce(
    (s, e) => s + Number(e.balance_amount ?? Math.max(0, e.charged_amount - e.advance_amount)),
    0
  )
  const totalServiceExpenses = filteredEntries.reduce((s, e) => s + Number(e.expense_amount), 0)
  const totalCompanyExp = filteredCompanyExpenses.reduce((s, ce) => s + Number(ce.amount), 0)
  const totalExpenses = totalServiceExpenses + totalCompanyExp
  const grossProfit = totalCharged - totalServiceExpenses
  const netProfit = grossProfit - totalCompanyExp
  const cashInHand = totalAdvance - totalExpenses

  // Unique service names for filter
  const uniqueServices = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.service_name))).filter(Boolean)
  }, [entries])

  // Delete Financial Entry
  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this financial entry?')) return
    const { error } = await supabase.from('financial_entries').delete().eq('id', id)
    if (!error) {
      setEntries(prev => prev.filter(e => e.id !== id))
    }
  }

  // Delete Company Expense
  const handleDeleteCompanyExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company expense?')) return
    const { error } = await supabase.from('company_expenses').delete().eq('id', id)
    if (!error) {
      setCompanyExpenses(prev => prev.filter(ce => ce.id !== id))
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (activeTab === 'services') {
      const headers = [
        'Date',
        'Client',
        'Project',
        'Service',
        'Expense',
        'Charged',
        'Advance',
        'Balance',
        'Profit',
        'Remarks',
      ]
      const rows = sortedEntries.map(e => [
        e.entry_date,
        `"${e.client?.company_name || ''}"`,
        `"${(e.project as any)?.title || e.project?.name || ''}"`,
        `"${e.service_name}"`,
        e.expense_amount,
        e.charged_amount,
        e.advance_amount,
        e.balance_amount ?? (e.charged_amount - e.advance_amount),
        e.profit_amount ?? (e.charged_amount - e.expense_amount),
        `"${e.remarks || ''}"`,
      ])

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `financial-performance-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      const headers = ['Date', 'Category', 'Description', 'Amount', 'Remarks']
      const rows = filteredCompanyExpenses.map(ce => [
        ce.expense_date,
        `"${ce.category}"`,
        `"${ce.description}"`,
        ce.amount,
        `"${ce.remarks || ''}"`,
      ])

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `company-expenses-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Financial Performance
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Automated service line-item P&L, real-time balances, overhead tracking & cash position
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setImportModalOpen(true)}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Import Excel or CSV records"
          >
            <Upload className="w-3.5 h-3.5" /> Import Excel/CSV
          </button>
          <button
            onClick={handleExportCSV}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => {
              setSelectedCompanyExpense(undefined)
              setCompanyModalOpen(true)
            }}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-red-500" /> Add Company Expense
          </button>
          <button
            onClick={() => {
              setSelectedEntry(undefined)
              setEntryModalOpen(true)
            }}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Financial Entry
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────── */}
      {/* 8 TOP KPI SUMMARY CARDS */}
      {/* ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Charged */}
        <div className="card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium">Total Charged</span>
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalCharged)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Billed service value</p>
        </div>

        {/* 2. Total Advance Received */}
        <div className="card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium">Advance Received</span>
            <div className="w-7 h-7 rounded-md bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalAdvance)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Actual cash collected</p>
        </div>

        {/* 3. Total Balance / Pending */}
        <div className="card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium">Total Pending</span>
            <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(totalBalance)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Uncollected receivables</p>
        </div>

        {/* 4. Total Service Expenses */}
        <div className="card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium">Service Expenses</span>
            <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-rose-600">{formatCurrency(totalServiceExpenses)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Direct project delivery costs</p>
        </div>

        {/* 5. Total Company Expenses */}
        <div className="card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium">Company Expenses</span>
            <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-purple-600">{formatCurrency(totalCompanyExp)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">General business overhead</p>
        </div>

        {/* 6. Total Expenses (Service + Company) */}
        <div className="card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium">Total Outflows</span>
            <div className="w-7 h-7 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Service + Company costs</p>
        </div>

        {/* 7. Net Business Profit */}
        <div className="card p-4 hover:shadow-sm transition-shadow bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-700 font-semibold">Net Profit</span>
              <span
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Net Profit = Total Charged (₹) - Total Outflows (Service + Company Expenses)"
              >
                <HelpCircle className="w-3 h-3" />
              </span>
            </div>
            <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(netProfit)}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Gross: {formatCurrency(grossProfit)}
          </p>
        </div>

        {/* 8. Total Cash In-Hand */}
        <div className="card p-4 hover:shadow-sm transition-shadow bg-gradient-to-br from-white to-brand-50/40">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-700 font-semibold">Cash In-Hand</span>
              <span
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Cash In-Hand = Advance Collected (₹) - Total Expenses Paid Out (₹)"
              >
                <HelpCircle className="w-3 h-3" />
              </span>
            </div>
            <div className="w-7 h-7 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-xl font-bold ${cashInHand >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
            {formatCurrency(cashInHand)}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Advance − Total Outflows
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────── */}
      {/* TABS: Financial Entries vs Company Expenses */}
      {/* ───────────────────────────────────────── */}
      <div className="border-b border-gray-200 flex items-center justify-between">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('services')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'services'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Service Financial Entries</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-medium">
              {filteredEntries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('company')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'company'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Company Expenses</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-medium">
              {filteredCompanyExpenses.length}
            </span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────── */}
      {/* FILTER & SEARCH TOOLBAR */}
      {/* ───────────────────────────────────────── */}
      <div className="card p-4 space-y-3">
        {/* Row 1: Search & Quick Date Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input pl-9 text-xs"
              placeholder="Search by client, service, project, remarks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Date:
            </span>
            {(['all', 'today', 'week', 'month', 'last_month', 'year'] as QuickDateRange[]).map(
              preset => (
                <button
                  key={preset}
                  onClick={() => handleQuickDateChange(preset)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    quickDate === preset
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {preset === 'all'
                    ? 'All Time'
                    : preset === 'today'
                    ? 'Today'
                    : preset === 'week'
                    ? 'This Week'
                    : preset === 'month'
                    ? 'This Month'
                    : preset === 'last_month'
                    ? 'Last Month'
                    : 'This Year'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Row 2: Granular Filters (Dropdowns & Custom Dates) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-gray-100">
          <div>
            <label className="text-[11px] text-gray-400 block mb-0.5">Date From</label>
            <input
              type="date"
              className="input text-xs py-1 px-2"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value)
                setQuickDate('all')
              }}
            />
          </div>

          <div>
            <label className="text-[11px] text-gray-400 block mb-0.5">Date To</label>
            <input
              type="date"
              className="input text-xs py-1 px-2"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value)
                setQuickDate('all')
              }}
            />
          </div>

          {activeTab === 'services' && (
            <>
              <div>
                <label className="text-[11px] text-gray-400 block mb-0.5">Filter by Client</label>
                <select
                  className="input text-xs py-1 px-2"
                  value={clientFilter}
                  onChange={e => setClientFilter(e.target.value)}
                >
                  <option value="all">All Clients</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-0.5">Filter by Service</label>
                <select
                  className="input text-xs py-1 px-2"
                  value={serviceFilter}
                  onChange={e => setServiceFilter(e.target.value)}
                >
                  <option value="all">All Services</option>
                  {uniqueServices.map(srv => (
                    <option key={srv} value={srv}>
                      {srv}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-0.5">Payment Status</label>
                <select
                  className="input text-xs py-1 px-2"
                  value={paymentStatus}
                  onChange={e => setPaymentStatus(e.target.value as any)}
                >
                  <option value="all">All Statuses</option>
                  <option value="cleared">Paid (Balance ₹0)</option>
                  <option value="partial">Partial Payment</option>
                  <option value="unpaid">Unpaid (Advance ₹0)</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────── */}
      {/* MAIN TAB CONTENT: FINANCIAL ENTRIES TABLE */}
      {/* ───────────────────────────────────────── */}
      {activeTab === 'services' ? (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">
              Service Financial Performance Records ({sortedEntries.length})
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Sort by:</span>
              <select
                className="input py-0.5 px-2 text-xs w-auto"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
              >
                <option value="date">Date</option>
                <option value="client">Client</option>
                <option value="charged">Charged</option>
                <option value="balance">Balance</option>
                <option value="profit">Profit</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 font-mono font-bold"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-3.5 py-3 text-center w-12">#</th>
                  <th className="px-3.5 py-3">Date</th>
                  <th className="px-3.5 py-3">Client</th>
                  <th className="px-3.5 py-3">Project</th>
                  <th className="px-3.5 py-3">Service</th>
                  <th className="px-3.5 py-3 text-right">Expense</th>
                  <th className="px-3.5 py-3 text-right">Charged</th>
                  <th className="px-3.5 py-3 text-right">Advance</th>
                  <th className="px-3.5 py-3 text-right">Balance</th>
                  <th className="px-3.5 py-3 text-right">Profit</th>
                  <th className="px-3.5 py-3">Remarks</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet className="w-8 h-8 text-gray-300" />
                        <p className="text-sm font-medium">No financial entries match your filters.</p>
                        <button
                          onClick={() => {
                            setSelectedEntry(undefined)
                            setEntryModalOpen(true)
                          }}
                          className="btn-primary text-xs mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add First Entry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedEntries.map((entry, index) => {
                    const balance = Number(entry.balance_amount ?? Math.max(0, entry.charged_amount - entry.advance_amount))
                    const profit = Number(entry.profit_amount ?? (entry.charged_amount - entry.expense_amount))
                    const isFullyPaid = balance === 0

                    return (
                      <tr key={entry.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-3.5 py-3 text-center text-gray-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-gray-600">
                          {formatDate(entry.entry_date)}
                        </td>
                        <td className="px-3.5 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {entry.client?.company_name || '—'}
                        </td>
                        <td className="px-3.5 py-3 text-gray-500 whitespace-nowrap">
                          {(entry.project as any)?.title || entry.project?.name || (
                            <span className="text-gray-300 italic">General</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="badge bg-gray-100 text-gray-700 font-medium">
                            {entry.service_name}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right text-rose-600 font-mono font-medium whitespace-nowrap">
                          {formatCurrency(entry.expense_amount)}
                        </td>
                        <td className="px-3.5 py-3 text-right text-gray-900 font-mono font-semibold whitespace-nowrap">
                          {formatCurrency(entry.charged_amount)}
                        </td>
                        <td className="px-3.5 py-3 text-right text-green-600 font-mono font-medium whitespace-nowrap">
                          {formatCurrency(entry.advance_amount)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-semibold whitespace-nowrap">
                          <span
                            className={`badge text-[11px] ${
                              isFullyPaid
                                ? 'bg-green-50 text-green-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {formatCurrency(balance)}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold whitespace-nowrap">
                          <span className={profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {formatCurrency(profit)}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-gray-500 max-w-xs truncate" title={entry.remarks || ''}>
                          {entry.remarks || '—'}
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedEntry(entry)
                                setEntryModalOpen(true)
                              }}
                              className="p-1 rounded text-gray-400 hover:text-brand-600 hover:bg-gray-100"
                              title="Edit Entry"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-gray-100"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {/* Table Footer Totals */}
              {sortedEntries.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-gray-900">
                  <tr>
                    <td colSpan={5} className="px-3.5 py-3 text-right uppercase tracking-wider text-xs">
                      Filtered Totals:
                    </td>
                    <td className="px-3.5 py-3 text-right text-rose-600 font-mono">
                      {formatCurrency(totalServiceExpenses)}
                    </td>
                    <td className="px-3.5 py-3 text-right text-gray-900 font-mono">
                      {formatCurrency(totalCharged)}
                    </td>
                    <td className="px-3.5 py-3 text-right text-green-600 font-mono">
                      {formatCurrency(totalAdvance)}
                    </td>
                    <td className="px-3.5 py-3 text-right text-amber-600 font-mono">
                      {formatCurrency(totalBalance)}
                    </td>
                    <td
                      className={`px-3.5 py-3 text-right font-mono ${
                        grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(grossProfit)}
                    </td>
                    <td colSpan={2} className="px-3.5 py-3 text-gray-400 font-normal text-[11px]">
                      Gross Service Profit
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        /* ───────────────────────────────────────── */
        /* TAB CONTENT: COMPANY EXPENSES TABLE */
        /* ───────────────────────────────────────── */
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">
                Company Operational Expenses & Overheads ({filteredCompanyExpenses.length})
              </h2>
              <p className="text-xs text-gray-500">
                General business expenses (Domain, Mailbox, Meeting, Return Filing, CA Charges, etc.)
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 font-medium">Total Company Expenses: </span>
              <span className="text-sm font-bold text-purple-700 font-mono">
                {formatCurrency(totalCompanyExp)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCompanyExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="w-8 h-8 text-gray-300" />
                        <p className="text-sm font-medium">No company expenses recorded yet.</p>
                        <button
                          onClick={() => {
                            setSelectedCompanyExpense(undefined)
                            setCompanyModalOpen(true)
                          }}
                          className="btn-primary text-xs mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Company Expense
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCompanyExpenses.map((ce, index) => (
                    <tr key={ce.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 text-center text-gray-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {formatDate(ce.expense_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="badge bg-purple-50 text-purple-700 font-medium">
                          {ce.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{ce.description}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-purple-700 whitespace-nowrap">
                        {formatCurrency(ce.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={ce.remarks || ''}>
                        {ce.remarks || '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedCompanyExpense(ce)
                              setCompanyModalOpen(true)
                            }}
                            className="p-1 rounded text-gray-400 hover:text-brand-600 hover:bg-gray-100"
                            title="Edit Expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompanyExpense(ce.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-gray-100"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────── */}
      {/* MODALS */}
      {/* ───────────────────────────────────────── */}
      {entryModalOpen && (
        <FinancialEntryModal
          clients={clients}
          projects={projects}
          invoices={invoices}
          entry={selectedEntry}
          onClose={() => setEntryModalOpen(false)}
          onSaved={() => {
            setEntryModalOpen(false)
            loadData()
          }}
        />
      )}

      {companyModalOpen && (
        <CompanyExpenseModal
          expense={selectedCompanyExpense}
          onClose={() => setCompanyModalOpen(false)}
          onSaved={() => {
            setCompanyModalOpen(false)
            loadData()
          }}
        />
      )}

      {importModalOpen && (
        <ExcelImportModal
          clients={clients}
          onClose={() => setImportModalOpen(false)}
          onImportComplete={() => {
            setImportModalOpen(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
