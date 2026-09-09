import { useState, useEffect, useMemo } from 'react'
import {
  KeyRound,
  Plus,
  Search,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  Trash2,
  ShieldCheck,
  Building2,
  Layers,
  Table as TableIcon,
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { decryptCredential, logCredentialAudit } from '@/lib/crypto'
import { getServiceBadgeStyle, SERVICE_PRESETS } from '@/lib/credentialPresets'
import type { Client, ClientCredential } from '@/types'
import CredentialModal from '@/components/credentials/CredentialModal'

type ViewMode = 'grouped' | 'table'

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<ClientCredential[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & State
  const [search, setSearch] = useState('')
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all')
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grouped')
  const [collapsedClients, setCollapsedClients] = useState<Record<string, boolean>>({})

  // Security & Reveal state
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [decryptingId, setDecryptingId] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingCredential, setEditingCredential] = useState<ClientCredential | undefined>()
  const [modalDefaultClientId, setModalDefaultClientId] = useState<string | undefined>()

  const loadData = async () => {
    setLoading(true)
    const [{ data: cData }, { data: credData }] = await Promise.all([
      supabase.from('clients').select('*').order('company_name', { ascending: true }),
      supabase
        .from('client_credentials')
        .select('*, client:clients(*)')
        .order('created_at', { ascending: false }),
    ])

    setClients(cData ?? [])
    setCredentials((credData as any) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtered credentials list
  const filteredCredentials = useMemo(() => {
    return credentials.filter((cred) => {
      const q = search.toLowerCase().trim()
      const clientName = cred.client?.company_name?.toLowerCase() || ''
      const contactPerson = cred.client?.contact_person?.toLowerCase() || ''
      const serviceName = cred.service_name.toLowerCase()
      const username = cred.username_email.toLowerCase()
      const notes = (cred.notes || '').toLowerCase()

      const matchesSearch =
        !q ||
        clientName.includes(q) ||
        contactPerson.includes(q) ||
        serviceName.includes(q) ||
        username.includes(q) ||
        notes.includes(q)

      const matchesClient =
        selectedClientFilter === 'all' || cred.client_id === selectedClientFilter

      const matchesService =
        selectedServiceFilter === 'all' ||
        cred.service_name.toLowerCase() === selectedServiceFilter.toLowerCase()

      return matchesSearch && matchesClient && matchesService
    })
  }, [credentials, search, selectedClientFilter, selectedServiceFilter])

  // Group credentials by client for 'grouped' view
  const groupedByClient = useMemo(() => {
    const map = new Map<string, { client: Client; items: ClientCredential[] }>()

    filteredCredentials.forEach((cred) => {
      if (!cred.client) return
      const cId = cred.client.id
      if (!map.has(cId)) {
        map.set(cId, { client: cred.client, items: [] })
      }
      map.get(cId)!.items.push(cred)
    })

    return Array.from(map.values())
  }, [filteredCredentials])

  // Password reveal toggle
  const toggleReveal = async (cred: ClientCredential) => {
    if (revealedPasswords[cred.id]) {
      const updated = { ...revealedPasswords }
      delete updated[cred.id]
      setRevealedPasswords(updated)
      return
    }

    setDecryptingId(cred.id)
    try {
      const plaintext = await decryptCredential(cred.encrypted_password)
      setRevealedPasswords((prev) => ({ ...prev, [cred.id]: plaintext }))
      await logCredentialAudit(cred.id, 'revealed')

      // Auto-hide after 30 seconds for shoulder-surfing protection
      setTimeout(() => {
        setRevealedPasswords((prev) => {
          if (!prev[cred.id]) return prev
          const next = { ...prev }
          delete next[cred.id]
          return next
        })
      }, 30000)
    } finally {
      setDecryptingId(null)
    }
  }

  // Copy password
  const handleCopyPassword = async (cred: ClientCredential) => {
    try {
      let plaintext = revealedPasswords[cred.id]
      if (!plaintext) {
        plaintext = await decryptCredential(cred.encrypted_password)
      }
      await navigator.clipboard.writeText(plaintext)
      setCopiedId(cred.id)
      await logCredentialAudit(cred.id, 'copied')
      setTimeout(() => setCopiedId(null), 2500)
    } catch {
      console.error('Failed to copy password')
    }
  }

  // Delete credential
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential?')) return
    await supabase.from('client_credentials').delete().eq('id', id)
    await logCredentialAudit(id, 'deleted')
    loadData()
  }

  // Collapse/expand client group
  const toggleCollapseClient = (clientId: string) => {
    setCollapsedClients((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }))
  }

  // Quick stats
  const totalCredentialsCount = credentials.length
  const uniqueClientsCount = new Set(credentials.map((c) => c.client_id)).size

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Glow effect background */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-brand-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            AES-256-GCM Vault Active • Zero Plaintext Stored
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Client Credentials Vault
          </h1>
          <p className="text-brand-200 text-xs sm:text-sm max-w-xl">
            Centralized, encrypted repository for all client accounts, server credentials,
            databases, domains, and agency access logins.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => {
              setEditingCredential(undefined)
              setModalDefaultClientId(undefined)
              setShowModal(true)
            }}
            className="px-4 py-2.5 bg-white text-brand-900 hover:bg-brand-50 font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-brand-700" /> Add Credential
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Credentials</p>
            <p className="text-xl font-extrabold text-gray-900">{totalCredentialsCount}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Clients Covered</p>
            <p className="text-xl font-extrabold text-gray-900">
              {uniqueClientsCount}{' '}
              <span className="text-xs font-normal text-gray-400">/ {clients.length}</span>
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Security Standard</p>
            <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
              WebCrypto AES <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Supported Services</p>
            <p className="text-xl font-extrabold text-gray-900">
              {SERVICE_PRESETS.length}+{' '}
              <span className="text-xs font-normal text-gray-400">Presets</span>
            </p>
          </div>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by client, service, username, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Client Filter */}
            <select
              className="input py-2 text-xs w-auto cursor-pointer"
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
            >
              <option value="all">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>

            {/* Service Filter */}
            <select
              className="input py-2 text-xs w-auto cursor-pointer"
              value={selectedServiceFilter}
              onChange={(e) => setSelectedServiceFilter(e.target.value)}
            >
              <option value="all">All Services</option>
              {SERVICE_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-gray-100 rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode('grouped')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'grouped'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Grouped by Client"
              >
                <Layers className="w-3.5 h-3.5" /> Client View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" /> All Table
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={loadData}
              className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="card py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-sm font-medium">Loading encrypted credentials vault...</p>
        </div>
      ) : filteredCredentials.length === 0 ? (
        <div className="card py-16 px-4 text-center">
          <KeyRound className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-base font-bold text-gray-800">No Credentials Found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
            {search || selectedClientFilter !== 'all' || selectedServiceFilter !== 'all'
              ? 'No credentials match your active filter criteria. Try clearing filters.'
              : 'Safely store logins for Supabase, Gmail, AWS, hosting, and domains for your clients.'}
          </p>
          <button
            onClick={() => {
              setEditingCredential(undefined)
              setModalDefaultClientId(undefined)
              setShowModal(true)
            }}
            className="btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add First Credential
          </button>
        </div>
      ) : viewMode === 'grouped' ? (
        /* GROUPED BY CLIENT VIEW */
        <div className="space-y-4">
          {groupedByClient.map(({ client, items }) => {
            const isCollapsed = Boolean(collapsedClients[client.id])

            return (
              <div
                key={client.id}
                className="card overflow-hidden transition-all duration-200"
              >
                {/* Client Section Header */}
                <div
                  onClick={() => toggleCollapseClient(client.id)}
                  className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/50 hover:bg-gray-100/50 cursor-pointer border-b border-gray-100 select-none transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                      {client.company_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                          {client.company_name}
                        </h3>
                        <span className="badge bg-brand-50 text-brand-700 border border-brand-200/80 text-[10px]">
                          {items.length} {items.length === 1 ? 'Login' : 'Logins'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        Contact: {client.contact_person} {client.email && `• ${client.email}`}
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setEditingCredential(undefined)
                        setModalDefaultClientId(client.id)
                        setShowModal(true)
                      }}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 hover:border-brand-300 hover:text-brand-700"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add for Client
                    </button>
                  </div>
                </div>

                {/* Client Credentials List */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {items.map((cred) => {
                      const style = getServiceBadgeStyle(cred.service_name)
                      const isRevealed = Boolean(revealedPasswords[cred.id])
                      const isCopied = copiedId === cred.id
                      const isDecrypting = decryptingId === cred.id

                      return (
                        <div
                          key={cred.id}
                          className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                        >
                          {/* Service & Category */}
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-bold border ${style.bgColor} ${style.color} ${style.borderColor}`}
                            >
                              {cred.service_name}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                              {cred.service_category}
                            </span>
                          </div>

                          {/* Username / Email */}
                          <div className="flex-1 min-w-[200px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                              Username / Email
                            </span>
                            <span className="font-mono text-xs text-gray-800 font-medium select-all">
                              {cred.username_email}
                            </span>
                          </div>

                          {/* Password Field with Mask & Reveal */}
                          <div className="flex-1 min-w-[240px]">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Password
                              </span>
                              {isRevealed && (
                                <span className="text-[10px] text-amber-600 font-semibold animate-pulse">
                                  Auto-hides in 30s
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="font-mono text-xs text-gray-900 bg-gray-50 border border-gray-200/80 px-2.5 py-1.5 rounded-lg flex-1 select-all overflow-x-auto whitespace-nowrap">
                                {isDecrypting
                                  ? 'Decrypting...'
                                  : isRevealed
                                  ? revealedPasswords[cred.id]
                                  : '••••••••••••••••'}
                              </div>
                              <button
                                onClick={() => toggleReveal(cred)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 transition-colors"
                                title={isRevealed ? 'Hide' : 'Reveal'}
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleCopyPassword(cred)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 border border-gray-200 transition-colors"
                                title="Copy Password"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* URL & Action buttons */}
                          <div className="flex items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                            {cred.url && (
                              <a
                                href={
                                  cred.url.startsWith('http') ? cred.url : `https://${cred.url}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-transparent hover:border-brand-200"
                                title="Launch Login URL"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setEditingCredential(cred)
                                setShowModal(true)
                              }}
                              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit Credential"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(cred.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Credential"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ALL CREDENTIALS TABLE VIEW */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Service</th>
                  <th className="py-3.5 px-4">Username / Email</th>
                  <th className="py-3.5 px-4">Password</th>
                  <th className="py-3.5 px-4 text-center">Login URL</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCredentials.map((cred) => {
                  const style = getServiceBadgeStyle(cred.service_name)
                  const isRevealed = Boolean(revealedPasswords[cred.id])
                  const isCopied = copiedId === cred.id
                  const isDecrypting = decryptingId === cred.id

                  return (
                    <tr
                      key={cred.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Client */}
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-brand-50 text-brand-700 text-[10px] font-bold flex items-center justify-center">
                            {cred.client?.company_name.slice(0, 1).toUpperCase()}
                          </span>
                          <span>{cred.client?.company_name}</span>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${style.bgColor} ${style.color} ${style.borderColor}`}
                        >
                          {cred.service_name}
                        </span>
                      </td>

                      {/* Username */}
                      <td className="py-3 px-4 font-mono text-gray-800 select-all">
                        {cred.username_email}
                      </td>

                      {/* Password with Eye + Copy */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <span className="font-mono text-gray-800 bg-gray-50 border border-gray-200 px-2 py-1 rounded text-xs select-all flex-1 truncate">
                            {isDecrypting
                              ? 'Decrypting...'
                              : isRevealed
                              ? revealedPasswords[cred.id]
                              : '••••••••••••'}
                          </span>
                          <button
                            onClick={() => toggleReveal(cred)}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title={isRevealed ? 'Hide' : 'Reveal'}
                          >
                            {isRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopyPassword(cred)}
                            className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                            title="Copy Password"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* URL */}
                      <td className="py-3 px-4 text-center">
                        {cred.url ? (
                          <a
                            href={
                              cred.url.startsWith('http') ? cred.url : `https://${cred.url}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-600 hover:underline text-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Launch
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingCredential(cred)
                              setShowModal(true)
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cred.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Credential Modal */}
      {showModal && (
        <CredentialModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSaved={loadData}
          credential={editingCredential}
          defaultClientId={modalDefaultClientId}
          clients={clients}
        />
      )}
    </div>
  )
}
