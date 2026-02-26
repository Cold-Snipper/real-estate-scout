"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { loadB2CUser, saveB2CUser } from "./b2c-api-client"

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

export type AlertChannel = "in_app" | "email" | "push"
export type MatchThreshold = 70 | 80 | 90 | 95
export type AlertFrequency = "immediate" | "daily_digest"

export interface B2CControls {
  communicationMode: CommunicationMode
  earlyWarnings: boolean
  botConfirmBeforeSend: boolean
  /** How to be notified. Default: in_app only. */
  alertChannels?: AlertChannel[]
  /** Only alert when match score is at least this. Default 85. */
  alertMatchThreshold?: MatchThreshold
  /** When to send. Default: immediate. */
  alertFrequency?: AlertFrequency
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

const STORAGE_KEY = "b2c_user"
const CONTROLS_KEY = "b2c_controls"
const FILTERS_KEY = "b2c_filters"

function loadFromStorage(): {
  profile: B2CProfileData
  filters: B2CStructuredFilters
  controls: B2CControls
} {
  if (typeof window === "undefined")
    return {
      profile: defaultProfile,
      filters: defaultFilters,
      controls: defaultControls,
    }
  try {
    const profile = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}")
    const filters = JSON.parse(sessionStorage.getItem(FILTERS_KEY) || "{}")
    const controls = JSON.parse(sessionStorage.getItem(CONTROLS_KEY) || "{}")
    return {
      profile: { ...defaultProfile, ...profile },
      filters: { ...defaultFilters, ...filters },
      controls: { ...defaultControls, ...controls },
    }
  } catch {
    return {
      profile: defaultProfile,
      filters: defaultFilters,
      controls: defaultControls,
    }
  }
}

interface B2CUserContextValue {
  profile: B2CProfileData
  filters: B2CStructuredFilters
  controls: B2CControls
  voiceContext: string
  setProfile: (p: Partial<B2CProfileData>) => void
  setFilters: (f: Partial<B2CStructuredFilters>) => void
  setControls: (c: Partial<B2CControls>) => void
  setVoiceContext: (v: string) => void
  persistProfile: (p?: B2CProfileData) => Promise<void>
  persistFilters: (f?: B2CStructuredFilters) => Promise<void>
  persistControls: (c?: B2CControls) => Promise<void>
  persistVoiceContext: (v?: string) => Promise<void>
}

const B2CUserContext = createContext<B2CUserContextValue | null>(null)

export function B2CUserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<B2CProfileData>(defaultProfile)
  const [filters, setFiltersState] = useState<B2CStructuredFilters>(defaultFilters)
  const [controls, setControlsState] = useState<B2CControls>(defaultControls)
  const [voiceContext, setVoiceContextState] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = loadFromStorage()
    setProfileState(stored.profile)
    setFiltersState(stored.filters)
    setControlsState(stored.controls)
    setVoiceContextState(
      typeof window !== "undefined"
        ? JSON.parse(sessionStorage.getItem("b2c_preferences") || "{}").voiceNoteText ??
          JSON.parse(sessionStorage.getItem("b2c_preferences") || "{}").voiceContext ??
          ""
        : ""
    )
    loadB2CUser()
      .then((data) => {
        if (data.profile) setProfileState({ ...defaultProfile, ...data.profile })
        if (data.filters) setFiltersState({ ...defaultFilters, ...data.filters })
        if (data.controls) setControlsState({ ...defaultControls, ...data.controls })
        if (data.voiceContext) setVoiceContextState(data.voiceContext)
        if (data.profile && typeof window !== "undefined")
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultProfile, ...data.profile }))
        if (data.filters && typeof window !== "undefined")
          sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ ...defaultFilters, ...data.filters }))
        if (data.controls && typeof window !== "undefined")
          sessionStorage.setItem(CONTROLS_KEY, JSON.stringify({ ...defaultControls, ...data.controls }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const setProfile = useCallback((p: Partial<B2CProfileData>) => {
    setProfileState((prev) => ({ ...prev, ...p }))
  }, [])

  const setFilters = useCallback((f: Partial<B2CStructuredFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...f }))
  }, [])

  const setControls = useCallback((c: Partial<B2CControls>) => {
    setControlsState((prev) => ({ ...prev, ...c }))
  }, [])

  const setVoiceContext = useCallback((v: string) => {
    setVoiceContextState(v)
  }, [])

  const persistProfile = useCallback(async (p?: B2CProfileData) => {
    const toSave = p ?? profile
    setProfileState(toSave)
    if (typeof window !== "undefined") sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    try {
      await saveB2CUser({ profile: toSave })
    } catch {}
  }, [profile])

  const persistFilters = useCallback(async (f?: B2CStructuredFilters) => {
    const toSave = f ?? filters
    setFiltersState(toSave)
    if (typeof window !== "undefined") sessionStorage.setItem(FILTERS_KEY, JSON.stringify(toSave))
    try {
      await saveB2CUser({ filters: toSave })
    } catch {}
  }, [filters])

  const persistControls = useCallback(async (c?: B2CControls) => {
    const toSave = c ?? controls
    setControlsState(toSave)
    if (typeof window !== "undefined") sessionStorage.setItem(CONTROLS_KEY, JSON.stringify(toSave))
    try {
      await saveB2CUser({ controls: toSave })
    } catch {}
  }, [controls])

  const persistVoiceContext = useCallback(async (v?: string) => {
    const toSave = v ?? voiceContext
    setVoiceContextState(toSave)
    if (typeof window !== "undefined") {
      const prefs = JSON.parse(sessionStorage.getItem("b2c_preferences") || "{}")
      prefs.voiceNoteText = toSave
      prefs.voiceContext = toSave
      sessionStorage.setItem("b2c_preferences", JSON.stringify(prefs))
    }
    try {
      await saveB2CUser({ voiceContext: toSave })
    } catch {}
  }, [voiceContext])

  const value: B2CUserContextValue = {
    profile,
    filters,
    controls,
    voiceContext,
    setProfile,
    setFilters,
    setControls,
    setVoiceContext,
    persistProfile,
    persistFilters,
    persistControls,
    persistVoiceContext,
  }

  return <B2CUserContext.Provider value={value}>{children}</B2CUserContext.Provider>
}

export function useB2CUser() {
  const ctx = useContext(B2CUserContext)
  if (!ctx) throw new Error("useB2CUser must be used inside B2CUserProvider")
  return ctx
}
