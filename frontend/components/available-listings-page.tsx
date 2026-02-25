"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { X, ChevronDown, MapPin, Calendar, ExternalLink, Ruler, DoorOpen, Building } from "lucide-react"
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
  availableListings,
  AVAILABLE_LOCATIONS,
  SOURCE_OPTIONS,
  ROOM_OPTIONS,
  type AvailableListing,
  type ListingSource,
} from "@/lib/available-listings-data"

/* ───── Filter state ───── */
interface Filters {
  locations: string[]
  priceMin: string
  priceMax: string
  sqmMin: string
  sqmMax: string
  rooms: string
  yearMin: string
  yearMax: string
  sources: ListingSource[]
  maxDaysAvailable: string
}

const defaultFilters: Filters = {
  locations: [],
  priceMin: "",
  priceMax: "",
  sqmMin: "",
  sqmMax: "",
  rooms: "any",
  yearMin: "",
  yearMax: "",
  sources: [],
  maxDaysAvailable: "",
}

/* ───── Helpers ───── */
function sourceLabel(s: ListingSource) {
  return s === "athome" ? "athome.lu" : "immotop.lu"
}

function sourceColor(s: ListingSource) {
  return s === "athome"
    ? "bg-[hsl(210_70%_94%)] text-[hsl(210_70%_38%)]"
    : "bg-[hsl(150_50%_92%)] text-[hsl(150_50%_30%)]"
}

