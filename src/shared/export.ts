import type { CallRecord } from './types'

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function exportAsJSON(records: CallRecord[]) {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `meet-trace-export-${Date.now()}.json`)
}

export function exportAsCSV(records: CallRecord[]) {
  const headers = ['ID', 'Meeting ID', 'Meeting Label', 'Started At', 'Ended At', 'Duration', 'Tags', 'Notes', 'Transcript']
  const rows = records.map(r => [
    r.id,
    r.meetingId,
    r.meetingLabel || '',
    formatDate(r.startedAt),
    formatDate(r.endedAt),
    formatDuration(r.duration),
    r.tags.join(';'),
    (r.notes ?? '').replace(/\n/g, ' '),
    r.transcript.replace(/\n/g, ' ↵ ')
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `meet-trace-export-${Date.now()}.csv`)
}

export function exportAsTXT(records: CallRecord[]) {
  const sections = records.map(r => [
    `=== Meeting: ${r.meetingLabel || r.meetingId} ===`,
    `Date:     ${formatDate(r.startedAt)}`,
    `Duration: ${formatDuration(r.duration)}`,
    `Tags:     ${r.tags.join(', ') || '—'}`,
    r.notes ? `Notes:    ${r.notes}` : null,
    '',
    r.transcript,
    ''
  ].filter(l => l !== null).join('\n'))
  const blob = new Blob([sections.join('\n' + '-'.repeat(60) + '\n\n')], { type: 'text/plain' })
  downloadBlob(blob, `meet-trace-export-${Date.now()}.txt`)
}

export function exportSingleAsJSON(record: CallRecord) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
  const filename = `${record.meetingLabel || record.meetingId}-${formatDate(record.startedAt).replace(/[/:]/g, '-')}.json`
  downloadBlob(blob, filename)
}

export function exportSingleAsCSV(record: CallRecord) {
  const headers = ['ID', 'Meeting ID', 'Meeting Label', 'Started At', 'Ended At', 'Duration', 'Tags', 'Notes', 'Transcript']
  const row = [
    record.id,
    record.meetingId,
    record.meetingLabel || '',
    formatDate(record.startedAt),
    formatDate(record.endedAt),
    formatDuration(record.duration),
    record.tags.join(';'),
    (record.notes ?? '').replace(/\n/g, ' '),
    record.transcript.replace(/\n/g, ' ↵ ')
  ]
  const csv = [headers, row]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const filename = `${record.meetingLabel || record.meetingId}-${formatDate(record.startedAt).replace(/[/:]/g, '-')}.csv`
  downloadBlob(blob, filename)
}

export function exportSingleAsTXT(record: CallRecord) {
  const content = [
    `=== Meeting: ${record.meetingLabel || record.meetingId} ===`,
    `Date:     ${formatDate(record.startedAt)}`,
    `Duration: ${formatDuration(record.duration)}`,
    `Tags:     ${record.tags.join(', ') || '—'}`,
    record.notes ? `Notes:    ${record.notes}` : null,
    '',
    record.transcript
  ].filter(l => l !== null).join('\n')
  const blob = new Blob([content], { type: 'text/plain' })
  const filename = `${record.meetingLabel || record.meetingId}-${formatDate(record.startedAt).replace(/[/:]/g, '-')}.txt`
  downloadBlob(blob, filename)
}
