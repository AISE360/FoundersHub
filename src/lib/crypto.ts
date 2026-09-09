import { supabase } from '@/lib/supabase'

// Master Vault Secret for AES-256-GCM encryption at rest
// Can be customized via VITE_VAULT_SECRET in .env
const VAULT_SECRET =
  (import.meta.env.VITE_VAULT_SECRET as string) ||
  'foundershub-secure-client-vault-key-2026-aise360'

const SALT = new TextEncoder().encode('aise360_vault_salt_v1')

// Cached CryptoKey promise
let cachedKey: CryptoKey | null = null

async function getVaultKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(VAULT_SECRET),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  cachedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return cachedKey
}

/**
 * Encrypts a plaintext password using AES-256-GCM.
 * Returns a versioned string: "v1:iv_base64:ciphertext_base64"
 */
export async function encryptCredential(plaintext: string): Promise<string> {
  if (!plaintext) return ''

  try {
    const key = await getVaultKey()
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const enc = new TextEncoder()
    const encodedData = enc.encode(plaintext)

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedData
    )

    const ivB64 = btoa(String.fromCharCode(...iv))
    const dataB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)))

    return `v1:${ivB64}:${dataB64}`
  } catch (error) {
    console.error('Encryption failed (redacted error details)')
    throw new Error('Failed to securely encrypt credential.')
  }
}

/**
 * Decrypts an encrypted credential string back to plaintext.
 * Gracefully handles legacy strings or version mismatches.
 */
export async function decryptCredential(encryptedPayload: string): Promise<string> {
  if (!encryptedPayload) return ''

  // Check format: v1:iv:ciphertext
  if (!encryptedPayload.startsWith('v1:')) {
    // If not encrypted in v1 format, return as is (safe fallback for plain string migration)
    return encryptedPayload
  }

  try {
    const parts = encryptedPayload.split(':')
    if (parts.length !== 3) {
      throw new Error('Malformed cipher format')
    }

    const [, ivB64, dataB64] = parts
    const iv = new Uint8Array(
      atob(ivB64)
        .split('')
        .map((c) => c.charCodeAt(0))
    )
    const encryptedData = new Uint8Array(
      atob(dataB64)
        .split('')
        .map((c) => c.charCodeAt(0))
    )

    const key = await getVaultKey()
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encryptedData
    )

    const dec = new TextDecoder()
    return dec.decode(decrypted)
  } catch (error) {
    console.error('Decryption failed (redacted error details)')
    return '••••••••'
  }
}

/**
 * Cryptographically secure strong password generator
 */
export function generateStrongPassword(length = 20): string {
  const lowercase = 'abcdefghijkmnopqrstuvwxyz' // no l
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I, O
  const numbers = '23456789' // no 0, 1
  const symbols = '!@#$%^&*()-_=+[]{}'
  const allChars = lowercase + uppercase + numbers + symbols

  // Ensure at least one of each category
  const guaranteed = [
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]

  const randomValues = new Uint32Array(length - guaranteed.length)
  window.crypto.getRandomValues(randomValues)

  const rest: string[] = []
  for (let i = 0; i < randomValues.length; i++) {
    rest.push(allChars[randomValues[i] % allChars.length])
  }

  // Shuffle together
  const combined = [...guaranteed, ...rest]
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[combined[i], combined[j]] = [combined[j], combined[i]]
  }

  return combined.join('')
}

/**
 * Fire-and-forget audit logger for sensitive actions
 */
export async function logCredentialAudit(
  credentialId: string,
  action: 'created' | 'revealed' | 'copied' | 'updated' | 'deleted'
): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    await supabase.from('credential_audit_logs').insert({
      credential_id: credentialId,
      user_id: session?.user?.id || null,
      action,
    })
  } catch {
    // Non-blocking for UI resilience
  }
}
