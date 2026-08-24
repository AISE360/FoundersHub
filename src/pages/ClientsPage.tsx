import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Users, X, Send, Mail, CheckCircle, Loader2 } from 'lucide-react'
import type { Client } from '@/types'

type FollowUpItem = {
  id: string
  title: string
  description?: string
  due_date: string
  is_done: boolean
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
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

  const load = async () => {
    const { data } = await supabase.from('clients').select('*').order('company_name')
    setClients(data ?? [])
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
    const clientProjects = (projects ?? []).filter((p: any) =>
      p.title.toLowerCase().includes(client.company_name.toLowerCase())
    )
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
            <button
              onClick={() => openNotice(client)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              <Mail className="w-4 h-4" />
              Send Renewal Notice
            </button>
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
    </div>
  )
}
