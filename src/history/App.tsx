import React, { useState, useMemo, useCallback } from 'react'
import { Trash2, RefreshCw } from 'lucide-react'
import { useCallRecords } from '../shared/useCallRecords'
import FilterBar from './components/FilterBar'
import CallTable from './components/CallTable'
import ExportMenu from './components/ExportMenu'
import DeleteConfirmDialog from './components/DeleteConfirmDialog'
import type { CallRecord } from '../shared/types'

export default function App() {
  const { records, loading, reload, updateTags, removeOne, removeMany, updateLabel, updateLabelForAll } = useCallRecords()

  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null)

  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('theme') === 'dark' } catch { return false }
  })

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch {}
  }, [dark])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    records.forEach(r => r.tags.forEach(t => set.add(t)))
    return [...set].sort()
  }, [records])

  const filtered = useMemo(() => {
    let out = records
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(r =>
        r.transcript.toLowerCase().includes(q) ||
        r.meetingId.toLowerCase().includes(q) ||
        r.meetingLabel?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q)
      )
    }
    if (tagFilter) {
      out = out.filter(r => r.tags.includes(tagFilter))
    }
    if (dateFrom) {
      const from = new Date(dateFrom).setHours(0, 0, 0, 0)
      out = out.filter(r => r.startedAt >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo).setHours(23, 59, 59, 999)
      out = out.filter(r => r.startedAt <= to)
    }
    return out
  }, [records, search, tagFilter, dateFrom, dateTo])

  function clearFilters() {
    setSearch('')
    setTagFilter('')
    setDateFrom('')
    setDateTo('')
  }

  function handleSelectAll(ids: string[]) {
    setSelected(new Set(ids))
  }

  function handleSelectOne(id: string, checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleDeleteOne(id: string) {
    setDeleteTarget([id])
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return
    setDeleteTarget([...selected])
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.length === 1) {
      await removeOne(deleteTarget[0])
    } else {
      await removeMany(deleteTarget)
    }
    setSelected(prev => {
      const next = new Set(prev)
      deleteTarget.forEach(id => next.delete(id))
      return next
    })
    setDeleteTarget(null)
  }

  const handleUpdateTags = useCallback(async (id: string, tags: string[]) => {
    await updateTags(id, tags)
  }, [updateTags])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="assets/icons-black-100.png" alt="MeetTrace" className="w-7 h-7 dark:hidden" />
            <img src="assets/icons-white-100.png" alt="MeetTrace" className="w-7 h-7 hidden dark:block" />
            <div>
              <h1 className="text-lg font-semibold leading-none">MeetTrace</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Call History</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filtered.length} of {records.length} record{records.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={reload}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            {/* <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors text-base"
              title="Toggle theme"
            >
              {dark ? '☀️' : '🌙'}
            </button> */}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <FilterBar
              search={search} onSearchChange={setSearch}
              tagFilter={tagFilter} onTagFilterChange={setTagFilter}
              dateFrom={dateFrom} onDateFromChange={setDateFrom}
              dateTo={dateTo} onDateToChange={setDateTo}
              allTags={allTags}
              onClear={clearFilters}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {selected.size > 0 && (
              <>
                <button
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={15} />
                  Delete ({selected.size})
                </button>
                <ExportMenu records={filtered.filter(r => selected.has(r.id))} selectedCount={selected.size} />
              </>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={32} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <CallTable
            records={filtered}
            selected={selected}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onDeleteOne={handleDeleteOne}
            onUpdateTags={handleUpdateTags}
            onUpdateLabel={updateLabel}
            onUpdateLabelForAll={updateLabelForAll}
          />
        )}
      </main>

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          count={deleteTarget.length}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
