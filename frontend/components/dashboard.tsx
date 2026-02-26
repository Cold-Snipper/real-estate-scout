"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// Loaded client-only: Radix Select generates IDs that differ between SSR and CSR
const ListingFilters = dynamic(
  () => import("@/components/listing-filters").then((m) => ({ default: m.ListingFilters })),
  { ssr: false }
)
import { ListingTable } from "@/components/listing-table"
import { ListingDrawer } from "@/components/listing-drawer"
import { useListings } from "@/lib/listing-context"
import { type Listing } from "@/lib/listings-data"
import { PAGE_SIZE } from "@/lib/config"

interface Filters {
  locationQuery: string
  minScore: number
  bedrooms: string
  sqmMin: string
  sqmMax: string
  priceMin: string
  priceMax: string
  status: string
}

const defaultFilters: Filters = {
  locationQuery: "",
  minScore: 0,
  bedrooms: "any",
  sqmMin: "",
  sqmMax: "",
  priceMin: "",
  priceMax: "",
  status: "All",
}

export function Dashboard() {
  const { listings: listingData, loading, updateStatus, freshMaxHours } = useListings()
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [page, setPage] = useState(0)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const saveFiltersRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Load saved filters from DB on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences?.fresh_filters) {
          setFilters({ ...defaultFilters, ...data.preferences.fresh_filters })
        }
      })
      .catch(console.error)
  }, [])

  // Reset to first page when filters change
  const prevFiltersRef = useRef(filters)
  useEffect(() => {
    if (prevFiltersRef.current !== filters) {
      setPage(0)
      prevFiltersRef.current = filters
    }
  }, [filters])

  const handleFiltersChange = (f: Filters) => {
    setFilters(f)
    clearTimeout(saveFiltersRef.current)
    saveFiltersRef.current = setTimeout(() => {
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { fresh_filters: f } }),
      }).catch(console.error)
    }, 1000)
  }

  const newTodayCount = listingData.filter(
    (l) => l.status === "New" && l.daysOnMarket === 0
  ).length

  const filteredListings = useMemo(() => {
    return listingData.filter((listing) => {
      if (filters.locationQuery && !listing.location.toLowerCase().includes(filters.locationQuery.toLowerCase())) return false
      if (filters.minScore > 0 && (listing.airbnbScore ?? 0) < filters.minScore) return false
      if (filters.bedrooms !== "any" && listing.beds < Number(filters.bedrooms)) return false
      if (filters.sqmMin && listing.sqm < Number(filters.sqmMin)) return false
      if (filters.sqmMax && listing.sqm > Number(filters.sqmMax)) return false
      if (filters.priceMin && listing.price < Number(filters.priceMin)) return false
      if (filters.priceMax && listing.price > Number(filters.priceMax)) return false
      if (filters.status !== "All" && listing.status !== filters.status) return false
      return true
    })
  }, [listingData, filters])

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE))
  const paginatedListings = filteredListings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

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

  const cutoffLabel =
    freshMaxHours >= 48
      ? `${Math.round(freshMaxHours / 24)} days`
      : `${freshMaxHours} hours`

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-card px-8 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Fresh Listings
          </h1>
          {newTodayCount > 0 && (
            <Badge className="bg-primary text-primary-foreground text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              New today: {newTodayCount}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          Showing listings from the last{" "}
          <span className="font-semibold text-foreground">{cutoffLabel}</span>
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-5">
          <ListingFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            matchCount={filteredListings.length}
          />

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">Loading listings…</p>
            </div>
          ) : (
            <>
              <ListingTable
                listings={paginatedListings}
                onRowClick={handleRowClick}
                onStatusChange={handleStatusChange}
                selectedId={selectedListing?.id}
              />

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="size-3.5" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages} —{" "}
                    {filteredListings.length} listing{filteredListings.length !== 1 ? "s" : ""}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="gap-1.5"
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              )}
            </>
          )}
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
