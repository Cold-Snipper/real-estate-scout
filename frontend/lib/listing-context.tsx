"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { type Listing, type ListingStatus } from "@/lib/listings-data"
import { createClient } from "@/lib/supabase/client"
import { FRESH_LISTINGS_MAX_HOURS } from "@/lib/config"

interface ListingContextValue {
  listings: Listing[]
  loading: boolean
  freshMaxHours: number
  updateStatus: (id: string, status: ListingStatus) => void
}

const ListingContext = createContext<ListingContextValue | null>(null)

export function ListingProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [freshMaxHours, setFreshMaxHours] = useState(FRESH_LISTINGS_MAX_HOURS)

  // 1. Read user's preferred cutoff from Supabase user_metadata
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.fresh_max_hours) {
        setFreshMaxHours(Number(user.user_metadata.fresh_max_hours))
      }
    })
  }, [])

  // 2. Fetch listings once freshMaxHours is known
  useEffect(() => {
    fetch(`/api/listings/fresh?max_hours=${freshMaxHours}`)
      .then((r) => r.json())
      .then((data) => setListings(data.listings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [freshMaxHours])

  // 3. SSE — real-time new listings from Redis stream
  useEffect(() => {
    const source = new EventSource("/api/listings/stream")

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.operation !== "insert") return
        if (data.transaction_type !== "buy") return

        const newListing: Listing = {
          id: data.listing_id,
          listing_ref: data.listing_id,
          photo: data.image_urls?.[0] ?? null,
          address: data.location ?? "",
          location: data.location ?? "",
          price: data.sale_price ?? data.rent_price ?? 0,
          beds: data.bedrooms ?? 0,
          sqm: data.surface_m2 ?? 0,
          airbnbScore: null,
          aiBreakdown: [],
          daysOnMarket: 0,
          status: "New",
          source: data.source ?? "",
          listing_url: data.listing_url ?? null,
          transaction_type: data.transaction_type ?? "",
        }

        setListings((prev) => {
          if (prev.some((l) => l.id === newListing.id)) return prev
          return [newListing, ...prev]
        })
      } catch {
        // ignore parse errors
      }
    }

    return () => source.close()
  }, [])

  const updateStatus = useCallback(
    async (id: string, status: ListingStatus) => {
      // Optimistic update
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))

      const listing = listings.find((l) => l.id === id)
      const ref = listing?.listing_ref ?? id

      try {
        await fetch(`/api/pipeline/${encodeURIComponent(ref)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      } catch (err) {
        console.error("Failed to persist status update:", err)
      }
    },
    [listings]
  )

  return (
    <ListingContext.Provider value={{ listings, loading, freshMaxHours, updateStatus }}>
      {children}
    </ListingContext.Provider>
  )
}

export function useListings() {
  const ctx = useContext(ListingContext)
  if (!ctx) throw new Error("useListings must be used inside ListingProvider")
  return ctx
}
