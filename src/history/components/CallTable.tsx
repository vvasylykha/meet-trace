import React, { useState } from 'react'
import { Trash2, FileText, ChevronUp, ChevronDown } from 'lucide-react'
import type { CallRecord } from '../../shared/types'
import TagEditor from './TagEditor'
import TranscriptModal from './TranscriptModal'
import { MeetingLabelEditor } from './MeetingLabelEditor'
import { SingleRecordExportMenu } from './SingleRecordExportMenu'

interface CallTableProps {
  records: CallRecord[]
  selected: Set<string>
  onSelectAll: (ids: string[]) => void
  onSelectOne: (id: string, checked: boolean) => void
  onDeleteOne: (id: string) => void
  onUpdateTags: (id: string, tags: string[]) => void
  onUpdateLabel: (id: string, label: string) => void
  onUpdateLabelForAll: (meetingId: string, label: string) => void
}

type SortKey = 'startedAt' | 'meetingId' | 'duration'
type SortDir = 'asc' | 'desc'

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function CallTable({
  records, selected, onSelectAll, onSelectOne, onDeleteOne, onUpdateTags, onUpdateLabel, onUpdateLabelForAll
}: CallTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('startedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [transcript, setTranscript] = useState<CallRecord | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...records].sort((a, b) => {
    let av: string | number = a[sortKey]
    let bv: string | number = b[sortKey]
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const allChecked = records.length > 0 && records.every(r => selected.has(r.id))
  const someChecked = records.some(r => selected.has(r.id)) && !allChecked

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={13} className="text-gray-300 dark:text-gray-600" />
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="text-blue-500" />
      : <ChevronDown size={13} className="text-blue-500" />
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
        <FileText size={48} className="mb-4 opacity-30" />
        <p className="text-lg font-medium">No call records found</p>
        <p className="text-sm mt-1">Records will appear here automatically after calls end</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked }}
                  onChange={e => onSelectAll(e.target.checked ? records.map(r => r.id) : [])}
                  className="rounded"
                />
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                onClick={() => handleSort('startedAt')}
              >
                <span className="inline-flex items-center gap-1">Date <SortIcon col="startedAt" /></span>
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                onClick={() => handleSort('meetingId')}
              >
                <span className="inline-flex items-center gap-1">Meeting ID <SortIcon col="meetingId" /></span>
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                onClick={() => handleSort('duration')}
              >
                <span className="inline-flex items-center gap-1">Duration <SortIcon col="duration" /></span>
              </th>
              <th className="px-4 py-3 text-left">Tags</th>
              <th className="px-4 py-3 text-left">Transcript</th>
              <th className="w-20 px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {sorted.map(record => (
              <tr
                key={record.id}
                className={`transition-colors ${selected.has(record.id) ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(record.id)}
                    onChange={e => onSelectOne(record.id, e.target.checked)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                  {formatDate(record.startedAt)}
                </td>
                <td className="px-4 py-3">
                  <MeetingLabelEditor
                    recordId={record.id}
                    meetingId={record.meetingId}
                    currentLabel={record.meetingLabel}
                    onUpdateSingle={onUpdateLabel}
                    onUpdateAll={onUpdateLabelForAll}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                  {formatDuration(record.duration)}
                </td>
                <td className="px-4 py-3 max-w-[220px]">
                  <TagEditor
                    tags={record.tags}
                    onChange={tags => onUpdateTags(record.id, tags)}
                  />
                </td>
                <td className="px-4 py-3 max-w-[260px]">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-gray-500 dark:text-gray-400 text-xs">
                      {record.transcript.slice(0, 80)}{record.transcript.length > 80 ? '…' : ''}
                    </span>
                    {record.transcript.trim() && (
                      <button
                        onClick={() => setTranscript(record)}
                        className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        title="View full transcript"
                      >
                        <FileText size={13} />
                        View
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <SingleRecordExportMenu record={record} />
                    <button
                      onClick={() => onDeleteOne(record.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transcript && (
        <TranscriptModal
          meetingId={transcript.meetingId}
          transcript={transcript.transcript}
          onClose={() => setTranscript(null)}
        />
      )}
    </>
  )
}
