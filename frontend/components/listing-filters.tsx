"use client"

import { X, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { LOCATIONS, STATUS_OPTIONS, BEDROOM_OPTIONS, type ListingStatus } from "@/lib/listings-data"
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
import { Checkbox } from "@/components/ui/checkbox"

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

interface ListingFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  matchCount: number
}

export function ListingFilters({ filters, onFiltersChange, matchCount }: ListingFiltersProps) {
  const hasActiveFilters =
    filters.locations.length > 0 ||
    filters.minScore !== 6 ||
    filters.bedrooms !== "any" ||
    filters.sqmMin !== "" ||
    filters.sqmMax !== "" ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    filters.status !== "All"

  const clearFilters = () => {
    onFiltersChange({
      locations: [],
      minScore: 6,
      bedrooms: "any",
      sqmMin: "",
      sqmMax: "",
      priceMin: "",
      priceMax: "",
      status: "All",
    })
  }

  const toggleLocation = (location: string) => {
    const next = filters.locations.includes(location)
      ? filters.locations.filter((l) => l !== location)
      : [...filters.locations, location]
    onFiltersChange({ ...filters, locations: next })
  }

  return (
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
              {LOCATIONS.map((loc) => (
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

        {/* Airbnb Score slider */}
        <div className="flex items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            Min Score
          </span>
          <Slider
            min={0}
            max={10}
            step={0.5}
            value={[filters.minScore]}
            onValueChange={([val]) => onFiltersChange({ ...filters, minScore: val })}
            className="w-24"
          />
          <span className="text-sm font-semibold text-foreground tabular-nums w-8 text-right">
            {filters.minScore.toFixed(1)}
          </span>
        </div>

        {/* Bedrooms */}
        <Select
          value={filters.bedrooms}
          onValueChange={(val) => onFiltersChange({ ...filters, bedrooms: val })}
        >
          <SelectTrigger className="h-9 bg-card">
            <SelectValue placeholder="Bedrooms" />
          </SelectTrigger>
          <SelectContent>
            {BEDROOM_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label === "Any" ? "Bedrooms: Any" : `Bedrooms: ${opt.label}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sqm range */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            placeholder="Min m²"
            value={filters.sqmMin}
            onChange={(e) => onFiltersChange({ ...filters, sqmMin: e.target.value })}
            className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
          />
          <span className="text-muted-foreground text-xs">-</span>
          <input
            type="number"
            placeholder="Max m²"
            value={filters.sqmMax}
            onChange={(e) => onFiltersChange({ ...filters, sqmMax: e.target.value })}
            className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
          />
        </div>

        {/* Price range */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            placeholder="Min €"
            value={filters.priceMin}
            onChange={(e) => onFiltersChange({ ...filters, priceMin: e.target.value })}
            className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
          />
          <span className="text-muted-foreground text-xs">-</span>
          <input
            type="number"
            placeholder="Max €"
            value={filters.priceMax}
            onChange={(e) => onFiltersChange({ ...filters, priceMax: e.target.value })}
            className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-2">
        {["All", ...STATUS_OPTIONS].map((s) => (
          <button
            key={s}
            onClick={() => onFiltersChange({ ...filters, status: s })}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filters.status === s
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {s}
          </button>
        ))}

        <span className="ml-auto text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{matchCount}</span> listing{matchCount !== 1 ? "s" : ""} match
        </span>
      </div>
    </div>
  )
}
