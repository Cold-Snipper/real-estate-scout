/**
 * B2C user data persistence — MongoDB when MONGO_URI set, else in-memory fallback.
 */

import { getB2CCollection } from "./mongodb"

// ── Types (aligned with B2C spec) ─────────────────────────────────────────────

export type CommunicationMode = "manual" | "bot_assisted" | "full_auto"

export interface B2CProfileData {
  name: string
  email: string
  phone: string
  whatsapp: string
  preferredMoveDate?: string
  employer?: string
  nationality?: string
  notes?: string
}

export interface B2CStructuredFilters {
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
  availabilityDate?: string
  floorLevel?: string
  outdoorSpace?: boolean
  distanceRadius?: number
}

export interface B2CControls {
  communicationMode: CommunicationMode
  earlyWarnings: boolean
  botConfirmBeforeSend: boolean
  alertChannels?: ("in_app" | "email" | "push")[]
  alertMatchThreshold?: 70 | 80 | 90 | 95
  alertFrequency?: "immediate" | "daily_digest"
}

export interface B2CUserDocument {
  _id?: unknown
  userId: string
  profile: B2CProfileData
  filters: B2CStructuredFilters
  voiceContext: string
  controls: B2CControls
  createdAt: string
  updatedAt: string
}

const defaultProfile: B2CProfileData = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
}

const defaultFilters: B2CStructuredFilters = {
  rentOrBuy: "rent",
  budgetMin: 500,
  budgetMax: 2000,
  parking: false,
  balcony: false,
  elevator: false,
  pets: false,
}

const defaultControls: B2CControls = {
  communicationMode: "manual",
  earlyWarnings: true,
  botConfirmBeforeSend: true,
  alertChannels: ["in_app"],
  alertMatchThreshold: 80,
  alertFrequency: "immediate",
}

// In-memory fallback when MongoDB not configured
const _memoryStore = new Map<string, B2CUserDocument>()

function toStore(doc: Partial<B2CUserDocument> & { userId: string }): B2CUserDocument {
  const now = new Date().toISOString()
  return {
    userId: doc.userId,
    profile: { ...defaultProfile, ...doc.profile },
    filters: { ...defaultFilters, ...doc.filters },
    voiceContext: doc.voiceContext ?? "",
    controls: { ...defaultControls, ...doc.controls },
    createdAt: doc.createdAt ?? now,
    updatedAt: now,
  }
}

export async function getB2CUser(userId: string): Promise<B2CUserDocument | null> {
  const coll = await getB2CCollection()
  if (coll) {
    const doc = await coll.findOne({ userId })
    if (doc) {
      return {
        userId: doc.userId,
        profile: { ...defaultProfile, ...doc.profile },
        filters: { ...defaultFilters, ...doc.filters },
        voiceContext: doc.voiceContext ?? "",
        controls: { ...defaultControls, ...doc.controls },
        createdAt: doc.createdAt ?? new Date().toISOString(),
        updatedAt: doc.updatedAt ?? new Date().toISOString(),
      }
    }
    return null
  }
  return _memoryStore.get(userId) ?? null
}

export async function upsertB2CUser(
  userId: string,
  update: Partial<Omit<B2CUserDocument, "userId" | "createdAt">>
): Promise<B2CUserDocument> {
  const now = new Date().toISOString()
  const existing = await getB2CUser(userId)
  const merged: B2CUserDocument = {
    userId,
    profile: { ...(existing?.profile ?? defaultProfile), ...update.profile },
    filters: { ...(existing?.filters ?? defaultFilters), ...update.filters },
    voiceContext: update.voiceContext ?? existing?.voiceContext ?? "",
    controls: { ...(existing?.controls ?? defaultControls), ...update.controls },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  const coll = await getB2CCollection()
  if (coll) {
    await coll.updateOne(
      { userId },
      {
        $set: {
          ...merged,
          updatedAt: now,
        },
      },
      { upsert: true }
    )
  } else {
    _memoryStore.set(userId, merged)
  }
  return merged
}
