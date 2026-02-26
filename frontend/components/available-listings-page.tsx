"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { X, Search, MapPin, Calendar, ExternalLink, Ruler, DoorOpen, Building, ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  SOURCE_OPTIONS,
  ROOM_OPTIONS,
  type AvailableListing,
  type ListingSource,
} from "@/lib/available-listings-data"
import { PAGE_SIZE, AVAILABLE_LISTINGS_MIN_HOURS } from "@/lib/config"

/* ───── Filter state ───── */
interface Filters {
  locationQuery: string
  priceMin: string
  priceMax: string
  sqmMin: string
  sqmMax: string
  rooms: string
  yearMin: string
  yearMax: string
  sources: ListingSource[]
  maxDays: string
}

const defaultFilters: Filters = {
  locationQuery: "",
  priceMin: "",
  priceMax: "",
  sqmMin: "",
  sqmMax: "",
  rooms: "any",
  yearMin: "",
  yearMax: "",
  sources: [],
  maxDays: "",
}

/* ───── Helpers ───── */
function sourceLabel(s: string) {
  if (s === "athome") return "athome.lu"
  if (s === "immotop") return "immotop.lu"
  return s
}

function sourceColor(s: string) {
  if (s === "athome") return "bg-[hsl(210_70%_94%)] text-[hsl(210_70%_38%)]"
  if (s === "immotop") return "bg-[hsl(150_50%_92%)] text-[hsl(150_50%_30%)]"
  return "bg-muted text-muted-foreground"
}

function buildUrl(filters: Filters, page: number, minHours: number) {
  const params = new URLSearchParams()
  params.set("limit", String(PAGE_SIZE))
  params.set("offset", String(page * PAGE_SIZE))
  params.set("min_hours", String(minHours))
  if (filters.locationQuery) params.set("location", filters.locationQuery)
  if (filters.priceMin) params.set("min_price", filters.priceMin)
  if (filters.priceMax) params.set("max_price", filters.priceMax)
  if (filters.sqmMin) params.set("min_sqm", filters.sqmMin)
  if (filters.sqmMax) params.set("max_sqm", filters.sqmMax)
  if (filters.rooms !== "any") params.set("min_rooms", filters.rooms)
  if (filters.yearMin) params.set("min_year", filters.yearMin)
  if (filters.yearMax) params.set("max_year", filters.yearMax)
  if (filters.sources.length === 1) params.set("source", filters.sources[0])
  if (filters.maxDays) params.set("max_days", filters.maxDays)
  return `/api/listings?${params.toString()}`
}