/* ═══════════════════════════════════════════════ */
export function AvailableListingsPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [selectedListing, setSelectedListing] = useState<AvailableListing | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const hasActiveFilters =
    filters.locations.length > 0 ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    filters.sqmMin !== "" ||
    filters.sqmMax !== "" ||
    filters.rooms !== "any" ||
    filters.yearMin !== "" ||
    filters.yearMax !== "" ||
    filters.sources.length > 0 ||
    filters.maxDaysAvailable !== ""

  const filtered = useMemo(() => {
    return availableListings.filter((l) => {
      if (filters.locations.length > 0 && !filters.locations.includes(l.location)) return false
      if (filters.priceMin && l.price < Number(filters.priceMin)) return false
      if (filters.priceMax && l.price > Number(filters.priceMax)) return false
      if (filters.sqmMin && l.sqm < Number(filters.sqmMin)) return false
      if (filters.sqmMax && l.sqm > Number(filters.sqmMax)) return false
      if (filters.rooms !== "any" && l.rooms < Number(filters.rooms)) return false
      if (filters.yearMin && l.buildingYear < Number(filters.yearMin)) return false
      if (filters.yearMax && l.buildingYear > Number(filters.yearMax)) return false
      if (filters.sources.length > 0 && !filters.sources.includes(l.source)) return false
      if (filters.maxDaysAvailable && l.daysAvailable > Number(filters.maxDaysAvailable)) return false
      return true
    })
  }, [filters])

  const toggleLocation = (loc: string) => {
    const next = filters.locations.includes(loc)
      ? filters.locations.filter((l) => l !== loc)
      : [...filters.locations, loc]
    setFilters({ ...filters, locations: next })
  }

  const toggleSource = (src: ListingSource) => {
    const next = filters.sources.includes(src)
      ? filters.sources.filter((s) => s !== src)
      : [...filters.sources, src]
    setFilters({ ...filters, sources: next })
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
            {availableListings.length} total
          </Badge>
        </div>
      </header>

      {/* Filters + Table */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-5">
          {/* ── Filter bar ── */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Location multiselect */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                    <span>
                      {filters.locations.length === 0
                        ? "All locations"
                        : `${filters.locations.length} location${filters.locations.length > 1 ? "s" : ""}`}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="flex flex-col gap-1">
                    {AVAILABLE_LOCATIONS.map((loc) => (
                      <label
                        key={loc}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-secondary cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={filters.locations.includes(loc)}
                          onCheckedChange={() => toggleLocation(loc)}
                          className="size-3.5"
                        />
                        {loc}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Rooms */}
              <Select
                value={filters.rooms}
                onValueChange={(val) => setFilters({ ...filters, rooms: val })}
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
                  onChange={(e) => setFilters({ ...filters, sqmMin: e.target.value })}
                  className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max m²"
                  value={filters.sqmMax}
                  onChange={(e) => setFilters({ ...filters, sqmMax: e.target.value })}
                  className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
              </div>

              {/* Price range */}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min €"
                  value={filters.priceMin}
                  onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                  className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max €"
                  value={filters.priceMax}
                  onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                  className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
              </div>

              {/* Building year range */}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Year from"
                  value={filters.yearMin}
                  onChange={(e) => setFilters({ ...filters, yearMin: e.target.value })}
                  className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <input
                  type="number"
                  placeholder="Year to"
                  value={filters.yearMax}
                  onChange={(e) => setFilters({ ...filters, yearMax: e.target.value })}
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

              {/* Availability duration */}
              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {"Max days"}
                </span>
                <input
                  type="number"
                  placeholder="any"
                  value={filters.maxDaysAvailable}
                  onChange={(e) => setFilters({ ...filters, maxDaysAvailable: e.target.value })}
                  className="h-5 w-16 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none tabular-nums"
                />
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={() => setFilters(defaultFilters)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                  Clear filters
                </button>
              )}
            </div>

            <div className="flex items-center">
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
                listing{filtered.length !== 1 ? "s" : ""} match
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
                    <th className="text-center font-medium text-muted-foreground px-4 py-3">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((listing) => (
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
                          <Image src={listing.photo} alt={listing.title} width={40} height={40} className="size-10 object-cover" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{listing.title}</span>
                          <span className="text-xs text-muted-foreground">{listing.address}, {listing.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground tabular-nums">
                        {"€"}{listing.price.toLocaleString("de-DE")}
                      </td>
                      <td className="px-4 py-3 text-center text-foreground tabular-nums">{listing.rooms}</td>
                      <td className="px-4 py-3 text-center text-foreground tabular-nums">{listing.sqm}</td>
                      <td className="px-4 py-3 text-center text-foreground tabular-nums">{listing.buildingYear}</td>
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
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm font-medium">No listings match your filters</p>
                <p className="text-xs mt-1">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Drawer ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{selectedListing?.title}</SheetTitle>
            <SheetDescription>Property details for {selectedListing?.title}</SheetDescription>
          </SheetHeader>
          {selectedListing && (
            <>
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="flex flex-col">
                  {/* Hero */}
                  <div className="relative aspect-[16/10] w-full bg-muted">
                    <Image
                      src={selectedListing.photo.replace("w=400&h=300", "w=800&h=500")}
                      alt={selectedListing.title}
                      fill
                      className="object-cover"
                    />
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
                        {selectedListing.title}
                      </h2>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {selectedListing.address}, {selectedListing.location}
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
                          <span className="text-base font-semibold text-foreground tabular-nums">{selectedListing.rooms}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Rooms</span>
                      </div>
                      <div className="flex flex-col items-center rounded-lg bg-secondary/70 p-3">
                        <div className="flex items-center gap-1">
                          <Ruler className="size-3.5 text-foreground" />
                          <span className="text-base font-semibold text-foreground tabular-nums">{selectedListing.sqm}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">{"m²"}</span>
                      </div>
                      <div className="flex flex-col items-center rounded-lg bg-secondary/70 p-3">
                        <div className="flex items-center gap-1">
                          <Building className="size-3.5 text-foreground" />
                          <span className="text-base font-semibold text-foreground tabular-nums">{selectedListing.buildingYear}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Built</span>
                      </div>
                    </div>

                    {/* Availability */}
                    <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        Available for <span className="font-semibold">{selectedListing.daysAvailable} days</span>
                      </span>
                    </div>

                    {/* Description */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedListing.description}</p>
                    </div>

                    {/* Features */}
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
                  </div>
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="flex items-center gap-3 border-t border-border p-4 bg-card">
                <Button variant="outline" className="flex-1 gap-2" asChild>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                    View on {sourceLabel(selectedListing.source)}
                  </a>
                </Button>
                <Button className="flex-1" onClick={() => setDrawerOpen(false)}>
                  Add to shortlist
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
