export interface ServicePreset {
  name: string
  category: string
  defaultUrl?: string
  color: string // Tailwind color badge
  bgColor: string
  borderColor: string
}

export const SERVICE_PRESETS: ServicePreset[] = [
  {
    name: 'Supabase',
    category: 'Database',
    defaultUrl: 'https://supabase.com/dashboard',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    name: 'Gmail',
    category: 'Email & Workspace',
    defaultUrl: 'https://mail.google.com',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    name: 'Google Workspace',
    category: 'Email & Workspace',
    defaultUrl: 'https://admin.google.com',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    name: 'GoDaddy',
    category: 'Hosting & Domain',
    defaultUrl: 'https://sso.godaddy.com',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
  },
  {
    name: 'Hostinger',
    category: 'Hosting & Domain',
    defaultUrl: 'https://hpanel.hostinger.com',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    name: 'AWS',
    category: 'Cloud & DevOps',
    defaultUrl: 'https://aws.amazon.com/console',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    name: 'GitHub',
    category: 'Repository',
    defaultUrl: 'https://github.com/login',
    color: 'text-gray-900',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
  {
    name: 'Cloudflare',
    category: 'Cloud & DevOps',
    defaultUrl: 'https://dash.cloudflare.com/login',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    name: 'WordPress',
    category: 'CMS & Web',
    defaultUrl: '',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
  },
  {
    name: 'cPanel',
    category: 'Hosting & Domain',
    defaultUrl: '',
    color: 'text-orange-800',
    bgColor: 'bg-orange-100/60',
    borderColor: 'border-orange-300',
  },
  {
    name: 'Domain Registrar',
    category: 'Hosting & Domain',
    defaultUrl: '',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  {
    name: 'Hosting',
    category: 'Hosting & Domain',
    defaultUrl: '',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    name: 'Vercel',
    category: 'Cloud & DevOps',
    defaultUrl: 'https://vercel.com/login',
    color: 'text-slate-900',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
  },
  {
    name: 'DigitalOcean',
    category: 'Cloud & DevOps',
    defaultUrl: 'https://cloud.digitalocean.com/login',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    name: 'Stripe',
    category: 'Payment & Gateway',
    defaultUrl: 'https://dashboard.stripe.com/login',
    color: 'text-indigo-800',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  {
    name: 'Other',
    category: 'Other',
    defaultUrl: '',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
]

export function getServiceBadgeStyle(serviceName: string): ServicePreset {
  const normalized = serviceName.toLowerCase().trim()
  const found = SERVICE_PRESETS.find(
    (p) => p.name.toLowerCase() === normalized
  )
  if (found) return found

  // Fuzzy match
  for (const preset of SERVICE_PRESETS) {
    if (preset.name !== 'Other' && normalized.includes(preset.name.toLowerCase())) {
      return preset
    }
  }

  return {
    name: serviceName,
    category: 'Other',
    color: 'text-brand-700',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-200',
  }
}
