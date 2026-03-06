export interface CallRecord {
  id: string
  meetingId: string
  meetingLabel?: string
  startedAt: number
  endedAt: number
  duration: number
  transcript: string
  tags: string[]
  notes: string
}

export interface MeetingLabel {
  meetingId: string
  label: string
}
