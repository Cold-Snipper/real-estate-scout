"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { ListingFilters } from "./listing-filters"
import { ListingTable } from "./listing-table"
import { ListingDrawer } from "./listing-drawer"
import { useListings } from "../lib/listing-context"
import { type Listing } from "../lib/listings-data"

interface Filters {
  locations: string[]
  minScore: number
  bedrooms: string
  sqmMin: string
  sqmMax: string
  priceMin: string
  priceMax: string
  status: string
}

const defaultFilters: Filters = {
  locations: [],
  minScore: 6,
  bedrooms: "any",
  sqmMin: "",
  sqmMax: "",
  priceMin: "",
  priceMax: "",
  status: "All",
}

export function B2CDashboard() {
  const { listings: listingData, updateStatus } = useListings()
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const newTodayCount = listingData.filter(
    (l) => l.status === "New" && l.daysOnMarket <= 3
  ).length

  const filteredListings = useMemo(() => {
    return listingData.filter((listing) => {
      if (filters.locations.length > 0 && !filters.locations.includes(listing.location)) {
        return false
      }
      if (listing.airbnbScore < filters.minScore) return false
      if (filters.bedrooms !== "any" && listing.beds < Number(filters.bedrooms)) return false
      if (filters.sqmMin && listing.sqm < Number(filters.sqmMin)) return false
      if (filters.sqmMax && listing.sqm > Number(filters.sqmMax)) return false
      if (filters.priceMin && listing.price < Number(filters.priceMin)) return false
      if (filters.priceMax && listing.price > Number(filters.priceMax)) return false
      if (filters.status !== "All" && listing.status !== filters.status) return false
      return true
    })
  }, [listingData, filters])

  const handleStatusChange = (id: string, status: Listing["status"]) => {
    updateStatus(id, status)
    if (selectedListing?.id === id) {
      setSelectedListing((prev) => (prev ? { ...prev, status } : null))
    }
  }

  const handleRowClick = (listing: Listing) => {
    setSelectedListing(listing)
    setDrawerOpen(true)
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-card px-8 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Your feed
          </h1>
          {newTodayCount > 0 && (
            <Badge className="bg-primary text-primary-foreground text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              New today: {newTodayCount}
            </Badge>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-5">
          <ListingFilters
            filters={filters}
            onFiltersChange={setFilters}
            matchCount={filteredListings.length}
          />
          <ListingTable
            listings={filteredListings}
            onRowClick={handleRowClick}
            onStatusChange={handleStatusChange}
            selectedId={selectedListing?.id}
          />
        </div>
      </div>

      <ListingDrawer
        listing={selectedListing}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusChange={handleStatusChange}
      />
    </>
  )
}
