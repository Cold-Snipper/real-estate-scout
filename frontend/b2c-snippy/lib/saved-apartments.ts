/**
 * B2C Saved Apartments — full pipeline, notes, conversation log, timeline.
 * Stored in sessionStorage; replace with API when backend is ready.
 */

import type { B2CFeedItem, ContactGoal } from "./b2c-api"

export type { ContactGoal }
export type SavedApartmentStatus =
  | "Interested"
  | "Contacted"
  | "Viewing Scheduled"
  | "Offer Submitted"
  | "Rejected"
  | "Closed"

export interface ConversationEntry {
  id: string
  role: "user" | "agent" | "bot"
  text: string
  at: string
}

export interface TimelineEntry {
  id: string
  type: "status" | "note" | "contact" | "viewing" | "offer"
  label: string
  detail?: string
  at: string
}

export interface SavedApartment extends B2CFeedItem {
  savedStatus: SavedApartmentStatus
  contactGoal?: ContactGoal
  botOutreach?: boolean
  notes: string
  conversationLog: ConversationEntry[]
  timeline: TimelineEntry[]
  savedAt: string
}

const STORAGE_KEY = "b2c_saved_apartments"

function load(): SavedApartment[] {
  if (typeof window === "undefined") return []
  try {
    const s = sessionStorage.getItem(STORAGE_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  return []
}

export function getSavedApartments(): SavedApartment[] {
  return load()
}

export function saveApartment(
  item: B2CFeedItem,
  opts: {
    savedStatus?: SavedApartmentStatus
    contactGoal?: ContactGoal
    botOutreach?: boolean
  } = {}
): SavedApartment {
  const list = load()
  const existing = list.find((x) => x.id === item.id)
  const now = new Date().toISOString()

  const entry: SavedApartment = existing ?? {
    ...item,
    savedStatus: "Interested",
    notes: "",
    conversationLog: [],
    timeline: [],
    savedAt: now,
  }

  const merged: SavedApartment = {
    ...entry,
    ...opts,
    savedStatus: opts.savedStatus ?? entry.savedStatus,
  }

  if (!existing) {
    merged.timeline = [
      { id: crypto.randomUUID(), type: "status", label: "Saved", detail: "Added from Discover", at: now },
    ]
  }

  const next = existing ? list.map((x) => (x.id === item.id ? merged : x)) : [merged, ...list]
  if (typeof window !== "undefined") sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return merged
}

export function updateSavedApartment(
  id: string,
  update: Partial<{
    savedStatus: SavedApartmentStatus
    notes: string
    conversationLog: ConversationEntry[]
    timeline: TimelineEntry[]
  }>
): void {
  const list = load()
  const idx = list.findIndex((x) => x.id === id)
  if (idx < 0) return
  const next = [...list]
  next[idx] = { ...next[idx], ...update }
  if (typeof window !== "undefined") sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function addTimelineEntry(id: string, entry: Omit<TimelineEntry, "id" | "at">): void {
  const list = load()
  const idx = list.findIndex((x) => x.id === id)
  if (idx < 0) return
  const now = new Date().toISOString()
  const newEntry: TimelineEntry = { ...entry, id: crypto.randomUUID(), at: now }
  const next = [...list]
  next[idx] = { ...next[idx], timeline: [...next[idx].timeline, newEntry] }
  if (typeof window !== "undefined") sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function removeSavedApartment(id: string): void {
  const list = load().filter((x) => x.id !== id)
  if (typeof window !== "undefined") sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export const SAVED_STATUS_OPTIONS: { value: SavedApartmentStatus; label: string }[] = [
  { value: "Interested", label: "Interested" },
  { value: "Contacted", label: "Contacted" },
  { value: "Viewing Scheduled", label: "Viewing Scheduled" },
  { value: "Offer Submitted", label: "Offer Submitted" },
  { value: "Rejected", label: "Rejected" },
  { value: "Closed", label: "Closed" },
]
