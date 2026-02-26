/**
 * B2C API layer — connected to same data as B2B (lib/available-listings-data via /api/listings).
 * Falls back to local mock if API fails.
 */

import { type Listing } from "./listings-data"
import { listings as mockListings } from "./listings-data"
import type { AvailableListing } from "@/lib/available-listings-data"
import { mapToB2CFeedItem } from "./b2c-listings-adapter"

export interface B2CFeedItem extends Listing {
  matchPct?: number
  whyFits?: string
}

export interface B2CPreferences {
  rentOrBuy: "rent" | "buy"
  budgetMin: number
  budgetMax: number
  moveInDate?: string
  bedrooms?: number
  sqmMin?: number
  sqmMax?: number
  parking: boolean
  balcony: boolean
  elevator: boolean
  pets: boolean
  furnished?: boolean
  energyClass?: string
  energyClassMinC?: boolean
  constructionYearMin?: number
  maxMonthlyCharges?: number
  propertyTypes?: string[]
  communes?: string[]
  locationFreeText?: string
  voiceNoteText?: string
  voiceContext?: string
  communicationMode: "manual" | "bot_assisted" | "full_auto"
}

export const PROPERTY_TYPES = ["Apartment", "House", "Studio", "Duplex", "Penthouse", "Loft"] as const

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Fetch feed from shared listings API (same DB as B2B). Falls back to mock if API fails. */
export async function getFeed(_userId?: string, _prefs?: Partial<B2CPreferences>): Promise<B2CFeedItem[]> {
  await delay(600) // "Loading personalised matches…"
  try {
    const res = await fetch("/api/listings")
    if (!res.ok) throw new Error("API error")
    const data: AvailableListing[] = await res.json()
    return data.slice(0, 12).map((l, i) => mapToB2CFeedItem(l, i, 92 - i * 3 + Math.floor(Math.random() * 6)))
  } catch {
    return mockListings.slice(0, 12).map((l, i) => ({
      ...l,
      matchPct: 92 - i * 3 + Math.floor(Math.random() * 6),
      whyFits: [
        "Matches your budget and preferred area.",
        "Quiet area, close to cafés and transport.",
        "Good size for your requirements, recently renovated.",
        "Walking distance to Kirchberg, pet-friendly.",
      ][i % 4],
    }))
  }
}

export async function getProperty(id: string): Promise<B2CFeedItem | null> {
  await delay(200)
  try {
    const res = await fetch("/api/listings")
    if (!res.ok) throw new Error("API error")
    const data: AvailableListing[] = await res.json()
    const found = data.find((l) => l.id === id)
    return found ? mapToB2CFeedItem(found, 0) : null
  } catch {
    const l = mockListings.find((x) => x.id === id)
    return l ? { ...l, matchPct: 85, whyFits: "Saved from Discover." } : null
  }
}

export async function getSaved(): Promise<B2CFeedItem[]> {
  await delay(300)
  return mockListings.filter((l) => l.status !== "New" && l.status !== "Passed").map((l) => ({
    ...l,
    matchPct: 85,
    whyFits: "Saved from Discover.",
  }))
}

const IGNORED_ALERTS_KEY = "b2c_ignored_alerts"

function getIgnoredAlerts(): string[] {
  if (typeof window === "undefined") return []
  try {
    const s = sessionStorage.getItem(IGNORED_ALERTS_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  return []
}

export function ignoreAlert(id: string): void {
  const list = [...getIgnoredAlerts(), id]
  if (typeof window !== "undefined") sessionStorage.setItem(IGNORED_ALERTS_KEY, JSON.stringify(list))
}

export async function getAlerts(): Promise<B2CFeedItem[]> {
  await delay(300)
  const ignored = typeof window !== "undefined" ? getIgnoredAlerts() : []
  try {
    const res = await fetch("/api/listings")
    if (!res.ok) throw new Error("API error")
    const data: AvailableListing[] = await res.json()
    return data
      .filter((l) => l.daysAvailable <= 14 && !ignored.includes(l.id))
      .slice(0, 6)
      .map((l, i) => mapToB2CFeedItem(l, i, 90 + Math.floor(Math.random() * 10)))
  } catch {
    return mockListings
      .filter((l) => l.daysOnMarket <= 3 && !ignored.includes(l.id))
      .map((l) => ({
        ...l,
        matchPct: 90 + Math.floor(Math.random() * 10),
        whyFits: "New listing that matches your preferences.",
      }))
  }
}

function getB2CUserId(): string {
  if (typeof window === "undefined") return "anonymous"
  let id = sessionStorage.getItem("b2c_user_id")
  if (!id) {
    id = `b2c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem("b2c_user_id", id)
  }
  return id
}

export async function savePreferences(prefs: B2CPreferences): Promise<void> {
  try {
    const res = await fetch("/api/b2c/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-b2c-user-id": getB2CUserId(),
      },
      body: JSON.stringify(prefs),
    })
    if (!res.ok) throw new Error("Save failed") // 404 = stub
  } catch {
    // Stub: API not implemented, store in sessionStorage for demo
    if (typeof window !== "undefined") {
      sessionStorage.setItem("b2c_preferences", JSON.stringify(prefs))
    }
  }
  await delay(500)
}

export type ContactGoal = "book_call" | "book_viewing" | "request_info"

export async function draftBotMessage(
  listingId: string,
  _userId?: string,
  contactGoal?: ContactGoal,
  userProfile?: { name?: string; tone?: string }
): Promise<string> {
  await delay(300)
  let address = ""
  try {
    const res = await fetch("/api/listings")
    if (res.ok) {
      const data: AvailableListing[] = await res.json()
      const found = data.find((l) => l.id === listingId)
      if (found) address = found.address
    }
  } catch {}
  if (!address) {
    const m = mockListings.find((l) => l.id === listingId)
    address = m?.address ?? ""
  }
  if (!address) return "Hi, I'm interested in this property. Could you tell me more?"

  try {
    const res = await fetch("/api/b2c/draft-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        listingAddress: address,
        contactGoal: contactGoal ?? "book_viewing",
        userProfile: userProfile ?? {},
      }),
    })
    if (res.ok) {
      const data = (await res.json()) as { message?: string }
      if (data.message?.trim()) return data.message
    }
  } catch {}

  const goalPhrase =
    contactGoal === "book_call"
      ? "schedule a call to discuss"
      : contactGoal === "book_viewing"
        ? "arrange a viewing"
        : "get more information about"
  return `Hi, I'm interested in ${address} and would like to ${goalPhrase}. Could you let me know availability and next steps?`
}
