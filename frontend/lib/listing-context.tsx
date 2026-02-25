"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { listings as initialListings, type Listing, type ListingStatus } from "@/lib/listings-data"

interface ListingContextValue {
  listings: Listing[]
  updateStatus: (id: string, status: ListingStatus) => void
}

const ListingContext = createContext<ListingContextValue | null>(null)

export function ListingProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>(initialListings)

  const updateStatus = (id: string, status: ListingStatus) => {
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    )
  }

  return (
    <ListingContext.Provider value={{ listings, updateStatus }}>
      {children}
    </ListingContext.Provider>
  )
}

export function useListings() {
  const ctx = useContext(ListingContext)
  if (!ctx) throw new Error("useListings must be used inside ListingProvider")
  return ctx
}
