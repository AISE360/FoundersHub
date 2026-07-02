import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Users, X } from 'lucide-react'
import type { Client } from '@/types'

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
              <p className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">{client.notes}</p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No clients yet</p>
          </div>
        )}
      </div>

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
    </div>
  )
}
