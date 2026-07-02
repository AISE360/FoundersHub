import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate)
  const today = new Date()
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    'on-hold': 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    todo: 'bg-gray-100 text-gray-700',
    'in-progress': 'bg-brand-100 text-brand-700',
    testing: 'bg-purple-100 text-purple-700',
    done: 'bg-green-100 text-green-700',
    won: 'bg-green-100 text-green-700',
    lost: 'bg-red-100 text-red-700',
    lead: 'bg-gray-100 text-gray-700',
    qualified: 'bg-blue-100 text-blue-700',
    proposal: 'bg-yellow-100 text-yellow-700',
    negotiation: 'bg-orange-100 text-orange-700',
  }
  return map[status?.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  }
  return map[priority?.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
}
