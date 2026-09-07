import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { X, UploadCloud, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react'
import type { Idea } from '@/types'

interface Props {
  idea?: Idea | null
  onClose: () => void
  onSaved: () => void
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

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

export default function IdeaModal({ idea, onClose, onSaved }: Props) {
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(idea?.title ?? '')
  const [description, setDescription] = useState(idea?.description ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(idea?.image_url ?? null)
  const [removeExistingImage, setRemoveExistingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileSelection = (file: File) => {
    setError('')
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a valid image (PNG, JPG/JPEG, or WEBP).')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Image file size must be less than 5MB.')
      return
    }

    setImageFile(file)
    setRemoveExistingImage(false)
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setRemoveExistingImage(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please enter a title for your idea.')
      return
    }
    if (!user) {
      setError('You must be signed in to save an idea.')
      return
    }

    setError('')
    setLoading(true)

    try {
      let finalImageUrl = idea?.image_url ?? null

      // Handle new file upload
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const cleanName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `${user.id}/${Date.now()}_${cleanName}`

        const { error: uploadError } = await supabase.storage
          .from('idea-images')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`)
        }

        const { data: publicUrlData } = supabase.storage
          .from('idea-images')
          .getPublicUrl(filePath)

        finalImageUrl = publicUrlData.publicUrl

        // If replacing previous image, remove old one from storage
        if (idea?.image_url) {
          const oldPath = extractStoragePath(idea.image_url)
          if (oldPath) {
            await supabase.storage.from('idea-images').remove([oldPath])
          }
        }
      } else if (removeExistingImage) {
        // User removed the existing image
        finalImageUrl = null
        if (idea?.image_url) {
          const oldPath = extractStoragePath(idea.image_url)
          if (oldPath) {
            await supabase.storage.from('idea-images').remove([oldPath])
          }
        }
      }

      if (idea) {
        // Update existing idea
        const { error: updateError } = await supabase
          .from('ideas')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            image_url: finalImageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', idea.id)

        if (updateError) throw updateError
      } else {
        // Create new idea
        const { error: insertError } = await supabase
          .from('ideas')
          .insert({
            title: title.trim(),
            description: description.trim() || null,
            image_url: finalImageUrl,
            created_by: user.id,
          })

        if (insertError) throw insertError
      }

      onSaved()
    } catch (err: any) {
      console.error('Error saving idea:', err)
      setError(err.message || 'An error occurred while saving your idea.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💡</span>
            <div>
              <h2 className="font-bold text-gray-900 text-base">
                {idea ? 'Edit Idea' : 'Capture New Idea'}
              </h2>
              <p className="text-xs text-gray-500">
                {idea ? 'Update idea details or screenshot' : 'Quickly record an idea before you forget it'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="label">
              Idea Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input text-sm"
              placeholder="e.g. AI Receptionist for Clinics"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input text-sm min-h-[100px]"
              rows={4}
              placeholder="What problem does it solve? Key thoughts, target market, or quick notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="label">Concept Image / Screenshot (optional)</label>

            {imagePreview ? (
              <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group">
                <img
                  src={imagePreview}
                  alt="Idea preview"
                  className="w-full h-48 object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-gray-800 rounded-lg text-xs font-medium shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    Change Image
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium shadow-sm hover:bg-red-700 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-brand-500 bg-brand-50/50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-gray-700 text-center">
                  <span className="text-brand-600 hover:underline">Click to upload</span> or drag and drop
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  PNG, JPG, or WEBP (Max 5MB)
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="btn-primary text-xs flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving...' : idea ? 'Save Changes' : 'Save Idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
