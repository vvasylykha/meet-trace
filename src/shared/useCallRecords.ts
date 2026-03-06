import { useState, useEffect, useCallback } from 'react'
import { getAllRecords, saveRecord, updateRecord, deleteRecord, deleteRecords, updateRecordLabel, updateAllRecordsWithMeetingId, getMeetingLabel, getMostPopularLabelForMeetingId } from '../db/db'
import type { CallRecord } from './types'

async function drainPendingQueue(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, async (allItems) => {
      const pendingKeys: string[] = []
      const records: CallRecord[] = []
      
      for (const [key, value] of Object.entries(allItems)) {
        if (key.startsWith('pendingRecord_')) {
          pendingKeys.push(key)
          records.push(value as CallRecord)
        }
      }
      
      if (records.length === 0) { resolve(); return }
      
      try {
        for (const record of records) {
          if (!record.meetingLabel) {
            const popularLabel = await getMostPopularLabelForMeetingId(record.meetingId)
            if (popularLabel) {
              record.meetingLabel = popularLabel
            }
          }
          await saveRecord(record)
        }
        await new Promise<void>(res => chrome.storage.local.remove(pendingKeys, res))
      } catch (e) {
        console.warn('[useCallRecords] drainPendingQueue error', e)
      }
      resolve()
    })
  })
}

export function useCallRecords() {
  const [records, setRecords] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      await drainPendingQueue()
      const all = await getAllRecords()
      setRecords(all)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    function handleStorageChange(changes: { [key: string]: chrome.storage.StorageChange }, area: string) {
      if (area === 'local' && 'pendingCallRecords' in changes) {
        const newVal = changes['pendingCallRecords'].newValue
        if (Array.isArray(newVal) && newVal.length > 0) reload()
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [reload])

  const updateTags = useCallback(async (id: string, tags: string[]) => {
    const record = records.find(r => r.id === id)
    if (!record) return
    const updated = { ...record, tags }
    await updateRecord(updated)
    setRecords(prev => prev.map(r => r.id === id ? updated : r))
  }, [records])

  const updateNotes = useCallback(async (id: string, notes: string) => {
    const record = records.find(r => r.id === id)
    if (!record) return
    const updated = { ...record, notes }
    await updateRecord(updated)
    setRecords(prev => prev.map(r => r.id === id ? updated : r))
  }, [records])

  const removeOne = useCallback(async (id: string) => {
    await deleteRecord(id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  const removeMany = useCallback(async (ids: string[]) => {
    await deleteRecords(ids)
    setRecords(prev => prev.filter(r => !ids.includes(r.id)))
  }, [])

  const updateLabel = useCallback(async (id: string, label: string) => {
    await updateRecordLabel(id, label)
    setRecords(prev => prev.map(r => r.id === id ? { ...r, meetingLabel: label } : r))
  }, [])

  const updateLabelForAll = useCallback(async (meetingId: string, label: string) => {
    await updateAllRecordsWithMeetingId(meetingId, label)
    setRecords(prev => prev.map(r => r.meetingId === meetingId ? { ...r, meetingLabel: label } : r))
  }, [])

  return { records, loading, reload, updateTags, updateNotes, removeOne, removeMany, updateLabel, updateLabelForAll }
}
