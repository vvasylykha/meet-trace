import React from 'react'
import { Search, X } from 'lucide-react'

interface FilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  tagFilter: string
  onTagFilterChange: (v: string) => void
  dateFrom: string
  onDateFromChange: (v: string) => void
  dateTo: string
  onDateToChange: (v: string) => void
  allTags: string[]
  onClear: () => void
}

export default function FilterBar({
  search, onSearchChange,
  tagFilter, onTagFilterChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  allTags,
  onClear
}: FilterBarProps) {
  const hasFilters = search || tagFilter || dateFrom || dateTo

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Text search */}
      <div className="relative flex-1 min-w-48">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search transcript or meeting ID…"
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tag filter */}
      <select
        value={tagFilter}
        onChange={e => onTagFilterChange(e.target.value)}
        className="py-2 pl-2 pr-6 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="">All tags</option>
        {allTags.map(tag => (
          <option key={tag} value={tag}>{tag}</option>
        ))}
      </select>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={dateFrom}
          onChange={e => onDateFromChange(e.target.value)}
          className="py-2 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="From date"
        />
        <span className="text-gray-400 text-sm">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => onDateToChange(e.target.value)}
          className="py-2 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="To date"
        />
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <X size={14} />
          Clear
        </button>
      )}
    </div>
  )
}
