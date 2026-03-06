import { openDB, IDBPDatabase } from 'idb'
import type { CallRecord, MeetingLabel } from '../shared/types'

const DB_NAME = 'MeetTraceDB'
const DB_VERSION = 2
const STORE = 'callRecords'
const LABELS_STORE = 'meetingLabels'

interface MeetTraceDB extends IDBPDatabase {
  callRecords: {
    key: string
    value: CallRecord
    indexes: { startedAt: number; meetingId: number }
  }
  meetingLabels: {
    key: string
    value: MeetingLabel
  }
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('startedAt', 'startedAt')
          store.createIndex('meetingId', 'meetingId')
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains(LABELS_STORE)) {
          db.createObjectStore(LABELS_STORE, { keyPath: 'meetingId' })
        }
      }
    })
  }
  return dbPromise
}

export async function saveRecord(record: CallRecord): Promise<void> {
  const db = await getDb()
  await db.put(STORE, record)
}

export async function getAllRecords(): Promise<CallRecord[]> {
  const db = await getDb()
  const all = await db.getAll(STORE)
  return (all as CallRecord[]).sort((a, b) => b.startedAt - a.startedAt)
}

export async function getRecord(id: string): Promise<CallRecord | undefined> {
  const db = await getDb()
  return (await db.get(STORE, id)) as CallRecord | undefined
}

export async function updateRecord(record: CallRecord): Promise<void> {
  const db = await getDb()
  await db.put(STORE, record)
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}

export async function deleteRecords(ids: string[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(STORE, 'readwrite')
  await Promise.all(ids.map(id => tx.store.delete(id)))
  await tx.done
}

export async function exportAllRecords(): Promise<CallRecord[]> {
  return getAllRecords()
}

export async function getMeetingLabel(meetingId: string): Promise<string | undefined> {
  const db = await getDb()
  const label = await db.get(LABELS_STORE, meetingId) as MeetingLabel | undefined
  return label?.label
}

export async function setMeetingLabel(meetingId: string, label: string): Promise<void> {
  const db = await getDb()
  await db.put(LABELS_STORE, { meetingId, label })
}

export async function deleteMeetingLabel(meetingId: string): Promise<void> {
  const db = await getDb()
  await db.delete(LABELS_STORE, meetingId)
}

export async function updateRecordLabel(recordId: string, label: string): Promise<void> {
  const db = await getDb()
  const record = await db.get(STORE, recordId) as CallRecord | undefined
  if (record) {
    record.meetingLabel = label
    await db.put(STORE, record)
  }
}

export async function updateAllRecordsWithMeetingId(meetingId: string, label: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(STORE, 'readwrite')
  const index = tx.store.index('meetingId')
  let cursor = await index.openCursor(IDBKeyRange.only(meetingId))
  
  while (cursor) {
    const record = cursor.value as CallRecord
    record.meetingLabel = label
    await cursor.update(record)
    cursor = await cursor.continue()
  }
  
  await tx.done
  await setMeetingLabel(meetingId, label)
}

export async function getMostPopularLabelForMeetingId(meetingId: string): Promise<string | undefined> {
  const db = await getDb()
  const tx = db.transaction(STORE, 'readonly')
  const index = tx.store.index('meetingId')
  let cursor = await index.openCursor(IDBKeyRange.only(meetingId))
  
  const labelCounts = new Map<string, number>()
  
  while (cursor) {
    const record = cursor.value as CallRecord
    if (record.meetingLabel) {
      labelCounts.set(record.meetingLabel, (labelCounts.get(record.meetingLabel) || 0) + 1)
    }
    cursor = await cursor.continue()
  }
  
  await tx.done
  
  if (labelCounts.size === 0) return undefined
  
  let mostPopular = ''
  let maxCount = 0
  
  for (const [label, count] of labelCounts.entries()) {
    if (count > maxCount) {
      maxCount = count
      mostPopular = label
    }
  }
  
  return mostPopular || undefined
}
