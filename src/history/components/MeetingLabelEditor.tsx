import { useState } from 'react'
import { Edit2, Check, X } from 'lucide-react'

interface MeetingLabelEditorProps {
  recordId: string
  meetingId: string
  currentLabel?: string
  onUpdateSingle: (recordId: string, label: string) => void
  onUpdateAll: (meetingId: string, label: string) => void
}

export function MeetingLabelEditor({ recordId, meetingId, currentLabel, onUpdateSingle, onUpdateAll }: MeetingLabelEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(currentLabel || '')

  const handleSave = (applyToAll: boolean) => {
    const trimmed = label.trim()
    if (applyToAll) {
      onUpdateAll(meetingId, trimmed)
    } else {
      onUpdateSingle(recordId, trimmed)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setLabel(currentLabel || '')
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 group">
        <span className="text-sm font-medium">{currentLabel || meetingId}</span>
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-opacity"
          title="Edit label"
        >
          <Edit2 size={14} className="text-gray-500" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={meetingId}
        className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSave(false)
          } else if (e.key === 'Escape') {
            handleCancel()
          }
        }}
      />
      <div className="flex gap-1">
        <button
          onClick={() => handleSave(false)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          title="Apply to this record only"
        >
          <Check size={12} />
          This only
        </button>
        <button
          onClick={() => handleSave(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          title="Apply to all records with this meeting ID"
        >
          <Check size={12} />
          All with ID
        </button>
        <button
          onClick={handleCancel}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          <X size={12} />
          Cancel
        </button>
      </div>
    </div>
  )
}
