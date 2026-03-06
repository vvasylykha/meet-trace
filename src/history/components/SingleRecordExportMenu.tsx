import { useState, useRef, useEffect } from 'react'
import { Download } from 'lucide-react'
import { exportSingleAsJSON, exportSingleAsCSV, exportSingleAsTXT } from '../../shared/export'
import type { CallRecord } from '../../shared/types'

interface SingleRecordExportMenuProps {
  record: CallRecord
}

export function SingleRecordExportMenu({ record }: SingleRecordExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleExport = (format: 'json' | 'csv' | 'txt') => {
    if (format === 'json') exportSingleAsJSON(record)
    else if (format === 'csv') exportSingleAsCSV(record)
    else exportSingleAsTXT(record)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        title="Export this record"
      >
        <Download size={16} className="text-gray-600 dark:text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg z-10">
          <button
            onClick={() => handleExport('json')}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md"
          >
            JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            CSV
          </button>
          <button
            onClick={() => handleExport('txt')}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-md"
          >
            TXT
          </button>
        </div>
      )}
    </div>
  )
}
