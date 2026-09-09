import { useState, useEffect } from 'react'
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  encryptCredential,
  decryptCredential,
  generateStrongPassword,
  logCredentialAudit,
} from '@/lib/crypto'
import { SERVICE_PRESETS, ServicePreset } from '@/lib/credentialPresets'
import type { Client, ClientCredential } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  credential?: ClientCredential
  defaultClientId?: string
  clients: Client[]
}

export default function CredentialModal({
  isOpen,
  onClose,
  onSaved,
  credential,
  defaultClientId,
  clients,
}: Props) {
  const [clientId, setClientId] = useState('')
  const [selectedServicePreset, setSelectedServicePreset] = useState('Supabase')
  const [customServiceName, setCustomServiceName] = useState('')
  const [serviceCategory, setServiceCategory] = useState('Database')
  const [usernameEmail, setUsernameEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedGenerated, setCopiedGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setError(null)
    setShowPassword(false)

    if (credential) {
      setClientId(credential.client_id)
      setUsernameEmail(credential.username_email)
      setUrl(credential.url || '')
      setNotes(credential.notes || '')
      setServiceCategory(credential.service_category || 'Other')

      // Check if service name matches any preset
      const matched = SERVICE_PRESETS.find(
        (p) => p.name.toLowerCase() === credential.service_name.toLowerCase()
      )
      if (matched && matched.name !== 'Other') {
        setSelectedServicePreset(matched.name)
        setCustomServiceName('')
      } else {
        setSelectedServicePreset('Other')
        setCustomServiceName(credential.service_name)
      }

      // Decrypt password into form state for editing
      setLoading(true)
      decryptCredential(credential.encrypted_password)
        .then((decrypted) => {
          setPassword(decrypted)
        })
        .catch(() => {
          setPassword('')
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      // New credential
      setClientId(defaultClientId || (clients[0]?.id ?? ''))
      setSelectedServicePreset('Supabase')
      setCustomServiceName('')
      setServiceCategory('Database')
      setUsernameEmail('')
      setPassword('')
      setUrl('https://supabase.com/dashboard')
      setNotes('')
      setLoading(false)
    }
  }, [isOpen, credential, defaultClientId, clients])

  const handleServiceChange = (serviceName: string) => {
    setSelectedServicePreset(serviceName)
    const preset = SERVICE_PRESETS.find((p) => p.name === serviceName)

    if (preset) {
      setServiceCategory(preset.category)
      if (preset.defaultUrl && (!url || SERVICE_PRESETS.some((p) => p.defaultUrl === url))) {
        setUrl(preset.defaultUrl)
      }
    }
  }

  const handleGeneratePassword = () => {
    const strong = generateStrongPassword(20)
    setPassword(strong)
    setShowPassword(true)
    navigator.clipboard.writeText(strong)
    setCopiedGenerated(true)
    setTimeout(() => setCopiedGenerated(false), 2500)
  }

  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', color: 'bg-gray-200', width: '0%' }
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 14) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: '25%' }
    if (score <= 3) return { label: 'Fair', color: 'bg-amber-500', width: '50%' }
    if (score <= 4) return { label: 'Strong', color: 'bg-emerald-500', width: '75%' }
    return { label: 'Bulletproof', color: 'bg-indigo-600', width: '100%' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) {
      setError('Please select a client.')
      return
    }

    const finalServiceName =
      selectedServicePreset === 'Other'
        ? customServiceName.trim() || 'Custom Service'
        : selectedServicePreset

    if (!finalServiceName) {
      setError('Please specify the service name.')
      return
    }

    if (!usernameEmail.trim()) {
      setError('Please enter a username or email.')
      return
    }

    if (!password) {
      setError('Please enter a password.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // 1. Encrypt password with Web Crypto AES-256-GCM
      const encryptedPassword = await encryptCredential(password)

      const payload = {
        client_id: clientId,
        service_name: finalServiceName,
        service_category: serviceCategory,
        username_email: usernameEmail.trim(),
        encrypted_password: encryptedPassword,
        url: url.trim() || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      if (credential) {
        const { error: updateError } = await supabase
          .from('client_credentials')
          .update(payload)
          .eq('id', credential.id)

        if (updateError) throw updateError
        await logCredentialAudit(credential.id, 'updated')
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('client_credentials')
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (insertError) throw insertError
        if (inserted?.id) {
          await logCredentialAudit(inserted.id, 'created')
        }
      }

      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save credential securely.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const strength = getPasswordStrength()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-50/50 via-white to-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {credential ? 'Edit Credential' : 'Add Client Credential'}
              </h2>
              <p className="text-xs text-gray-500">
                Encrypted at rest with AES-256-GCM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading state while decrypting */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <p className="text-sm font-medium">Decrypting credentials securely...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Client Selection */}
            <div>
              <label className="label">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                className="input cursor-pointer"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a Client
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.contact_person})
                  </option>
                ))}
              </select>
            </div>

            {/* Service Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">
                  Service / Tool <span className="text-red-500">*</span>
                </label>
                <select
                  className="input cursor-pointer"
                  value={selectedServicePreset}
                  onChange={(e) => handleServiceChange(e.target.value)}
                >
                  {SERVICE_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Category</label>
                <input
                  type="text"
                  className="input"
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  placeholder="e.g. Database, Hosting"
                />
              </div>
            </div>

            {/* Custom Service Name if 'Other' selected */}
            {selectedServicePreset === 'Other' && (
              <div>
                <label className="label">
                  Custom Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Custom API Portal, Linode, Mongo Atlas"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Username / Email */}
            <div>
              <label className="label">
                Username / Email <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input font-mono text-xs"
                placeholder="admin@client.com or username"
                value={usernameEmail}
                onChange={(e) => setUsernameEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">
                  Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  {copiedGenerated ? 'Copied to Clipboard!' : 'Generate Strong Password'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-20 font-mono text-xs tracking-wider"
                  placeholder="Enter or generate password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Login URL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Login / Console URL</label>
                {url && (
                  <a
                    href={url.startsWith('http') ? url : `https://${url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                  >
                    Test URL <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="text"
                className="input text-xs font-mono"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            {/* Notes / 2FA / Extra info */}
            <div>
              <label className="label">Notes / 2FA Backup Codes / Server Info</label>
              <textarea
                rows={2}
                className="input resize-none text-xs"
                placeholder="Port, recovery keys, server IP, organization slug, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Footer buttons */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs flex items-center gap-1.5"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Encrypting & Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {credential ? 'Save Changes' : 'Save Credential'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