/* ═══════════════════════════════════════════════ */
export function AvailableListingsPage() {
  const [listings, setListings] = useState<AvailableListing[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const saveFiltersRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [page, setPage] = useState(0)
  const [selectedListing, setSelectedListing] = useState<AvailableListing | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [availableMinHours, setAvailableMinHours] = useState(AVAILABLE_LISTINGS_MIN_HOURS)
  const [botting, setBotting] = useState(false)
  const [botted, setBotted] = useState(false)
  const [whitelisted, setWhitelisted] = useState(false)

  // Reset bot action state when a different listing is selected
  useEffect(() => {
    setBotted(false)
    setBotting(false)
    setWhitelisted(false)
  }, [selectedListing?.id])

  async function handleSendToBot() {
    if (!selectedListing) return
    setBotting(true)
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: selectedListing.address,
          location: selectedListing.location,
          price: selectedListing.price,
          rooms: selectedListing.rooms,
          listing_url: selectedListing.listing_url ?? null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error("[AvailableListings] outreach failed:", body)
        return
      }
      const listingId = selectedListing.listing_ref ?? selectedListing.id
      await fetch(`/api/pipeline/${encodeURIComponent(listingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewing" }),
      })
      setBotted(true)
    } catch (err) {
      console.error("[AvailableListings] send to bot:", err)
    } finally {
      setBotting(false)
    }
  }

  async function handleWhitelist() {
    if (!selectedListing) return
    setBotting(true)
    try {
      const listingId = selectedListing.listing_ref ?? selectedListing.id
      await fetch(`/api/pipeline/${encodeURIComponent(listingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewing" }),
      })
      setWhitelisted(true)
    } catch (err) {
      console.error("[AvailableListings] whitelist:", err)
    } finally {
      setBotting(false)
    }
  }

  // Read user's preferred cutoff + saved filters from DB
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences?.fresh_max_hours) {
          setAvailableMinHours(Number(data.preferences.fresh_max_hours))
        }
        if (data.preferences?.available_filters) {
          setFilters({ ...defaultFilters, ...data.preferences.available_filters })
        }
      })
      .catch(console.error)
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchListings = useCallback(
    (f: Filters, p: number, minHours: number) => {
      setLoading(true)
      fetch(buildUrl(f, p, minHours))
        .then((r) => r.json())
        .then((data) => {
          setListings(data.listings ?? [])
          setTotal(data.total ?? 0)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    },
    []
  )

  // Initial load + re-fetch on filter, page, or cutoff change
  useEffect(() => {
    fetchListings(filters, page, availableMinHours)
  }, [filters, page, availableMinHours, fetchListings])

  const updateFilters = (next: Filters) => {
    setPage(0)
    setFilters(next)
    clearTimeout(saveFiltersRef.current)
    saveFiltersRef.current = setTimeout(() => {
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { available_filters: next } }),
      }).catch(console.error)
    }, 1000)
  }

  const hasActiveFilters =
    filters.locationQuery !== "" ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    filters.sqmMin !== "" ||
    filters.sqmMax !== "" ||
    filters.rooms !== "any" ||
    filters.yearMin !== "" ||
    filters.yearMax !== "" ||
    filters.sources.length > 0 ||
    filters.maxDays !== ""

  const toggleSource = (src: ListingSource) => {
    const next = filters.sources.includes(src)
      ? filters.sources.filter((s) => s !== src)
      : [...filters.sources, src]
    updateFilters({ ...filters, sources: next })
  }

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-8 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Available Listings
          </h1>
          <Badge variant="outline" className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            {total.toLocaleString()} total
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          Listings older than{" "}
          <span className="font-semibold text-foreground">
            {availableMinHours >= 48 ? `${Math.round(availableMinHours / 24)} days` : `${availableMinHours} hours`}
          </span>
        </span>
      </header>

      {/* Filters + Table */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-5">
          {/* ── Filter bar ── */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Location text search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Location in Luxembourg…"
                  value={filters.locationQuery}
                  onChange={(e) => updateFilters({ ...filters, locationQuery: e.target.value })}
                  className="h-9 w-52 rounded-md border border-border bg-card pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
              </div>

              {/* Rooms */}
              <Select
                value={filters.rooms}
                onValueChange={(val) => updateFilters({ ...filters, rooms: val })}
              >
                <SelectTrigger className="h-9 bg-card">
                  <SelectValue placeholder="Rooms" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label === "Any" ? "Rooms: Any" : `Rooms: ${opt.label}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Size range */}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min m²"
                  value={filters.sqmMin}
                  onChange={(e) => updateFilters({ ...filters, sqmMin: e.target.value })}
                  className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max m²"
                  value={filters.sqmMax}
                  onChange={(e) => updateFilters({ ...filters, sqmMax: e.target.value })}
                  className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
              </div>

              {/* Price range */}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min €"
                  value={filters.priceMin}
                  onChange={(e) => updateFilters({ ...filters, priceMin: e.target.value })}
                  className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max €"
                  value={filters.priceMax}
                  onChange={(e) => updateFilters({ ...filters, priceMax: e.target.value })}
                  className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
              </div>

              {/* Building year range */}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Year from"
                  value={filters.yearMin}
                  onChange={(e) => updateFilters({ ...filters, yearMin: e.target.value })}
                  className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <input
                  type="number"
                  placeholder="Year to"
                  value={filters.yearMax}
                  onChange={(e) => updateFilters({ ...filters, yearMax: e.target.value })}
                  className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
              </div>

              {/* Source multiselect */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                    <span>
                      {filters.sources.length === 0
                        ? "All sources"
                        : filters.sources.map(sourceLabel).join(", ")}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="flex flex-col gap-1">
                    {SOURCE_OPTIONS.map((src) => (
                      <label
                        key={src.value}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-secondary cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={filters.sources.includes(src.value)}
                          onCheckedChange={() => toggleSource(src.value)}
                          className="size-3.5"
                        />
                        {src.label}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Max days on market */}
              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  Max days
                </span>
                <input
                  type="number"
                  placeholder="any"
                  value={filters.maxDays}
                  onChange={(e) => updateFilters({ ...filters, maxDays: e.target.value })}
                  className="h-5 w-16 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none tabular-nums"
                />
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={() => updateFilters(defaultFilters)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                  Clear filters
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {loading ? (
                  "Loading…"
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{total.toLocaleString()}</span>{" "}
                    listing{total !== 1 ? "s" : ""}
                    {totalPages > 1 && (
                      <> — page <span className="font-semibold text-foreground">{page + 1}</span> of {totalPages}</>
                    )}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 w-10" />
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Property</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Price</th>
                    <th className="text-center font-medium text-muted-foreground px-4 py-3">Rooms</th>
                    <th className="text-center font-medium text-muted-foreground px-4 py-3">{"m²"}</th>
                    <th className="text-center font-medium text-muted-foreground px-4 py-3">Year</th>
                    <th className="text-center font-medium text-muted-foreground px-4 py-3">Source</th>
                    <th className="text-center font-medium text-muted-foreground px-4 py-3">Days listed</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && listings.map((listing) => (
                    <tr
                      key={listing.id}
                      onClick={() => { setSelectedListing(listing); setDrawerOpen(true) }}
                      className={cn(
                        "border-b border-border last:border-b-0 cursor-pointer transition-colors",
                        selectedListing?.id === listing.id ? "bg-primary/8" : "hover:bg-secondary/50"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="size-10 rounded-md overflow-hidden bg-muted shrink-0">
                          {listing.photo ? (
                            <Image
                              src={listing.photo}
                              alt={listing.title}
                              width={40}
                              height={40}
                              className="size-10 object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="size-10 bg-muted" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{listing.title || listing.address}</span>
                          <span className="text-xs text-muted-foreground">{listing.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground tabular-nums">
                        {"€"}{listing.price.toLocaleString("de-DE")}
                      </td>
                      <td className="px-4 py-3 text-center text-foreground tabular-nums">{listing.rooms || "—"}</td>
                      <td className="px-4 py-3 text-center text-foreground tabular-nums">{listing.sqm || "—"}</td>
                      <td className="px-4 py-3 text-center text-foreground tabular-nums">{listing.buildingYear ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", sourceColor(listing.source))}>
                          {sourceLabel(listing.source)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                        {listing.daysAvailable}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm">Loading listings…</p>
              </div>
            )}
            {!loading && listings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm font-medium">No listings match your filters</p>
                <p className="text-xs mt-1">Try adjusting your search criteria</p>
              </div>
            )}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="gap-1.5"
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="gap-1.5"
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Drawer ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{selectedListing?.title || selectedListing?.address}</SheetTitle>
            <SheetDescription>Property details</SheetDescription>
          </SheetHeader>
          {selectedListing && (
            <>
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="flex flex-col">
                  {/* Hero */}
                  <div className="relative aspect-[16/10] w-full bg-muted">
                    {selectedListing.photo ? (
                      <Image
                        src={selectedListing.photo}
                        alt={selectedListing.title || selectedListing.address}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                        No photo
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-5 p-6">
                    {/* Title + badges */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold", sourceColor(selectedListing.source))}>
                          {sourceLabel(selectedListing.source)}
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-foreground text-balance">
                        {selectedListing.title || selectedListing.address}
                      </h2>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {selectedListing.location}
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="flex flex-col items-center rounded-lg bg-secondary/70 p-3">
                        <span className="text-base font-semibold text-foreground tabular-nums">
                          {"€"}{selectedListing.price.toLocaleString("de-DE")}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Price</span>
                      </div>
                      <div className="flex flex-col items-center rounded-lg bg-secondary/70 p-3">
                        <div className="flex items-center gap-1">
                          <DoorOpen className="size-4 text-foreground" />
                          <span className="text-base font-semibold text-foreground tabular-nums">{selectedListing.rooms || "—"}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Rooms</span>
                      </div>
                      <div className="flex flex-col items-center rounded-lg bg-secondary/70 p-3">
                        <div className="flex items-center gap-1">
                          <Ruler className="size-3.5 text-foreground" />
                          <span className="text-base font-semibold text-foreground tabular-nums">{selectedListing.sqm || "—"}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">{"m²"}</span>
                      </div>
                      <div className="flex flex-col items-center rounded-lg bg-secondary/70 p-3">
                        <div className="flex items-center gap-1">
                          <Building className="size-3.5 text-foreground" />
                          <span className="text-base font-semibold text-foreground tabular-nums">{selectedListing.buildingYear ?? "—"}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Built</span>
                      </div>
                    </div>

                    {/* Availability */}
                    <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        Listed for <span className="font-semibold">{selectedListing.daysAvailable} days</span>
                      </span>
                    </div>

                    {/* Description */}
                    {selectedListing.description && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{selectedListing.description}</p>
                      </div>
                    )}

                    {/* Features */}
                    {selectedListing.features.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Features</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedListing.features.map((f) => (
                            <span key={f} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="flex items-center gap-3 border-t border-border p-4 bg-card">
                {botted || whitelisted ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 flex-1">
                      <Check className="size-4 shrink-0" />
                      {botted ? "Queued for outreach — check CRM" : "Added to whitelist"}
                    </div>
                    <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                      Close
                    </Button>
                  </>
                ) : (
                  <>
                    {selectedListing.listing_url && (
                      <Button variant="outline" size="sm" className="gap-1.5 shrink-0" asChild>
                        <a href={selectedListing.listing_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" />
                          View
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={handleWhitelist}
                      disabled={botting}
                    >
                      Whitelist
                    </Button>
                    <Button
                      className="flex-1 gap-1.5"
                      onClick={handleSendToBot}
                      disabled={botting}
                    >
                      {botting ? "Queuing…" : "Send to bot"}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
