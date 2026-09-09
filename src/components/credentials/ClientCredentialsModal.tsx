import { useState, useEffect } from 'react'
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  Building2,
  Loader2,
  Lock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { decryptCredential, logCredentialAudit } from '@/lib/crypto'
import { getServiceBadgeStyle } from '@/lib/credentialPresets'
import type { Client, ClientCredential } from '@/types'
import CredentialModal from './CredentialModal'

interface Props {
  isOpen: boolean
  onClose: () => void
  client: Client
  onRefreshParent?: () => void
}

export default function ClientCredentialsModal({
  isOpen,
  onClose,
  client,
  onRefreshParent,
}: Props) {
  const [credentials, setCredentials] = useState<ClientCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [revealedIds, setRevealedIds] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [decryptingId, setDecryptingId] = useState<string | null>(null)

  // Sub-modal for Add/Edit
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<ClientCredential | undefined>()

  const loadCredentials = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('client_credentials')
      .select('*')
      .eq('client_id', client.id)
      .order('service_name', { ascending: true })

    if (!error && data) {
      setCredentials(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) {
      loadCredentials()
      setRevealedIds({})
      setCopiedId(null)
    }
  }, [isOpen, client.id])

  const toggleReveal = async (cred: ClientCredential) => {
    if (revealedIds[cred.id]) {
      // Hide
      const updated = { ...revealedIds }
      delete updated[cred.id]
      setRevealedIds(updated)
      return
    }

    // Reveal
    setDecryptingId(cred.id)
    try {
      const plaintext = await decryptCredential(cred.encrypted_password)
      setRevealedIds((prev) => ({ ...prev, [cred.id]: plaintext }))
      await logCredentialAudit(cred.id, 'revealed')

      // Auto-hide after 30 seconds for shoulder-surfing safety
      setTimeout(() => {
        setRevealedIds((prev) => {
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

  const handleCopyPassword = async (cred: ClientCredential) => {
    try {
      let plaintext = revealedIds[cred.id]
      if (!plaintext) {
        plaintext = await decryptCredential(cred.encrypted_password)
      }
      await navigator.clipboard.writeText(plaintext)
      setCopiedId(cred.id)
      await logCredentialAudit(cred.id, 'copied')
      setTimeout(() => setCopiedId(null), 2500)
    } catch (err) {
      console.error('Failed to copy password')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this credential?')) return
    await supabase.from('client_credentials').delete().eq('id', id)
    await logCredentialAudit(id, 'deleted')
    loadCredentials()
    onRefreshParent?.()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-scale-in flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-brand-50/30 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900 truncate">
                    {client.company_name}
                  </h2>
                  <span className="badge bg-brand-50 text-brand-700 border border-brand-200 shrink-0">
                    🔐 Vault
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  {client.contact_person} • {credentials.length}{' '}
                  {credentials.length === 1 ? 'Credential' : 'Credentials'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedCredential(undefined)
                  setShowEditModal(true)
                }}
                className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
              >
                <Plus className="w-3.5 h-3.5" /> Add Credential
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                <p className="text-xs font-medium">Loading credentials...</p>
              </div>
            ) : credentials.length === 0 ? (
              <div className="text-center py-16 px-4 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
                <KeyRound className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <h4 className="text-sm font-semibold text-gray-700">
                  No Credentials Stored Yet
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Keep Supabase, Gmail, hosting, and API logins for {client.company_name} in this
                  secure zero-leak vault.
                </p>
                <button
                  onClick={() => {
                    setSelectedCredential(undefined)
                    setShowEditModal(true)
                  }}
                  className="btn-primary text-xs mt-4 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Login
                </button>
              </div>
            ) : (
              credentials.map((cred) => {
                const style = getServiceBadgeStyle(cred.service_name)
                const isRevealed = Boolean(revealedIds[cred.id])
                const isCopied = copiedId === cred.id
                const isDecrypting = decryptingId === cred.id

                return (
                  <div
                    key={cred.id}
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${style.bgColor} ${style.color} ${style.borderColor} tracking-wide`}
                        >
                          {cred.service_name}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium truncate">
                          {cred.service_category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {cred.url && (
                          <a
                            href={
                              cred.url.startsWith('http') ? cred.url : `https://${cred.url}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Open Login Console"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSelectedCredential(cred)
                            setShowEditModal(true)
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cred.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Username & Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50/80 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-gray-400 block mb-0.5">
                          Username / Email
                        </span>
                        <span className="font-mono text-gray-900 font-medium select-all truncate block">
                          {cred.username_email}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] uppercase font-semibold text-gray-400">
                            Password
                          </span>
                          {isRevealed && (
                            <span className="text-[9px] text-amber-600 font-semibold">
                              Auto-hides in 30s
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-gray-900 font-medium tracking-wider select-all truncate">
                            {isDecrypting
                              ? 'Decrypting...'
                              : isRevealed
                              ? revealedIds[cred.id]
                              : '••••••••••••'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => toggleReveal(cred)}
                              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded transition-colors"
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
                        </div>
                      </div>
                    </div>

                    {/* Notes if any */}
                    {cred.notes && (
                      <p className="text-[11px] text-gray-600 bg-amber-50/50 border border-amber-100/80 rounded-md p-2">
                        <span className="font-semibold text-amber-900">Note: </span>
                        {cred.notes}
                      </p>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer badge */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 shrink-0">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] font-medium text-gray-600">
                Protected with Web Crypto AES-256-GCM
              </span>
            </div>
            <button onClick={onClose} className="btn-secondary text-xs py-1 px-3">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Credential Modal */}
      {showEditModal && (
        <CredentialModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            loadCredentials()
            onRefreshParent?.()
          }}
          credential={selectedCredential}
          defaultClientId={client.id}
          clients={[client]}
        />
      )}
    </>
  )
}
