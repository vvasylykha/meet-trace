import React, { useState, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export default function TagEditor({ tags, onChange }: TagEditorProps) {
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function addTag() {
    const val = input.trim()
    if (!val) return
    if (!tags.includes(val)) onChange([...tags, val])
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="hover:text-red-500 transition-colors ml-0.5"
            title="Remove tag"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {editing ? (
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { addTag(); e.preventDefault() }
            if (e.key === 'Escape') { setEditing(false); setInput('') }
          }}
          onBlur={() => { addTag(); setEditing(false) }}
          placeholder="Add tag…"
          className="text-xs px-2 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-24"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border border-dashed border-gray-400 dark:border-gray-500 text-gray-500 dark:text-gray-400 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
          title="Add tag"
        >
          <Plus size={10} />
          tag
        </button>
      )}
    </div>
  )
}
