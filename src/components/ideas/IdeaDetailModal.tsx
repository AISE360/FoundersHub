import { X, Calendar, Clock, User as UserIcon, Edit2, Trash2, ExternalLink } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import type { Idea } from '@/types'

interface Props {
  idea: Idea
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function IdeaDetailModal({ idea, onClose, onEdit, onDelete }: Props) {
  const creatorName = idea.creator?.full_name || 'Founder'
  const creatorEmail = idea.creator?.email

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full">
              Idea Vault
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              title="Edit Idea"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete Idea"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-gray-200 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Optional Full Image */}
          {idea.image_url ? (
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 relative group">
              <img
                src={idea.image_url}
                alt={idea.title}
                className="w-full max-h-96 object-contain bg-slate-900/5 mx-auto"
              />
              <a
                href={idea.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 hover:bg-black/80"
              >
                Open Full Image <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : null}

          {/* Title & Description */}
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-snug">
              {idea.title}
            </h1>
            {idea.description ? (
              <div className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-slate-50/60 p-4 rounded-xl border border-gray-100">
                {idea.description}
              </div>
            ) : (
              <p className="mt-3 text-xs italic text-gray-400">
                No description provided for this idea.
              </p>
            )}
          </div>

          {/* Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-xs">
            {/* Creator */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
              <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                {getInitials(creatorName)}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 font-medium">Added by</p>
                <p className="font-semibold text-gray-800 truncate">{creatorName}</p>
                {creatorEmail && (
                  <p className="text-[11px] text-gray-500 truncate">{creatorEmail}</p>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-2 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-400">Created:</span>
                <span className="font-medium text-gray-800">{formatDate(idea.created_at)}</span>
              </div>
              {idea.updated_at && idea.updated_at !== idea.created_at && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-400">Updated:</span>
                  <span className="font-medium text-gray-800">{formatDate(idea.updated_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <button
            onClick={onDelete}
            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Idea
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary text-xs">
              Close
            </button>
            <button onClick={onEdit} className="btn-primary text-xs flex items-center gap-1.5">
              <Edit2 className="w-3.5 h-3.5" /> Edit Idea
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
