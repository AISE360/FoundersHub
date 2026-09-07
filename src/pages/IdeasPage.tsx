import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, getInitials } from '@/lib/utils'
import { Plus, Search, Lightbulb, ArrowUpDown, Sparkles } from 'lucide-react'
import type { Idea } from '@/types'
import IdeaModal from '@/components/ideas/IdeaModal'
import IdeaDetailModal from '@/components/ideas/IdeaDetailModal'
import DeleteIdeaDialog from '@/components/ideas/DeleteIdeaDialog'

type SortOption = 'newest' | 'oldest' | 'alphabetical'

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null)
  const [viewingIdea, setViewingIdea] = useState<Idea | null>(null)
  const [deletingIdea, setDeletingIdea] = useState<Idea | null>(null)

  const loadIdeas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ideas')
      .select('*, creator:profiles(*)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching ideas:', error)
    } else {
      setIdeas((data as Idea[]) ?? [])
      // If currently viewing idea, update its reference
      if (viewingIdea) {
        const refreshed = data?.find((i: Idea) => i.id === viewingIdea.id)
        setViewingIdea(refreshed ?? null)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadIdeas()
  }, [])

  // Filter & sort
  const filteredAndSortedIdeas = useMemo(() => {
    let result = ideas.filter((idea) => {
      const term = search.toLowerCase().trim()
      if (!term) return true
      const matchTitle = idea.title.toLowerCase().includes(term)
      const matchDesc = (idea.description ?? '').toLowerCase().includes(term)
      return matchTitle || matchDesc
    })

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title)
      }
      return 0
    })

    return result
  }, [ideas, search, sortBy])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">💡</span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ideas</h1>
            <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/60">
              {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Capture ideas before they get forgotten.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Idea
        </button>
      </div>

      {/* Filter and Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input pl-9 text-sm"
            placeholder="Search ideas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Sort */}
        <div className="relative sm:w-48 shrink-0">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            className="input pl-8 text-xs font-medium cursor-pointer"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="alphabetical">A-Z</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          <p className="text-xs text-gray-400">Loading ideas vault...</p>
        </div>
      ) : ideas.length === 0 ? (
        /* Zero State (No ideas recorded at all) */
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mx-auto mb-4 text-2xl shadow-xs">
            💡
          </div>
          <h3 className="text-lg font-bold text-gray-900">No ideas yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-6">
            Capture your first SaaS or business idea before you forget it.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2 text-xs"
          >
            <Plus className="w-4 h-4" /> Add Your First Idea
          </button>
        </div>
      ) : filteredAndSortedIdeas.length === 0 ? (
        /* Filtered Empty State */
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center max-w-md mx-auto">
          <p className="text-sm font-semibold text-gray-800">No matching ideas</p>
          <p className="text-xs text-gray-500 mt-1">
            No ideas found matching "{search}". Try searching for something else.
          </p>
          <button
            onClick={() => setSearch('')}
            className="btn-secondary mt-4 text-xs"
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Ideas Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredAndSortedIdeas.map((idea) => {
            const creatorName = idea.creator?.full_name || 'Founder'
            return (
              <div
                key={idea.id}
                onClick={() => setViewingIdea(idea)}
                className="card group cursor-pointer overflow-hidden flex flex-col h-full hover:shadow-md hover:border-brand-300/80 transition-all duration-200"
              >
                {/* Card Top: Image or Clean Default Graphic */}
                {idea.image_url ? (
                  <div className="h-44 w-full overflow-hidden bg-gray-100 relative border-b border-gray-100">
                    <img
                      src={idea.image_url}
                      alt={idea.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-28 w-full bg-gradient-to-br from-amber-50 via-orange-50/40 to-slate-50 border-b border-gray-100 flex items-center justify-between px-5 relative overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-white/90 border border-amber-200/60 shadow-xs flex items-center justify-center text-lg">
                      💡
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700/80 uppercase tracking-wider bg-white/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-amber-100">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Concept
                    </div>
                  </div>
                )}

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-brand-700 transition-colors line-clamp-2">
                      {idea.title}
                    </h3>
                    {idea.description ? (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed">
                        {idea.description}
                      </p>
                    ) : (
                      <p className="text-xs italic text-gray-400 mt-2">
                        Quick note idea without description.
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Creator & Date */}
                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                        {getInitials(creatorName)}
                      </div>
                      <span className="truncate text-gray-700 font-medium text-[11px]">
                        Added by {creatorName}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0 font-medium">
                      {formatDate(idea.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingIdea) && (
        <IdeaModal
          idea={editingIdea}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingIdea(null)
          }}
          onSaved={() => {
            setIsAddModalOpen(false)
            setEditingIdea(null)
            loadIdeas()
          }}
        />
      )}

      {/* Idea Detail Modal */}
      {viewingIdea && !editingIdea && !deletingIdea && (
        <IdeaDetailModal
          idea={viewingIdea}
          onClose={() => setViewingIdea(null)}
          onEdit={() => {
            const target = viewingIdea
            setViewingIdea(null)
            setEditingIdea(target)
          }}
          onDelete={() => {
            const target = viewingIdea
            setViewingIdea(null)
            setDeletingIdea(target)
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingIdea && (
        <DeleteIdeaDialog
          idea={deletingIdea}
          onClose={() => setDeletingIdea(null)}
          onDeleted={() => {
            setDeletingIdea(null)
            loadIdeas()
          }}
        />
      )}
    </div>
  )
}
