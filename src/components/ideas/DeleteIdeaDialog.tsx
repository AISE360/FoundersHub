import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { Idea } from '@/types'

interface Props {
  idea: Idea
  onClose: () => void
  onDeleted: () => void
}

function extractStoragePath(publicUrl: string): string | null {
  try {
    const marker = '/idea-images/'
    const index = publicUrl.indexOf(marker)
    if (index !== -1) {
      return decodeURIComponent(publicUrl.substring(index + marker.length))
    }
  } catch (e) {
    console.error('Failed to parse storage path from URL', e)
  }
  return null
}

export default function DeleteIdeaDialog({ idea, onClose, onDeleted }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setError('')
    setLoading(true)

    try {
      // 1. Delete image from Storage if it exists
      if (idea.image_url) {
        const storagePath = extractStoragePath(idea.image_url)
        if (storagePath) {
          await supabase.storage.from('idea-images').remove([storagePath])
        }
      }

      // 2. Delete idea record from DB
      const { error: deleteError } = await supabase
        .from('ideas')
        .delete()
        .eq('id', idea.id)

      if (deleteError) throw deleteError

      onDeleted()
    } catch (err: any) {
      console.error('Error deleting idea:', err)
      setError(err.message || 'Failed to delete idea. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-base">Delete this idea?</h3>
            <p className="text-xs text-gray-500 mt-1">
              Are you sure you want to delete <span className="font-semibold text-gray-700">"{idea.title}"</span>?
              This action cannot be undone and any attached screenshot will be permanently removed.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="btn-danger text-xs flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Deleting...' : 'Delete Idea'}
          </button>
        </div>
      </div>
    </div>
  )
}
