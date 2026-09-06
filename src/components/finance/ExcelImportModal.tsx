import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import {
  X,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import type { Client } from '@/types'

interface ParsedRow {
  id: string
  clientName: string
  matchedClientId?: string
  date: string
  serviceName: string
  expense: number
  charged: number
  advance: number
  remarks: string
  status: 'valid' | 'warning' | 'error'
  message?: string
}

interface Props {
  clients: Client[]
  onClose: () => void
  onImportComplete: () => void
}

export default function ExcelImportModal({ clients, onClose, onImportComplete }: Props) {
  const { user } = useAuthStore()
  const [inputText, setInputText] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [step, setStep] = useState<'input' | 'preview'>('input')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Clean numeric strings: "₹6,900" -> 6900
  const parseAmount = (val: string): number => {
    if (!val) return 0
    const cleaned = val.replace(/[₹$, ]/g, '').trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

  // Parse Date string or fallback to today
  const parseDate = (val: string): string => {
    if (!val) return new Date().toISOString().split('T')[0]
    const trimmed = val.trim()
    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (ddmmyyyy) {
      const year = ddmmyyyy[3].length === 2 ? `20${ddmmyyyy[3]}` : ddmmyyyy[3]
      const month = ddmmyyyy[2].padStart(2, '0')
      const day = ddmmyyyy[1].padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
    return new Date().toISOString().split('T')[0]
  }

  const handleParse = () => {
    setError('')
    if (!inputText.trim()) {
      setError('Please paste spreadsheet data or upload a CSV file.')
      return
    }

    const lines = inputText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0)

    if (lines.length === 0) {
      setError('No data found.')
      return
    }

    // Determine delimiter (tab or comma)
    const firstLine = lines[0]
    const delimiter = firstLine.includes('\t') ? '\t' : ','

    // Check if first line is a header
    let startIndex = 0
    const firstLineLower = firstLine.toLowerCase()
    if (
      firstLineLower.includes('client') ||
      firstLineLower.includes('service') ||
      firstLineLower.includes('charged') ||
      firstLineLower.includes('sr.no') ||
      firstLineLower.includes('sr no')
    ) {
      startIndex = 1
    }

    const rows: ParsedRow[] = []

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i]
      // Split by delimiter (respecting quotes for CSV)
      const cols = delimiter === '\t'
        ? line.split('\t').map(c => c.trim())
        : line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim())

      if (cols.length < 2) continue

      // Map columns based on typical Excel order:
      // Sr.no, Date, Clients, Service, Expenses, Charged, Advance, Balance, Profit, Remarks
      let date = ''
      let clientName = ''
      let serviceName = ''
      let expense = 0
      let charged = 0
      let advance = 0
      let remarks = ''

      if (cols.length >= 7) {
        // If col 0 looks like an integer Sr.No:
        if (/^\d+$/.test(cols[0]) && cols.length >= 8) {
          date = parseDate(cols[1])
          clientName = cols[2]
          serviceName = cols[3]
          expense = parseAmount(cols[4])
          charged = parseAmount(cols[5])
          advance = parseAmount(cols[6])
          remarks = cols[9] || cols[8] || cols[7] || ''
        } else {
          // Date, Client, Service, Expense, Charged, Advance, ...
          date = parseDate(cols[0])
          clientName = cols[1]
          serviceName = cols[2]
          expense = parseAmount(cols[3])
          charged = parseAmount(cols[4])
          advance = parseAmount(cols[5])
          remarks = cols[6] || ''
        }
      } else {
        // Minimal format: Client, Service, Expense, Charged, Advance
        clientName = cols[0]
        serviceName = cols[1]
        expense = parseAmount(cols[2])
        charged = parseAmount(cols[3])
        advance = parseAmount(cols[4])
        remarks = cols[5] || ''
        date = new Date().toISOString().split('T')[0]
      }

      if (!clientName && !serviceName) continue

      // Match client by company_name
      const cNorm = clientName.toLowerCase().replace(/[^a-z0-9]/g, '')
      const matched = clients.find(c => {
        const candidate = c.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')
        return candidate === cNorm || candidate.includes(cNorm) || cNorm.includes(candidate)
      })

      let status: 'valid' | 'warning' | 'error' = 'valid'
      let message = ''

      if (!clientName) {
        status = 'error'
        message = 'Missing client name'
      } else if (!serviceName) {
        status = 'error'
        message = 'Missing service name'
      } else if (!matched) {
        status = 'warning'
        message = 'Client not found in database (will create or map)'
      }

      rows.push({
        id: `row-${i}-${Date.now()}`,
        clientName: clientName || 'Unknown',
        matchedClientId: matched?.id,
        date,
        serviceName: serviceName || 'General Service',
        expense,
        charged,
        advance,
        remarks,
        status,
        message,
      })
    }

    if (rows.length === 0) {
      setError('Could not parse any valid rows. Please verify your format.')
      return
    }

    setParsedRows(rows)
    setStep('preview')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      const content = evt.target?.result as string
      setInputText(content)
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Create missing clients if needed
      const missingClientNames = Array.from(
        new Set(
          parsedRows
            .filter(r => !r.matchedClientId && r.clientName.trim())
            .map(r => r.clientName.trim())
        )
      )

      const clientMap = new Map<string, string>()
      clients.forEach(c => clientMap.set(c.company_name.toLowerCase(), c.id))

      if (missingClientNames.length > 0) {
        const newClientsPayload = missingClientNames.map(name => ({
          company_name: name,
          contact_person: name,
          phone: '0000000000',
          email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`,
          notes: 'Imported via Excel Migration',
        }))

        const { data: createdClients, error: createErr } = await supabase
          .from('clients')
          .insert(newClientsPayload)
          .select('id, company_name')

        if (createErr) throw createErr
        createdClients?.forEach(c => clientMap.set(c.company_name.toLowerCase(), c.id))
      }

      // 2. Prepare financial entries
      const entriesToInsert = parsedRows.map(r => {
        const cId = r.matchedClientId || clientMap.get(r.clientName.trim().toLowerCase())
        return {
          client_id: cId,
          service_name: r.serviceName,
          entry_date: r.date,
          expense_amount: r.expense,
          charged_amount: r.charged,
          advance_amount: r.advance,
          remarks: r.remarks || null,
          created_by: user?.id ?? null,
        }
      }).filter(e => e.client_id)

      if (entriesToInsert.length === 0) {
        throw new Error('No valid rows could be matched to clients.')
      }

      const { error: insertErr } = await supabase
        .from('financial_entries')
        .insert(entriesToInsert)

      if (insertErr) throw insertErr

      onImportComplete()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to import records.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-base">
                Import Financial Records from Excel / CSV
              </h2>
              <p className="text-xs text-gray-500">
                Bulk migrate your existing spreadsheets with client mapping & validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-800 space-y-1">
                <p className="font-semibold text-blue-900">Supported Excel / CSV Columns:</p>
                <p>
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">Date</code> |{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">Client</code> |{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">Service</code> |{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">Expenses</code> |{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">Charged</code> |{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">Advance</code> |{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">Remarks</code>
                </p>
                <p className="text-blue-700 mt-1">
                  You can copy cells directly from Microsoft Excel or Google Sheets and paste below.
                </p>
              </div>

              {/* Upload file or paste */}
              <div className="flex items-center gap-3">
                <label className="btn-secondary text-xs cursor-pointer flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" /> Upload CSV File
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <span className="text-xs text-gray-400">or paste spreadsheet rows directly below</span>
              </div>

              <textarea
                rows={12}
                className="input font-mono text-xs w-full leading-relaxed"
                placeholder={`Date\tClients\tService\tExpenses\tCharged\tAdvance\tRemarks
2026-07-10\tJitendra\tDomains\t3754\t6900\t6900\t8 domains registration
2026-07-12\tJitendra\tMails\t4416\t6900\t6900\t8 mailboxes setup
2026-07-15\tEleora\tWebsite\t0\t6900\t6900\tWebsite setup
2026-07-20\tCA Sayed\tWebsite\t1308\t10000\t2000\tWebsite & hosting`}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Review & Confirm ({parsedRows.length} rows parsed)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Verify client associations and calculated totals before inserting
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="btn-secondary text-xs"
                >
                  Edit Input Data
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 text-gray-600 font-semibold">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Client (Matched)</th>
                      <th className="px-3 py-2 text-left">Service</th>
                      <th className="px-3 py-2 text-right">Expense</th>
                      <th className="px-3 py-2 text-right">Charged</th>
                      <th className="px-3 py-2 text-right">Advance</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                      <th className="px-3 py-2 text-right">Profit</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.map((row, idx) => {
                      const balance = Math.max(0, row.charged - row.advance)
                      const profit = row.charged - row.expense
                      const matched = clients.find(c => c.id === row.matchedClientId)

                      return (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500">{row.date}</td>
                          <td className="px-3 py-2 font-medium">
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-900">{row.clientName}</span>
                              {matched ? (
                                <span className="badge bg-green-50 text-green-700 text-[10px] py-0 px-1">
                                  ✓ {matched.company_name}
                                </span>
                              ) : (
                                <span className="badge bg-amber-50 text-amber-700 text-[10px] py-0 px-1">
                                  + New Client
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-800">{row.serviceName}</td>
                          <td className="px-3 py-2 text-right text-red-600 font-mono">
                            {formatCurrency(row.expense)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900 font-mono font-medium">
                            {formatCurrency(row.charged)}
                          </td>
                          <td className="px-3 py-2 text-right text-green-600 font-mono font-medium">
                            {formatCurrency(row.advance)}
                          </td>
                          <td className="px-3 py-2 text-right text-amber-600 font-mono">
                            {formatCurrency(balance)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-mono font-medium ${
                              profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(profit)}
                          </td>
                          <td className="px-3 py-2">
                            {row.status === 'valid' ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                              </span>
                            ) : (
                              <span className="text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> {row.message}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
            Cancel
          </button>

          {step === 'input' ? (
            <button
              type="button"
              onClick={handleParse}
              className="btn-primary flex items-center gap-2"
            >
              <span>Parse & Preview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirm & Import ({parsedRows.length} Entries)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
