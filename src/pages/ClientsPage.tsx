import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus, Search, Users, X, Send, Mail, CheckCircle, Loader2,
  TrendingUp, DollarSign, ArrowUpRight, Calculator, KeyRound
} from 'lucide-react'
import type { Client, FinancialEntry } from '@/types'
import ClientCredentialsModal from '@/components/credentials/ClientCredentialsModal'

type FollowUpItem = {
  id: string
  title: string
  description?: string
  due_date: string
  is_done: boolean
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([])
  const [selectedClientFinancials, setSelectedClientFinancials] = useState<Client | null>(null)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editClient, setEditClient] = useState<Client | undefined>()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    company_name: '', contact_person: '', phone: '', email: '', gst_number: '', address: '', notes: ''
  })
  const [saving, setSaving] = useState(false)

  // Renewal notice state
  const [noticeClient, setNoticeClient] = useState<Client | null>(null)
  const [noticeItems, setNoticeItems] = useState<FollowUpItem[]>([])
  const [noticeLoading, setNoticeLoading] = useState(false)
  const [noticeSending, setNoticeSending] = useState(false)
  const [noticeSent, setNoticeSent] = useState(false)

  // Credentials vault state
  const [selectedClientCredentials, setSelectedClientCredentials] = useState<Client | null>(null)
  const [credCountByClient, setCredCountByClient] = useState<Record<string, number>>({})

  const load = async () => {
    const [{ data: cData }, { data: fData }, { data: credData }] = await Promise.all([
      supabase.from('clients').select('*').order('company_name'),
      supabase.from('financial_entries').select('*').order('entry_date', { ascending: false }),
      supabase.from('client_credentials').select('id, client_id'),
    ])
    setClients(cData ?? [])
    setFinancialEntries((fData as any) ?? [])

    const counts: Record<string, number> = {}
    ;(credData ?? []).forEach((c: any) => {
      counts[c.client_id] = (counts[c.client_id] || 0) + 1
    })
    setCredCountByClient(counts)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openModal = (client?: Client) => {
    setEditClient(client)
    setForm(client ? {
      company_name: client.company_name,
      contact_person: client.contact_person,
      phone: client.phone,
      email: client.email,
      gst_number: client.gst_number ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
    } : { company_name: '', contact_person: '', phone: '', email: '', gst_number: '', address: '', notes: '' })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (editClient) {
      await supabase.from('clients').update(form).eq('id', editClient.id)
    } else {
      await supabase.from('clients').insert(form)
    }
    setShowModal(false)
    load()
    setSaving(false)
  }

  const deleteClient = async (id: string) => {
    if (!confirm('Delete this client?')) return
    await supabase.from('clients').delete().eq('id', id)
    load()
  }

  // Renewal Notice handlers
  const openNotice = async (client: Client) => {
    setNoticeClient(client)
    setNoticeSent(false)
    setNoticeLoading(true)

    const { data: projects } = await supabase.from('projects').select('id, title')
    const cName = client.company_name.toLowerCase()
    const clientProjects = (projects ?? []).filter((p: any) => {
      const pTitle = (p.title ?? '').toLowerCase()
      const prefix = pTitle.split('–')[0]?.trim() || ''
      return pTitle.includes(cName) || cName.includes(prefix) || prefix.includes(cName)
    })
    const projectIds = clientProjects.map((p: any) => p.id)

    let items: FollowUpItem[] = []
    if (projectIds.length > 0) {
      const { data } = await supabase
        .from('follow_ups')
        .select('id, title, description, due_date, is_done')
        .in('project_id', projectIds)
        .eq('is_done', false)
        .order('due_date', { ascending: true })
      items = data ?? []
    }

    setNoticeItems(items)
    setNoticeLoading(false)
  }

  const sendNotice = async () => {
    if (!noticeClient || noticeItems.length === 0) return
    setNoticeSending(true)
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-client-notice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          client_name: noticeClient.company_name,
          client_email: noticeClient.email,
          items: noticeItems.map(i => ({ title: i.title, due_date: i.due_date, description: i.description })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')
      setNoticeSent(true)
    } catch (err) {
      alert(`Error sending: ${err}`)
    }
    setNoticeSending(false)
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const daysUntil = (d: string) => {
    const today = new Date(); today.setHours(0,0,0,0)
    const t = new Date(d); t.setHours(0,0,0,0)
    return Math.round((t.getTime() - today.getTime()) / 86400000)
  }

  const filtered = clients.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(client => (
          <div key={client.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm">
                  {client.company_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{client.company_name}</h3>
                  <p className="text-sm text-gray-500">{client.contact_person}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openModal(client)} className="text-xs text-brand-600 hover:underline">Edit</button>
                <button onClick={() => deleteClient(client.id)} className="text-xs text-red-500 hover:underline">Del</button>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p>📞 {client.phone}</p>
              <p>✉️ {client.email}</p>
              {client.gst_number && <p>🏷️ GST: {client.gst_number}</p>}
              {client.address && <p className="text-xs text-gray-500 mt-1">{client.address}</p>}
            </div>
            {client.notes && (
              <p className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg line-clamp-2">{client.notes}</p>
            )}

            {/* Financial Performance Summary */}
            {(() => {
              const cEntries = financialEntries.filter(fe => fe.client_id === client.id)
              const cCharged = cEntries.reduce((s, e) => s + Number(e.charged_amount), 0)
              const cAdvance = cEntries.reduce((s, e) => s + Number(e.advance_amount), 0)
              const cPending = Math.max(0, cCharged - cAdvance)
              const cExpenses = cEntries.reduce((s, e) => s + Number(e.expense_amount), 0)
              const cProfit = cCharged - cExpenses

              return (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-brand-600" /> Financials
                    </span>
                    <button
                      onClick={() => setSelectedClientFinancials(client)}
                      className="text-[11px] font-medium text-brand-600 hover:text-brand-800 hover:underline flex items-center gap-0.5"
                    >
                      {cEntries.length > 0 ? `${cEntries.length} entries` : 'Breakdown'}
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center bg-gray-50 p-2 rounded-lg text-xs">
                    <div>
                      <p className="text-[10px] text-gray-400">Charged</p>
                      <p className="font-semibold text-gray-800 font-mono">{formatCurrency(cCharged)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Advance</p>
                      <p className="font-semibold text-green-600 font-mono">{formatCurrency(cAdvance)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Pending</p>
                      <p className={`font-semibold font-mono ${cPending > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {formatCurrency(cPending)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => setSelectedClientCredentials(client)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-brand-200 bg-brand-50/80 text-brand-700 hover:bg-brand-100 transition-colors text-xs font-semibold"
                title={`View ${credCountByClient[client.id] || 0} credentials for ${client.company_name}`}
              >
                <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                Vault ({credCountByClient[client.id] || 0})
              </button>
              <button
                onClick={() => openNotice(client)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-semibold"
              >
                <Mail className="w-3.5 h-3.5" />
                Notice
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No clients yet</p>
          </div>
        )}
      </div>

      {/* Add/Edit Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="font-semibold">{editClient ? 'Edit Client' : 'New Client'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Company Name *</label>
                <input className="input" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Contact Person *</label>
                <input className="input" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone *</label>
                  <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">GST Number</label>
                <input className="input" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} />
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editClient ? 'Update' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Renewal Notice Modal */}
      {noticeClient && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <div>
                <h2 className="font-semibold text-gray-900">Send Renewal Notice</h2>
                <p className="text-xs text-gray-500 mt-0.5">To: <span className="font-medium text-blue-600">{noticeClient.email}</span></p>
              </div>
              <button onClick={() => { setNoticeClient(null); setNoticeSent(false) }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5">
              {noticeSent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg">Email Sent!</h3>
                  <p className="text-gray-500 text-sm mt-1">Renewal notice delivered to <strong>{noticeClient.email}</strong></p>
                  <button onClick={() => { setNoticeClient(null); setNoticeSent(false) }} className="mt-6 btn-primary">Done</button>
                </div>
              ) : noticeLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                  <span className="ml-2 text-gray-500 text-sm">Loading services...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg mb-5">
                    <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold text-sm">
                      {noticeClient.company_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{noticeClient.company_name}</p>
                      <p className="text-xs text-gray-500">{noticeClient.email}</p>
                    </div>
                  </div>

                  {noticeItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No active renewal reminders for this client.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 mb-3">
                        <strong>{noticeItems.length}</strong> item{noticeItems.length > 1 ? 's' : ''} will be included:
                      </p>
                      <div className="space-y-2 mb-5 max-h-60 overflow-y-auto pr-1">
                        {noticeItems.map(item => {
                          const days = daysUntil(item.due_date)
                          const color = days < 0 ? 'text-red-600 bg-red-50 border-red-100'
                            : days <= 14 ? 'text-orange-600 bg-orange-50 border-orange-100'
                            : 'text-yellow-700 bg-yellow-50 border-yellow-100'
                          const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'TODAY' : `${days}d left`
                          return (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                              <div className="flex-1 min-w-0 mr-3">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {item.title.replace(/^[^–\-]+[–\-]\s*/, '')}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">{formatDate(item.due_date)}</p>
                              </div>
                              <span className={`text-xs font-bold px-2 py-1 rounded-full border shrink-0 ${color}`}>{label}</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 mb-5 leading-relaxed">
                        📧 Client gets a professional AISE 360 branded email with all items, expiry dates, and a <strong>Contact Us to Renew</strong> button linking back to your Gmail.
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setNoticeClient(null) }} className="btn-secondary flex-1">Cancel</button>
                        <button
                          onClick={sendNotice}
                          disabled={noticeSending}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
                        >
                          {noticeSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send to {noticeClient.company_name}</>}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Financial Performance Breakdown Modal */}
      {selectedClientFinancials && (() => {
        const clientEntries = financialEntries.filter(fe => fe.client_id === selectedClientFinancials.id)
        const totalCharged = clientEntries.reduce((s, e) => s + Number(e.charged_amount), 0)
        const totalAdvance = clientEntries.reduce((s, e) => s + Number(e.advance_amount), 0)
        const totalPending = Math.max(0, totalCharged - totalAdvance)
        const totalExpenses = clientEntries.reduce((s, e) => s + Number(e.expense_amount), 0)
        const totalProfit = totalCharged - totalExpenses

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedClientFinancials.company_name} — Financial Performance
                    </h2>
                    <p className="text-xs text-gray-500">Service line-items & P&L breakdown</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClientFinancials(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* 5 KPI Stat Cards for Client */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-gray-500 uppercase">Charged</p>
                    <p className="text-sm font-bold text-gray-900 font-mono">{formatCurrency(totalCharged)}</p>
                  </div>
                  <div className="bg-green-50/60 p-2.5 rounded-lg border border-green-100">
                    <p className="text-[10px] text-green-700 uppercase">Advance</p>
                    <p className="text-sm font-bold text-green-700 font-mono">{formatCurrency(totalAdvance)}</p>
                  </div>
                  <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-100">
                    <p className="text-[10px] text-amber-700 uppercase">Pending</p>
                    <p className="text-sm font-bold text-amber-700 font-mono">{formatCurrency(totalPending)}</p>
                  </div>
                  <div className="bg-rose-50/60 p-2.5 rounded-lg border border-rose-100">
                    <p className="text-[10px] text-rose-700 uppercase">Expenses</p>
                    <p className="text-sm font-bold text-rose-700 font-mono">{formatCurrency(totalExpenses)}</p>
                  </div>
                  <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100 col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-emerald-700 uppercase">Profit</p>
                    <p className="text-sm font-bold text-emerald-700 font-mono">{formatCurrency(totalProfit)}</p>
                  </div>
                </div>

                {/* Table of Entries */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Service</th>
                        <th className="px-3 py-2 text-right">Expense</th>
                        <th className="px-3 py-2 text-right">Charged</th>
                        <th className="px-3 py-2 text-right">Advance</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                        <th className="px-3 py-2 text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clientEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-gray-400">
                            No service financial entries found for this client.
                          </td>
                        </tr>
                      ) : (
                        clientEntries.map(e => {
                          const bal = Math.max(0, Number(e.charged_amount) - Number(e.advance_amount))
                          const prof = Number(e.charged_amount) - Number(e.expense_amount)
                          return (
                            <tr key={e.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-500">{formatDate(e.entry_date)}</td>
                              <td className="px-3 py-2 font-medium text-gray-900">{e.service_name}</td>
                              <td className="px-3 py-2 text-right text-rose-600 font-mono">{formatCurrency(e.expense_amount)}</td>
                              <td className="px-3 py-2 text-right text-gray-900 font-mono font-semibold">{formatCurrency(e.charged_amount)}</td>
                              <td className="px-3 py-2 text-right text-green-600 font-mono">{formatCurrency(e.advance_amount)}</td>
                              <td className="px-3 py-2 text-right text-amber-600 font-mono">{formatCurrency(bal)}</td>
                              <td className={`px-3 py-2 text-right font-mono font-semibold ${prof >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(prof)}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <a
                  href="/financial-performance"
                  className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
                >
                  Open in Financial Performance →
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedClientFinancials(null)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Client Credentials Vault Modal */}
      {selectedClientCredentials && (
        <ClientCredentialsModal
          isOpen={Boolean(selectedClientCredentials)}
          onClose={() => setSelectedClientCredentials(null)}
          client={selectedClientCredentials}
          onRefreshParent={load}
        />
      )}
    </div>
  )
}

